// Define a geometry for the export region if not already defined
var geometry = geometry/* insert your geometry here */;

// Define a function to reclassify MODIS land cover data with integers
function reclassifyLULC(img) {
  var fromClasses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  var toClasses = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
  return img.remap(fromClasses, toClasses).rename('Reclassified_LULC');
}

// Define a function to get reclassified LULC for a specific year
function getReclassifiedLULC(year) {
  var dataset = ee.ImageCollection('MODIS/061/MCD12Q1')
                  .filter(ee.Filter.calendarRange(year, year, 'year'))
                  .first();
  var lulc = dataset.select('LC_Type1');  // Original LULC image
  return reclassifyLULC(lulc);  // Reclassified LULC image
}

// Loop through each year from 2003 to 2022
for (var year = 2004; year <= 2022; year++) {
  var lulcReclassified = getReclassifiedLULC(year);

  // Export the reclassified LULC image to Google Drive
  Export.image.toDrive({
    image: lulcReclassified,
    description: 'LULC_MODIS_Reclass_' + year,
    scale: 500,
    region: geometry,
    folder: 'Global_LULC',
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: true
    },
    maxPixels: 1e13
  });
  
  // Optionally, add each year's reclassified LULC image to the map for visual verification
  Map.addLayer(lulcReclassified, {min: 0, max: 1, palette: ['red', 'green']}, 'Reclassified LULC ' + year);
}

Map.centerObject(geometry, 6);  // Center the map over your region of interest
