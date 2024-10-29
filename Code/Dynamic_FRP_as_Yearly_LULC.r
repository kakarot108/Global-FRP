library(raster)
library(rgdal)

# Base path for LULC files
base_path <- "/Users/ceedindia/Documents/FIRE/Data_CRS/"

# Create a named vector with file paths for each year
years <- 2003:2023
lulc_file_paths <- setNames(
  sapply(years, function(year) {
    if (year < 2023) {
      paste0(base_path, "LULC_MODIS_Mosaic_Reclass_", year, ".tif")
    } else {
      paste0(base_path, "LULC_MODIS_Mosaic_Reclass_2022.tif")
    }
  }), years
)

# Load the FRP shapefile
FRP <- shapefile("//Users/ceedindia/Documents/FIRE/modis_global_frp_data.shp")

# Initialize final FRP output
final_FRP <- NULL

# Loop through each year to process the LULC and extract corresponding values
for (year in years) {
  # Load the LULC raster for the year using pre-defined file paths
  Kndvi_classified_raster <- raster(lulc_file_paths[as.character(year)])
  
  # Filter FRP data for the specific year
  year_FRP <- FRP[FRP$year == year, ]
  
  # Extract LULC values for the FRP points in this year
  tau_extract <- extract(Kndvi_classified_raster, year_FRP, df = TRUE, method = 'simple')
  
  # Dynamically access the correct column based on the year
  column_name <- paste0("LULC_MODIS_Mosaic_Reclass_", year)
  year_FRP$LULC_Class <- tau_extract[[column_name]]
  
  # Remove NAs before filtering for LULC class 1
  year_FRP <- year_FRP[!is.na(year_FRP$LULC_Class) & year_FRP$LULC_Class == 1, ]
  
  # Append to the final FRP dataset
  if (is.null(final_FRP)) {
    final_FRP <- year_FRP
  } else {
    final_FRP <- rbind(final_FRP, year_FRP)
  }
}

# Save the final shapefile with FRP points over LULC class 1 for each year
writeOGR(final_FRP, "/Users/ceedindia/Documents/FIRE/FRP_filtered_LULC.shp", 
         layer = "FRP_filtered_LULC", driver = "ESRI Shapefile")


unique(final_FRP$daynight)
