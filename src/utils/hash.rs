use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::Read;
use std::path::Path;

pub fn calculate_file_hash<P: AsRef<Path>>(path: P) -> anyhow::Result<String> {
    let path = path.as_ref();
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    let hash = hasher.finalize();
    Ok(hex::encode(hash))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;

    #[test]
    fn test_file_hash() {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"test content").unwrap();
        
        let hash = calculate_file_hash(file.path()).unwrap();
        assert_eq!(hash.len(), 64); // SHA256 produces 64 hex characters
    }
}

