#!/bin/bash

# Test script for CLIP service integration
# This script tests the CLIP interrogation endpoint

set -e

API_BASE="http://localhost:9000"
SD_BASE_URL="${STABLE_DIFFUSION_BASE_URL:-http://127.0.0.1:7860}"

echo "🔍 Testing CLIP Service Integration"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if AI Image Decoder server is running
echo "1️⃣  Checking AI Image Decoder server..."
if curl -s -f "${API_BASE}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running at ${API_BASE}"
else
    echo -e "${RED}✗${NC} Server is not running at ${API_BASE}"
    echo "   Please start the server first: cargo run"
    exit 1
fi
echo ""

# Step 2: Check CLIP service health
echo "2️⃣  Checking CLIP service health..."
CLIP_HEALTH=$(curl -s "${API_BASE}/api/v1/clip/health")
if echo "$CLIP_HEALTH" | grep -q '"available":true'; then
    echo -e "${GREEN}✓${NC} CLIP service is available"
    echo "   Response: $CLIP_HEALTH"
else
    echo -e "${YELLOW}⚠${NC}  CLIP service may not be available"
    echo "   Response: $CLIP_HEALTH"
    echo "   Make sure Stable Diffusion API is running at: ${SD_BASE_URL}"
fi
echo ""

# Step 3: Get list of images
echo "3️⃣  Getting list of images..."
IMAGES=$(curl -s "${API_BASE}/api/v1/images?limit=1")
IMAGE_COUNT=$(echo "$IMAGES" | grep -o '"total":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -z "$IMAGE_COUNT" ] || [ "$IMAGE_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠${NC}  No images found in database"
    echo "   Please scan some images first:"
    echo "   curl -X POST ${API_BASE}/api/v1/images/scan -H 'Content-Type: application/json' -d '{\"path\": \"/path/to/images\", \"recursive\": true}'"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found ${IMAGE_COUNT} images in database"

# Extract first image ID
IMAGE_ID=$(echo "$IMAGES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$IMAGE_ID" ]; then
    echo -e "${RED}✗${NC} Could not extract image ID"
    exit 1
fi

echo "   Using image ID: ${IMAGE_ID}"
echo ""

# Step 4: Interrogate the image
echo "4️⃣  Interrogating image with CLIP..."
echo "   This may take 10-30 seconds..."
INTERROGATE_RESULT=$(curl -s -X POST "${API_BASE}/api/v1/images/${IMAGE_ID}/interrogate" \
    -H "Content-Type: application/json" \
    -d '{"model": "clip"}')

# Check if we got an error
if echo "$INTERROGATE_RESULT" | grep -q '"error"'; then
    echo -e "${RED}✗${NC} Interrogation failed:"
    echo "$INTERROGATE_RESULT" | python3 -m json.tool 2>/dev/null || echo "$INTERROGATE_RESULT"
    exit 1
fi

# Extract the prompt
PROMPT=$(echo "$INTERROGATE_RESULT" | grep -o '"prompt":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROMPT" ]; then
    echo -e "${YELLOW}⚠${NC}  Could not extract prompt from response:"
    echo "$INTERROGATE_RESULT" | python3 -m json.tool 2>/dev/null || echo "$INTERROGATE_RESULT"
else
    echo -e "${GREEN}✓${NC} Interrogation successful!"
    echo ""
    echo "Generated Prompt:"
    echo "─────────────────────────────────────────────────────────"
    echo "$PROMPT"
    echo "─────────────────────────────────────────────────────────"
    echo ""
    echo "Full response:"
    echo "$INTERROGATE_RESULT" | python3 -m json.tool 2>/dev/null || echo "$INTERROGATE_RESULT"
fi

echo ""
echo "✅ Test complete!"

