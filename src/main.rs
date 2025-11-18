use ai_image_decoder::config::Config;
use ai_image_decoder::storage::Database;
use ai_image_decoder::ingestion::IngestionService;
use ai_image_decoder::api::server::start_server;
use log::info;
use std::env;

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logger
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    info!("Starting AI Image Decoder...");

    // Load configuration
    let config = Config::from_env()
        .expect("Failed to load configuration. Please check your environment variables.");

    info!("Configuration loaded successfully");

    // Check for scan command
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] == "scan" {
        if args.len() < 3 {
            eprintln!("Usage: {} scan <directory>", args[0]);
            std::process::exit(1);
        }

        let scan_dir = &args[2];
        info!("Scanning directory: {}", scan_dir);

        // Initialize database
        let db = Database::new(&config.database)
            .map_err(|e| anyhow::anyhow!("Database error: {}", e))?;
        let service = IngestionService::with_config(db, &config);

        // Scan directory
        let progress = service.scan_directory(scan_dir, true)
            .map_err(|e| anyhow::anyhow!("Scan error: {}", e))?;

        info!("Scan complete!");
        info!("  Total files: {}", progress.total_files);
        info!("  Processed: {}", progress.processed);
        info!("  Skipped: {}", progress.skipped);
        info!("  Errors: {}", progress.errors);

        return Ok(());
    }

    info!("Starting web server on {}:{}", config.server.host, config.server.port);
    info!("API available at http://{}:{}/api/v1", config.server.host, config.server.port);
    info!("Use '{} scan <directory>' to scan a directory for images", args[0]);

    // Build the URL
    let url = format!("http://{}:{}", config.server.host, config.server.port);
    
    // Start server in background and open browser
    let server_url = url.clone();
    tokio::spawn(async move {
        // Wait a moment for server to start
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        
        info!("Opening browser at {}", server_url);
        if let Err(e) = open::that(&server_url) {
            log::warn!("Failed to open browser: {}. Please manually navigate to {}", e, server_url);
        }
    });

    // Start web server
    start_server(config).await
        .map_err(|e| anyhow::anyhow!("Server error: {}", e))
}

