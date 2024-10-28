
library(raster)
library(rgdal)

# Set the path where your TIFF files are stored
folder_path <- "/Users/ceedindia/Documents/FIRE/LULC"  # Update this with the actual path

# Get a list of all TIFF files in the folder
file_paths <- list.files(folder_path, pattern = "\\.tif$", full.names = TRUE)

# Create a list to store file paths for each year
file_paths_by_year <- list()

# Populate file_paths_by_year by grouping files by year
for (filepath in file_paths) {
  filename <- basename(filepath)
  
  # Extract the year from the filename using a regular expression
  match <- regexpr("Reclass_(\\d{4})", filename)
  year <- regmatches(filename, match)[1]
  
  if (length(year) == 0) {
    cat("Year not found in filename", filename, "\n")
    next
  }
  
  # Add file to the corresponding year group
  if (!year %in% names(file_paths_by_year)) {
    file_paths_by_year[[year]] <- list()
  }
  file_paths_by_year[[year]] <- c(file_paths_by_year[[year]], filepath)
  cat("Added", filename, "to year", year, "\n")
}

# Output folder to save the mosaics
output_folder <- "/Users/ceedindia/Documents/FIRE/Data"  # Update this with the actual path
if (!dir.exists(output_folder)) dir.create(output_folder)

# Mosaic files for each year
for (year in names(file_paths_by_year)) {
  cat("\nProcessing year:", year, "\n")
  
  # Load all the rasters for the current year
  rasters <- lapply(file_paths_by_year[[year]], raster)
  
  # Mosaic the files with mean function for overlapping cells
  mosaic_raster <- do.call(mosaic, c(rasters, fun = mean))
  
  # Define output file path for the year
  output_path <- file.path(output_folder, paste0("LULC_MODIS_Mosaic_Reclass_", year, ".tif"))
  
  # Save the mosaic to a new file
  cat("Saving mosaic for year", year, "to", output_path, "\n")
  writeRaster(mosaic_raster, filename = output_path, format = "GTiff", overwrite = TRUE)
  
  cat("Mosaic for", year, "saved successfully as", output_path, "\n")
}

cat("All mosaics created successfully.\n")



