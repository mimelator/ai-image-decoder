use crate::extraction::MetadataExtractor;
use crate::ingestion::scanner::DirectoryScanner;
use crate::storage::{
    Database, ImageRepository, PromptRepository, MetadataRepository,
    CollectionRepository, TagRepository,
};
use crate::utils::{calculate_file_hash, thumbnail};
use crate::extraction::tag_extractor::TagExtractor;
use crate::config::Config;
use chrono::Utc;
use image::{open, GenericImageView};
use std::path::{Path, PathBuf};
use uuid::Uuid;
use log::{info, warn};

pub struct IngestionService {
    #[allow(dead_code)]
    db: Database,
    image_repo: ImageRepository,
    prompt_repo: PromptRepository,
    metadata_repo: MetadataRepository,
    collection_repo: CollectionRepository,
    tag_repo: TagRepository,
    thumbnail_config: Option<ThumbnailConfig>,
}

#[derive(Debug, Clone)]
pub struct ThumbnailConfig {
    pub enabled: bool,
    pub thumbnail_path: PathBuf,
    pub max_size: u32,
    pub quality: u8,
}

#[derive(Debug, Clone)]
pub struct ScanProgress {
    pub total_files: usize,
    pub processed: usize,
    pub skipped: usize,
    pub errors: usize,
    pub current_file: Option<String>,
}

impl IngestionService {
    pub fn new(db: Database) -> Self {
        IngestionService {
            image_repo: ImageRepository::new(db.clone()),
            prompt_repo: PromptRepository::new(db.clone()),
            metadata_repo: MetadataRepository::new(db.clone()),
            collection_repo: CollectionRepository::new(db.clone()),
            tag_repo: TagRepository::new(db.clone()),
            db,
            thumbnail_config: None,
        }
    }

    pub fn with_config(db: Database, config: &Config) -> Self {
        let thumbnail_config = if config.thumbnail.enabled {
            Some(ThumbnailConfig {
                enabled: true,
                thumbnail_path: PathBuf::from(&config.storage.thumbnail_path),
                max_size: config.thumbnail.size,
                quality: config.thumbnail.quality,
            })
        } else {
            None
        };

        IngestionService {
            image_repo: ImageRepository::new(db.clone()),
            prompt_repo: PromptRepository::new(db.clone()),
            metadata_repo: MetadataRepository::new(db.clone()),
            collection_repo: CollectionRepository::new(db.clone()),
            tag_repo: TagRepository::new(db.clone()),
            db,
            thumbnail_config,
        }
    }

    pub fn scan_directory<P: AsRef<Path>>(
        &self,
        root_path: P,
        recursive: bool,
    ) -> anyhow::Result<ScanProgress> {
        let root_path = root_path.as_ref();
        info!("Starting scan of directory: {}", root_path.display());

        // Scan for image files
        let scanner = DirectoryScanner::new(root_path, recursive);
        let image_files = scanner.scan()?;

        info!("Found {} image files", image_files.len());
        info!("Starting processing...");

        // Create collections from folder structure
        info!("Creating folder-based collections...");
        self.create_folder_collections(root_path, &image_files)?;
        info!("Collections created, starting image processing...");

        // Process each image
        let mut progress = ScanProgress {
            total_files: image_files.len(),
            processed: 0,
            skipped: 0,
            errors: 0,
            current_file: None,
        };

        for (index, file_path) in image_files.iter().enumerate() {
            progress.current_file = Some(file_path.display().to_string());
            
            let current = index + 1;
            let remaining = progress.total_files - current;
            let percent = current as f64 / progress.total_files as f64 * 100.0;
            
            // Determine logging frequency based on total files
            let log_interval = if progress.total_files > 10000 {
                1000  // Log every 1000 for very large scans
            } else if progress.total_files > 1000 {
                100   // Log every 100 for large scans
            } else {
                10    // Log every 10 for smaller scans
            };
            
            // Check if we're at a 10% milestone
            let prev_percent = ((current - 1) as f64 / progress.total_files as f64 * 100.0) as u32;
            let curr_percent_int = percent as u32;
            let at_milestone = prev_percent / 10 != curr_percent_int / 10;
            
            let should_log = current % log_interval == 0 
                || current == 1 
                || current == progress.total_files
                || at_milestone; // Log at 10% milestones (10%, 20%, 30%, etc.)
            
            match self.process_image(file_path) {
                Ok(true) => {
                    progress.processed += 1;
                    if should_log {
                        info!(
                            "[{}/{}] ({:.1}%) Processed: {} | Remaining: {} | Errors: {} | Skipped: {}",
                            current,
                            progress.total_files,
                            percent,
                            progress.processed,
                            remaining,
                            progress.errors,
                            progress.skipped
                        );
                    }
                }
                Ok(false) => {
                    progress.skipped += 1;
                    if should_log {
                        info!(
                            "[{}/{}] ({:.1}%) Skipped: {} | Processed: {} | Remaining: {} | Errors: {}",
                            current,
                            progress.total_files,
                            percent,
                            progress.skipped,
                            progress.processed,
                            remaining,
                            progress.errors
                        );
                    }
                }
                Err(e) => {
                    warn!("Error processing {}: {}", file_path.display(), e);
                    progress.errors += 1;
                    // Always log errors
                    info!(
                        "[{}/{}] ({:.1}%) ERROR processing: {} | Processed: {} | Remaining: {} | Errors: {}",
                        current,
                        progress.total_files,
                        percent,
                        file_path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown"),
                        progress.processed,
                        remaining,
                        progress.errors
                    );
                }
            }
        }

        info!("");
        info!("========================================");
        info!("Scan Complete!");
        info!("========================================");
        info!("Total files:     {}", progress.total_files);
        info!("Processed:       {} ({:.1}%)", 
              progress.processed, 
              (progress.processed as f64 / progress.total_files as f64 * 100.0));
        info!("Skipped:        {} ({:.1}%)", 
              progress.skipped,
              (progress.skipped as f64 / progress.total_files as f64 * 100.0));
        info!("Errors:          {} ({:.1}%)", 
              progress.errors,
              (progress.errors as f64 / progress.total_files as f64 * 100.0));
        info!("========================================");

        Ok(progress)
    }

    fn process_image(&self, file_path: &Path) -> anyhow::Result<bool> {
        // Check if image already exists (by path)
        if let Some(existing) = self.image_repo.find_by_path(file_path.to_str().unwrap())? {
            // Update last scanned time
            self.image_repo.update_last_scanned(&existing.id)?;
            return Ok(false); // Skipped (already exists)
        }

        // Calculate file hash for deduplication
        let file_hash = calculate_file_hash(file_path)?;
        
        // Check for duplicate by hash
        // TODO: Add hash-based lookup to image_repo

        // Get image dimensions
        let (width, height) = self.get_image_dimensions(file_path)?;

        // Extract metadata
        let extracted = MetadataExtractor::extract(file_path)?;

        // Get file info
        let metadata = std::fs::metadata(file_path)?;
        let file_name = file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let format = file_path.extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_lowercase())
            .unwrap_or_default();

        // Create image record
        let now = Utc::now().to_rfc3339();
        let image_id = Uuid::new_v4().to_string();
        
        let image = crate::storage::image_repo::Image {
            id: image_id.clone(),
            file_path: file_path.to_str().unwrap().to_string(),
            file_name,
            file_size: metadata.len(),
            format,
            width: Some(width),
            height: Some(height),
            hash: Some(file_hash),
            created_at: now.clone(),
            updated_at: now.clone(),
            last_scanned_at: now.clone(),
        };

        self.image_repo.create(&image)?;

        // Generate thumbnail if enabled
        if let Some(ref thumb_config) = self.thumbnail_config {
            if thumb_config.enabled {
                self.generate_thumbnail_if_needed(file_path, &thumb_config)?;
            }
        }

        // Store prompts
        if let Some(prompt_text) = extracted.prompt {
            let prompt_id = Uuid::new_v4().to_string();
            let prompt = crate::storage::prompt_repo::Prompt {
                id: prompt_id,
                image_id: image_id.clone(),
                prompt_text: prompt_text.clone(),
                negative_prompt: extracted.negative_prompt.clone(),
                prompt_type: "positive".to_string(),
                created_at: now.clone(),
            };
            self.prompt_repo.create(&prompt)?;

            // Extract and store tags from prompt
            self.extract_and_store_tags(&image_id, &prompt_text, extracted.negative_prompt.as_deref())?;
        }

        // Store metadata
        if let Some(model) = extracted.model {
            let meta_id = Uuid::new_v4().to_string();
            let meta = crate::storage::metadata_repo::Metadata {
                id: meta_id,
                image_id: image_id.clone(),
                key: "model".to_string(),
                value: model,
                metadata_type: "generation".to_string(),
                created_at: now.clone(),
            };
            self.metadata_repo.create(&meta)?;
        }

        // Store other metadata fields
        for (key, value) in extracted.other {
            let meta_id = Uuid::new_v4().to_string();
            let meta = crate::storage::metadata_repo::Metadata {
                id: meta_id,
                image_id: image_id.clone(),
                key: key.clone(),
                value,
                metadata_type: "generation".to_string(),
                created_at: now.clone(),
            };
            self.metadata_repo.create(&meta)?;
        }

        // Store generation parameters
        if let Some(seed) = extracted.seed {
            self.store_metadata(&image_id, "seed", &seed, &now)?;
        }
        if let Some(steps) = extracted.steps {
            self.store_metadata(&image_id, "steps", &steps, &now)?;
        }
        if let Some(cfg_scale) = extracted.cfg_scale {
            self.store_metadata(&image_id, "cfg_scale", &cfg_scale, &now)?;
        }
        if let Some(sampler) = extracted.sampler {
            self.store_metadata(&image_id, "sampler", &sampler, &now)?;
        }
        if let Some(size) = extracted.size {
            self.store_metadata(&image_id, "size", &size, &now)?;
        }

        // Assign to folder-based collection
        self.assign_to_folder_collection(file_path, &image_id)?;

        Ok(true) // Processed successfully
    }

    fn store_metadata(&self, image_id: &str, key: &str, value: &str, created_at: &str) -> anyhow::Result<()> {
        let meta_id = Uuid::new_v4().to_string();
        let meta = crate::storage::metadata_repo::Metadata {
            id: meta_id,
            image_id: image_id.to_string(),
            key: key.to_string(),
            value: value.to_string(),
            metadata_type: "generation".to_string(),
            created_at: created_at.to_string(),
        };
        self.metadata_repo.create(&meta)?;
        Ok(())
    }

    fn get_image_dimensions(&self, path: &Path) -> anyhow::Result<(u32, u32)> {
        match open(path) {
            Ok(img) => Ok(img.dimensions()),
            Err(_) => Ok((0, 0)), // Could not open/decode image
        }
    }

    fn generate_thumbnail_if_needed(
        &self,
        image_path: &Path,
        thumb_config: &ThumbnailConfig,
    ) -> anyhow::Result<()> {
        let thumbnail_path = thumbnail::get_thumbnail_path(image_path, &thumb_config.thumbnail_path);
        
        // Check if thumbnail already exists and is valid
        if thumbnail::thumbnail_exists_and_valid(&thumbnail_path, image_path) {
            return Ok(()); // Thumbnail already exists and is up to date
        }

        // Generate thumbnail
        match thumbnail::generate_thumbnail(
            image_path,
            &thumbnail_path,
            thumb_config.max_size,
            thumb_config.quality,
        ) {
            Ok(_) => Ok(()),
            Err(e) => {
                warn!("Failed to generate thumbnail for {}: {}", image_path.display(), e);
                Ok(()) // Don't fail ingestion if thumbnail generation fails
            }
        }
    }

    fn create_folder_collections(
        &self,
        root_path: &Path,
        image_files: &[PathBuf],
    ) -> anyhow::Result<()> {
        let mut folder_paths = std::collections::HashSet::new();

        // Collect all unique folder paths
        for file_path in image_files {
            if let Some(parent) = file_path.parent() {
                if parent != root_path {
                    folder_paths.insert(parent.to_path_buf());
                }
            }
        }

        if folder_paths.is_empty() {
            info!("No subfolders found - images will be in root collection");
        } else {
            info!("Creating {} folder-based collections from subfolders...", folder_paths.len());
        }

        // Create collection for each folder
        for folder_path in folder_paths {
            let collection_name = folder_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown")
                .to_string();

            // Check if collection already exists
            if self.collection_repo.find_by_folder_path(folder_path.to_str().unwrap()).is_ok() {
                continue; // Collection already exists
            }

            let collection_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();

            let collection = crate::storage::collection_repo::Collection {
                id: collection_id,
                name: collection_name,
                description: Some(format!("Auto-created from folder: {}", folder_path.display())),
                folder_path: Some(folder_path.to_str().unwrap().to_string()),
                is_folder_based: true,
                created_at: now.clone(),
                updated_at: now,
            };

            self.collection_repo.create(&collection)?;
        }

        Ok(())
    }

    fn assign_to_folder_collection(&self, file_path: &Path, image_id: &str) -> anyhow::Result<()> {
        if let Some(parent) = file_path.parent() {
            if let Some(collection) = self.collection_repo.find_by_folder_path(parent.to_str().unwrap())? {
                self.collection_repo.add_image(&collection.id, image_id)?;
            }
        }
        Ok(())
    }

    fn extract_and_store_tags(
        &self,
        image_id: &str,
        prompt: &str,
        negative_prompt: Option<&str>,
    ) -> anyhow::Result<()> {
        let tag_extractor = TagExtractor::new();
        let tags = tag_extractor.extract_from_prompt(prompt, negative_prompt)?;

        let now = Utc::now().to_rfc3339();

        for (tag_name, tag_type, confidence) in tags {
            // Find or create tag
            let tag = self.tag_repo.find_or_create(&tag_name, &tag_type)?;

            // Add tag to image
            let image_tag = crate::storage::tag_repo::ImageTag {
                image_id: image_id.to_string(),
                tag_id: tag.id.clone(),
                confidence,
                source: "prompt".to_string(),
                created_at: now.clone(),
            };

            self.tag_repo.add_to_image(&image_tag)?;
        }

        Ok(())
    }
}

