# Load necessary library
library(terra)

# Define input and output directories
input_dir <- "/Users/ceedindia/Documents/FIRE/Data"
output_dir <- "/Users/ceedindia/Documents/FIRE/Proj2"

# Create output directory if it doesn't exist
if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE)
}

# Get a list of all TIFF files in the input directory
tif_files <- list.files(input_dir, pattern = "\\.tif$", full.names = TRUE)

# Loop through each file and reproject
for (file_path in tif_files) {
  # Read the raster file
  raster <- rast(file_path)
  
  # Reproject to EPSG:4326 (WGS 84)
  reprojected_raster <- project(raster, "EPSG:4326")
  
  # Define output file path
  output_file_path <- file.path(output_dir, paste0(tools::file_path_sans_ext(basename(file_path)), "_reprojected.tif"))
  
  # Save the reprojected raster
  writeRaster(reprojected_raster, output_file_path, overwrite = TRUE)
  
  cat("Reprojected and saved", output_file_path, "\n")
}
