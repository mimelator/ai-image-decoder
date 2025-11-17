use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub struct DirectoryScanner {
    root_path: PathBuf,
    recursive: bool,
}

impl DirectoryScanner {
    pub fn new<P: AsRef<Path>>(root_path: P, recursive: bool) -> Self {
        DirectoryScanner {
            root_path: root_path.as_ref().to_path_buf(),
            recursive,
        }
    }

    pub fn scan(&self) -> anyhow::Result<Vec<PathBuf>> {
        let mut image_files = Vec::new();
        let supported_extensions = ["png", "jpg", "jpeg", "webp"];

        let walker = if self.recursive {
            WalkDir::new(&self.root_path)
        } else {
            WalkDir::new(&self.root_path).max_depth(1)
        };

        for entry in walker {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext_lower = ext.to_string_lossy().to_lowercase();
                    if supported_extensions.contains(&ext_lower.as_str()) {
                        image_files.push(path.to_path_buf());
                    }
                }
            }
        }

        Ok(image_files)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[test]
    fn test_scanner_finds_images() {
        let temp_dir = TempDir::new().unwrap();
        let test_dir = temp_dir.path();

        // Create test files
        fs::write(test_dir.join("test.png"), b"fake png").unwrap();
        fs::write(test_dir.join("test.jpg"), b"fake jpg").unwrap();
        fs::write(test_dir.join("test.txt"), b"not an image").unwrap();

        let scanner = DirectoryScanner::new(test_dir, false);
        let files = scanner.scan().unwrap();

        assert_eq!(files.len(), 2);
    }
}

