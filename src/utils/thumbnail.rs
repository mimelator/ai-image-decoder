use image::{GenericImageView, ImageFormat};
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::{Result, Context};
use log::info;

/// Generate a thumbnail for an image
/// 
/// # Arguments
/// * `image_path` - Path to the source image file
/// * `thumbnail_path` - Path where thumbnail should be saved
/// * `max_size` - Maximum width/height for thumbnail (maintains aspect ratio)
/// * `quality` - JPEG quality (1-100), only used for JPEG output
pub fn generate_thumbnail(
    image_path: &Path,
    thumbnail_path: &Path,
    max_size: u32,
    _quality: u8,
) -> Result<()> {
    // Ensure thumbnail directory exists
    if let Some(parent) = thumbnail_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create thumbnail directory: {}", parent.display()))?;
    }

    // Load the source image
    let img = image::open(image_path)
        .with_context(|| format!("Failed to open image: {}", image_path.display()))?;

    // Calculate thumbnail dimensions (maintain aspect ratio)
    let (width, height) = img.dimensions();
    let (thumb_width, thumb_height) = calculate_thumbnail_size(width, height, max_size);

    // Resize image
    let thumbnail = img.thumbnail_exact(thumb_width, thumb_height);

    // Determine output format from thumbnail path extension
    let format = match thumbnail_path.extension().and_then(|s| s.to_str()) {
        Some("jpg") | Some("jpeg") => ImageFormat::Jpeg,
        Some("png") => ImageFormat::Png,
        Some("webp") => ImageFormat::WebP,
        _ => {
            // Default to JPEG for thumbnails
            ImageFormat::Jpeg
        }
    };

    // Save thumbnail
    match format {
        ImageFormat::Jpeg => {
            thumbnail.save_with_format(thumbnail_path, ImageFormat::Jpeg)?;
        }
        ImageFormat::Png => {
            thumbnail.save_with_format(thumbnail_path, ImageFormat::Png)?;
        }
        ImageFormat::WebP => {
            thumbnail.save_with_format(thumbnail_path, ImageFormat::WebP)?;
        }
        _ => {
            thumbnail.save_with_format(thumbnail_path, ImageFormat::Jpeg)?;
        }
    }

    info!(
        "Generated thumbnail: {} ({}x{}) -> {} ({}x{})",
        image_path.display(),
        width,
        height,
        thumbnail_path.display(),
        thumb_width,
        thumb_height
    );

    Ok(())
}

/// Calculate thumbnail dimensions maintaining aspect ratio
fn calculate_thumbnail_size(width: u32, height: u32, max_size: u32) -> (u32, u32) {
    if width <= max_size && height <= max_size {
        return (width, height);
    }

    let ratio = width as f32 / height as f32;
    
    if width > height {
        (max_size, (max_size as f32 / ratio) as u32)
    } else {
        ((max_size as f32 * ratio) as u32, max_size)
    }
}

/// Generate thumbnail path from image path
/// 
/// Example: `/path/to/image.png` -> `/path/to/thumbnails/image.png`
pub fn get_thumbnail_path(image_path: &Path, thumbnail_base: &Path) -> PathBuf {
    let file_name = image_path.file_name().unwrap_or_default();
    thumbnail_base.join(file_name)
}

/// Check if thumbnail exists and is newer than source image
pub fn thumbnail_exists_and_valid(thumbnail_path: &Path, source_path: &Path) -> bool {
    if !thumbnail_path.exists() {
        return false;
    }

    // Check if thumbnail is newer than source (or same age)
    match (fs::metadata(thumbnail_path), fs::metadata(source_path)) {
        (Ok(thumb_meta), Ok(source_meta)) => {
            if let (Ok(thumb_time), Ok(source_time)) = (
                thumb_meta.modified(),
                source_meta.modified(),
            ) {
                thumb_time >= source_time
            } else {
                false
            }
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_calculate_thumbnail_size() {
        // Landscape image
        assert_eq!(calculate_thumbnail_size(2000, 1000, 256), (256, 128));
        
        // Portrait image
        assert_eq!(calculate_thumbnail_size(1000, 2000, 256), (128, 256));
        
        // Square image
        assert_eq!(calculate_thumbnail_size(1024, 1024, 256), (256, 256));
        
        // Already small
        assert_eq!(calculate_thumbnail_size(100, 100, 256), (100, 100));
    }

    #[test]
    fn test_get_thumbnail_path() {
        let image_path = Path::new("/images/photo.png");
        let thumb_base = Path::new("/thumbnails");
        let thumb_path = get_thumbnail_path(image_path, thumb_base);
        
        assert_eq!(thumb_path, PathBuf::from("/thumbnails/photo.png"));
    }
}

