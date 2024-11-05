var mod13 = ee.ImageCollection('MODIS/006/MOD13A1');
var coll = mod13.select('EVI')
    .filter(ee.Filter.calendarRange(8, 9, 'month'));
Map.setCenter(-121.6, 37.3, 10);
Map.addLayer(coll, {min: -500, max: 5000, palette: ['white', 'green']}, 'coll');

var afterFilter = ee.Filter.lessThan({
  leftField: 'system:time_start',
  rightField: 'system:time_start'
});

var joined = ee.ImageCollection(ee.Join.saveAll('after').apply({
  primary: coll,
  secondary: coll,
  condition: afterFilter
}));

var sign = function(i, j) { // i and j are images
  return ee.Image(j).neq(i) // Zero case
      .multiply(ee.Image(j).subtract(i).clamp(-1, 1)).int();
};

var kendall = ee.ImageCollection(joined.map(function(current) {
  var afterCollection = ee.ImageCollection.fromImages(current.get('after'));
  return afterCollection.map(function(image) {
    // The unmask is to prevent accumulation of masked pixels that
    // result from the undefined case of when either current or image
    // is masked.  It won't affect the sum, since it's unmasked to zero.
    return ee.Image(sign(current, image)).unmask(0);
  });
  // Set parallelScale to avoid User memory limit exceeded.
}).flatten()).reduce('sum', 2);

var palette = ['red', 'white', 'green'];
// Set min and max stretch visualization parameters as necessary.
Map.addLayer(kendall, {palette: palette, min: -2800, max: 2800}, 'kendall');




var slope = function(i, j) { // i and j are images
  return ee.Image(j).subtract(i)
      .divide(ee.Image(j).date().difference(ee.Image(i).date(), 'days'))
      .rename('slope')
      .float();
};

var slopes = ee.ImageCollection(joined.map(function(current) {
  var afterCollection = ee.ImageCollection.fromImages(current.get('after'));
  return afterCollection.map(function(image) {
      return ee.Image(slope(current, image));
  });
}).flatten());

var sensSlope = slopes.reduce(ee.Reducer.median(), 2); // Set parallelScale.
Map.addLayer(sensSlope, {palette: palette, min: -1, max: 1}, 'sensSlope');



var epochDate = ee.Date('1970-01-01');
var sensIntercept = coll.map(function(image) {
  var epochDays = image.date().difference(epochDate, 'days').float();
  return image.subtract(sensSlope.multiply(epochDays)).float();
}).reduce(ee.Reducer.median(), 2);
Map.addLayer(sensIntercept, {min: -6600, max: 20600}, 'sensIntercept');



// Values that are in a group (ties).  Set all else to zero.
var groups = coll.map(function(i) {
  var matches = coll.map(function(j) {
    return i.eq(j); // i and j are images.
  }).sum();
  return i.multiply(matches.gt(1));
});

// Compute tie group sizes in a sequence.  The first group is discarded.
var group = function(array) {
  var length = array.arrayLength(0);
  // Array of indices.  These are 1-indexed.
  var indices = ee.Image([1])
      .arrayRepeat(0, length)
      .arrayAccum(0, ee.Reducer.sum())
      .toArray(1);
  var sorted = array.arraySort();
  var left = sorted.arraySlice(0, 1);
  var right = sorted.arraySlice(0, 0, -1);
  // Indices of the end of runs.
  var mask = left.neq(right)
  // Always keep the last index, the end of the sequence.
      .arrayCat(ee.Image(ee.Array([[1]])), 0);
  var runIndices = indices.arrayMask(mask);
  // Subtract the indices to get run lengths.
  var groupSizes = runIndices.arraySlice(0, 1)
      .subtract(runIndices.arraySlice(0, 0, -1));
  return groupSizes;
};

// See equation 2.6 in Sen (1968).
var factors = function(image) {
  return image.expression('b() * (b() - 1) * (b() * 2 + 5)');
};

var groupSizes = group(groups.toArray());
var groupFactors = factors(groupSizes);
var groupFactorSum = groupFactors.arrayReduce('sum', [0])
      .arrayGet([0, 0]);

var count = joined.count();

var kendallVariance = factors(count)
    .subtract(groupFactorSum)
    .divide(18)
    .float();
Map.addLayer(kendallVariance, {min: 1700, max: 85000}, 'kendallVariance');



// Compute Z-statistics.
var zero = kendall.multiply(kendall.eq(0));
var pos = kendall.multiply(kendall.gt(0)).subtract(1);
var neg = kendall.multiply(kendall.lt(0)).add(1);

var z = zero
    .add(pos.divide(kendallVariance.sqrt()))
    .add(neg.divide(kendallVariance.sqrt()));
Map.addLayer(z, {min: -2, max: 2}, 'z');

// https://en.wikipedia.org/wiki/Error_function#Cumulative_distribution_function
function eeCdf(z) {
  return ee.Image(0.5)
      .multiply(ee.Image(1).add(ee.Image(z).divide(ee.Image(2).sqrt()).erf()));
}

function invCdf(p) {
  return ee.Image(2).sqrt()
      .multiply(ee.Image(p).multiply(2).subtract(1).erfInv());
}

// Compute P-values.
var p = ee.Image(1).subtract(eeCdf(z.abs()));
Map.addLayer(p, {min: 0, max: 1}, 'p');

// Pixels that can have the null hypothesis (there is no trend) rejected.
// Specifically, if the true trend is zero, there would be less than 5%
// chance of randomly obtaining the observed result (that there is a trend).
Map.addLayer(p.lte(0.025), {min: 0, max: 1}, 'significant trends');

