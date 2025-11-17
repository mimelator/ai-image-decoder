#!/bin/bash

# Quick test script for AI Image Decoder
# Usage: ./scripts/quick-test.sh [server_url]

set -e

BASE_URL="${1:-http://localhost:8080}"
API_URL="${BASE_URL}/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" || echo "ERROR")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" || echo "ERROR")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    # Remove last line (http_code) to get body - works on both Linux and macOS
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "ERROR" ] || [ "$http_code" -ge 400 ]; then
        echo -e "${RED}FAILED${NC} (HTTP $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    else
        echo -e "${GREEN}PASSED${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    fi
}

echo "🧪 AI Image Decoder - Quick Test"
echo "=================================="
echo "Base URL: $BASE_URL"
echo ""

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${RED}❌ Server is not running!${NC}"
    echo ""
    echo "Please start the server first:"
    echo "  cargo run --release"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Health check
test_endpoint "Health Check" "GET" "$BASE_URL/health"

# Version check
test_endpoint "Version Check" "GET" "$BASE_URL/version"

# Statistics
test_endpoint "Overall Stats" "GET" "$API_URL/stats"
test_endpoint "Image Stats" "GET" "$API_URL/stats/images"
test_endpoint "Prompt Stats" "GET" "$API_URL/stats/prompts"

# Images
test_endpoint "List Images" "GET" "$API_URL/images?page=1&limit=5"

# Validate images are returned and can be accessed
echo ""
echo "Validating image display..."
image_response=$(curl -s "$API_URL/images?page=1&limit=5")
image_count=$(echo "$image_response" | grep -o '"images":\[' | wc -l || echo "0")
if [ "$image_count" -gt 0 ]; then
    # Extract first image ID
    first_image_id=$(echo "$image_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$first_image_id" ]; then
        echo -n "Testing image file endpoint... "
        file_response=$(curl -s -w "\n%{http_code}" "$API_URL/images/$first_image_id/file")
        file_code=$(echo "$file_response" | tail -n1)
        if [ "$file_code" = "200" ]; then
            echo -e "${GREEN}PASSED${NC} (Image file accessible)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${YELLOW}WARNING${NC} (HTTP $file_code - Image file may not exist on disk)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
    
    # Count images in response
    images_array=$(echo "$image_response" | grep -o '"images":\[.*\]' || echo "")
    if [ -n "$images_array" ]; then
        image_count=$(echo "$image_response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('images', [])))" 2>/dev/null || echo "0")
        if [ "$image_count" -gt 0 ]; then
            echo -e "${GREEN}✅ Found $image_count image(s) in response${NC}"
        else
            echo -e "${YELLOW}⚠️  No images found in response${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  No images found in database${NC}"
fi

# Prompts
test_endpoint "List Prompts" "GET" "$API_URL/prompts?page=1&limit=5"
test_endpoint "Search Prompts" "GET" "$API_URL/prompts/search?q=test"

# Search
test_endpoint "Global Search" "GET" "$API_URL/search?q=test"

# Collections
test_endpoint "List Collections" "GET" "$API_URL/collections"

# Tags
test_endpoint "List Tags" "GET" "$API_URL/tags"

# Export
test_endpoint "Export Prompts (JSON)" "GET" "$API_URL/export/prompts?format=json"
test_endpoint "Export Prompts (Markdown)" "GET" "$API_URL/export/prompts?format=markdown"

echo ""
echo "=================================="
echo "Test Results:"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

