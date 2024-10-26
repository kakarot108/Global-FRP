var table = ee.FeatureCollection('projects/glass-proxy-430316-n2/assets/world-continents')

// Define the time range
var year_start = 2001; // MODIS NDVI 2000-02-18T00:00:00 - Present
var year_end = 2023; 
var date_start = ee.Date.fromYMD(year_start, 1, 1);
var date_end = ee.Date.fromYMD(year_end, 12, 31);

// Load MODIS NDVI (MOD13A2) data
var ndvi = ee.ImageCollection('MODIS/061/MOD13Q1')
    .filterDate(date_start, date_end)
    .select('NDVI')
    // Apply scaling factor of 0.0001 to the NDVI values
    .map(function(image) {
      return image.multiply(0.0001).copyProperties(image, ['system:time_start']);
    });

// Function to calculate yearly mean NDVI
var yearlyNDVI = ee.ImageCollection.fromImages(
  ee.List.sequence(year_start, year_end).map(function(year) { 
    var start = ee.Date.fromYMD(year, 1, 1);
    var end = ee.Date.fromYMD(year, 12, 31);
    var yearNDVI = ndvi.filterDate(start, end).mean().set('year', year);
    return yearNDVI;
  })
);

// Print the yearly NDVI collection
print(yearlyNDVI, 'Yearly Mean NDVI');

// Apply the Mann-Kendall trend test on the yearly mean NDVI
var ndviTrend = yearlyNDVI.reduce(ee.Reducer.kendallsCorrelation());
print(ndviTrend, "ndviTrend");

// Visualization parameters for the trend
var corrParams = {min: -1, max: 1, palette: ['red', 'white', 'green']};

// Add the trend layer to the map
Map.addLayer(ndviTrend.select('NDVI_p-value'), corrParams, 'Mann-Kendall Trend');

// Load your shapefile of continents (assumed to be uploaded as 'users/your_username/continent_shapefile')
var continents = table//ee.FeatureCollection('users/your_username/continent_shapefile');

// Iterate over each continent and export NDVI p-values for each one
var continentNames = ['Africa', 'Asia', 'Australia', 'Europe', 'North America', 'Oceania', 'South America'];

continentNames.forEach(function(continent) {
  var continentGeometry = continents.filter(ee.Filter.eq('CONTINENT', continent));  // Use appropriate property for the name

  // Clip NDVI trend to the continent
  var ndviTrendClipped = ndviTrend.select('NDVI_p-value').clip(continentGeometry);

  // // Export to Google Drive
  // Export.image.toDrive({
  //   image: ndviTrendClipped.toFloat(),
  //   description: 'NDVI_TAU_' + continent,
  //   scale: 250,
  //   maxPixels: 1e13,
  //   region: continentGeometry.geometry(),
  //   crs: 'EPSG:4326',
  //   folder: 'MODIS_NDVI_TREND',
  //   fileFormat: 'GeoTIFF',
  //   formatOptions: {
  //     cloudOptimized: true
  //   }
  // });
  
  // Add layer to the map for visualization (optional)
  Map.addLayer(ndviTrendClipped, corrParams, continent + ' NDVI Trend');
});

// Center the map on the first continent (optional)
Map.centerObject(continents.first(), 3);
