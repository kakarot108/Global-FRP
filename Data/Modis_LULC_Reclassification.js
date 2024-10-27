// Define a function to reclassify MODIS land cover data with integers
function reclassifyLULC(img) {
  var fromClasses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  var toClasses = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
  return img.remap(fromClasses, toClasses).rename('Reclassified_LULC');
}

// Define a function to get reclassified and original LULC for a specific year
function getLULCImages(year) {
  var dataset = ee.ImageCollection('MODIS/061/MCD12Q1')
                  .filter(ee.Filter.calendarRange(year, year, 'year'))
                  .first();
  var originalLULC = dataset.select('LC_Type1');  // Original LULC image
  var reclassifiedLULC = reclassifyLULC(originalLULC);  // Reclassified LULC image
  return {original: originalLULC, reclassified: reclassifiedLULC};
}

// Use LULC for 2003 as a test case
var lulcYear = 2003;
var lulcImages = getLULCImages(lulcYear);

// Print metadata to the console for reference
print("Original LULC metadata:", lulcImages.original);
print("Reclassified LULC metadata:", lulcImages.reclassified);

// Display the original and reclassified LULC images on the map
Map.centerObject(lulcImages.original, 6);  // Centering the map around the LULC data

// Add the original LULC image layer with a diverse palette for all classes
Map.addLayer(lulcImages.original, {min: 1, max: 17, palette: [
  '1a9850', '91cf60', 'd9ef8b', 'fee08b', 'fc8d59', 'd73027',
  '4575b4', '313695', 'fee090', '99d594', '2c7bb6', 'abd9e9',
  'fdae61', 'f46d43', '3288bd', '5e4fa2', '66c2a5']}, 'Original LULC for 2003');

// Add the reclassified LULC image layer with a simpler palette (green for 1 and red for 0)
Map.addLayer(lulcImages.reclassified, {min: 0, max: 1, palette: ['red', 'green']}, 'Reclassified LULC for 2003');
