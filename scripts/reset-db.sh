#!/bin/bash

# Reset database script for AI Image Decoder
# Usage: ./scripts/reset-db.sh [--keep-thumbnails]

set -e

DB_PATH="./data/images.db"
THUMBNAIL_PATH="./data/thumbnails"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🗑️  AI Image Decoder - Database Reset"
echo "======================================"
echo ""

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}⚠️  Database not found at: $DB_PATH${NC}"
    echo "   Database may not have been created yet."
    exit 0
fi

# Show current stats
echo "Current database stats:"
if command -v sqlite3 &> /dev/null; then
    echo "  Images: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM images;" 2>/dev/null || echo "?")"
    echo "  Prompts: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM prompts;" 2>/dev/null || echo "?")"
    echo "  Collections: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM collections;" 2>/dev/null || echo "?")"
    echo "  Tags: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM tags;" 2>/dev/null || echo "?")"
else
    echo "  (sqlite3 not available - install to see stats)"
fi
echo ""

# Confirm deletion
read -p "Delete database? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Cancelled${NC}"
    exit 0
fi

# Check if server is running
if lsof -ti :8080 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Server is running on port 8080${NC}"
    echo "   Database may be locked. Stop server first:"
    echo "   ./scripts/kill-server.sh"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ Cancelled${NC}"
        exit 0
    fi
fi

# Delete database
echo ""
echo "Deleting database..."
rm -f "$DB_PATH"
echo -e "${GREEN}✅ Database deleted: $DB_PATH${NC}"

# Handle thumbnails
if [ "$1" != "--keep-thumbnails" ]; then
    if [ -d "$THUMBNAIL_PATH" ]; then
        echo ""
        read -p "Delete thumbnails? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$THUMBNAIL_PATH"
            echo -e "${GREEN}✅ Thumbnails deleted: $THUMBNAIL_PATH${NC}"
        else
            echo -e "${YELLOW}⚠️  Thumbnails kept${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Thumbnails kept (--keep-thumbnails flag)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Database reset complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Scan a directory: cargo run -- scan /path/to/images"
echo "  2. Or start server: cargo run --release"
echo "  3. Then scan via UI: http://localhost:8080"

