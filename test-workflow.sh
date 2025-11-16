#!/bin/bash
# Quick test script for PulseVault

set -e

API_BASE="http://localhost:3000"

# Detect temp directory (same logic as server/worker)
# Use Node.js to get os.tmpdir() which matches what the server uses
TEMP_BASE=$(node -e "const os = require('os'); console.log(os.tmpdir())" 2>/dev/null || echo "/tmp")
PULSEVAULT_TEMP_DIR="${TEMP_BASE}/pulsevault-test"

echo "🧪 Testing PulseVault API"
echo "========================="
echo "📁 Using temp directory: $PULSEVAULT_TEMP_DIR"
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check..."
HEALTH=$(curl -s "$API_BASE/")
if echo "$HEALTH" | grep -q "root"; then
  echo "   ✅ Server is running"
else
  echo "   ❌ Server not responding"
  exit 1
fi
echo ""

# Test 2: Use test video file
echo "2️⃣  Preparing test video file..."
TEST_FILE="/tmp/test-video-real.mp4"

# Check if test video exists
if [ ! -f "$TEST_FILE" ]; then
  echo "   ⚠️  Test video not found at $TEST_FILE"
  echo "   Creating a small test video with ffmpeg..."
  ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=1 \
    -f lavfi -i sine=frequency=1000:duration=5 \
    -c:v libx264 -preset ultrafast -crf 28 \
    -c:a aac -shortest \
    "$TEST_FILE" -y >/dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Created test video: $TEST_FILE"
  else
    echo "   ❌ Failed to create test video"
    exit 1
  fi
else
  echo "   ✅ Using test video: $TEST_FILE"
fi

# Get video info
FILE_SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE" 2>/dev/null)
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE/1024/1024" | bc 2>/dev/null || echo "N/A")

# Try to get video metadata
if command -v ffprobe >/dev/null 2>&1; then
  VIDEO_INFO=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name,duration -of json "$TEST_FILE" 2>/dev/null)
  if [ -n "$VIDEO_INFO" ]; then
    WIDTH=$(echo "$VIDEO_INFO" | grep -o '"width":[0-9]*' | head -1 | cut -d: -f2)
    HEIGHT=$(echo "$VIDEO_INFO" | grep -o '"height":[0-9]*' | head -1 | cut -d: -f2)
    CODEC=$(echo "$VIDEO_INFO" | grep -o '"codec_name":"[^"]*"' | head -1 | cut -d'"' -f4)
    DURATION=$(echo "$VIDEO_INFO" | grep -o '"duration":"[^"]*"' | head -1 | cut -d'"' -f4 | cut -d. -f1)
    if [ -n "$WIDTH" ] && [ -n "$HEIGHT" ]; then
      echo "   📹 Video: ${WIDTH}x${HEIGHT}, ${CODEC:-unknown codec}, ~${DURATION:-?}s"
    fi
  fi
fi
echo "   📦 File size: $FILE_SIZE bytes ($FILE_SIZE_MB MB)"
echo ""

# Test 3: Start tus upload
echo "3️⃣  Starting tus upload..."
UPLOAD_RESPONSE=$(curl -s -i -X POST "$API_BASE/uploads" \
  -H "Upload-Length: $FILE_SIZE" \
  -H "Tus-Resumable: 1.0.0")

UPLOAD_ID=$(echo "$UPLOAD_RESPONSE" | grep -i "Location:" | sed 's/.*\/uploads\///' | tr -d '\r\n ')

if [ -z "$UPLOAD_ID" ]; then
  echo "   ❌ Failed to create upload"
  exit 1
fi

echo "   ✅ Upload created: $UPLOAD_ID"
echo ""

# Test 4: Upload the file
echo "4️⃣  Uploading file..."
UPLOAD_RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PATCH "$API_BASE/uploads/$UPLOAD_ID" \
  -H "Content-Type: application/offset+octet-stream" \
  -H "Upload-Offset: 0" \
  -H "Tus-Resumable: 1.0.0" \
  --data-binary "@$TEST_FILE")

HTTP_CODE=$(echo "$UPLOAD_RESULT" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "204" ]; then
  echo "   ✅ File uploaded successfully"
else
  echo "   ❌ Upload failed (HTTP $HTTP_CODE)"
  echo "$UPLOAD_RESULT"
  exit 1
fi
echo ""

# Test 5: Finalize upload
echo "5️⃣  Finalizing upload..."
FINALIZE_RESPONSE=$(curl -s -X POST "$API_BASE/uploads/finalize" \
  -H "Content-Type: application/json" \
  -d "{
    \"uploadId\": \"$UPLOAD_ID\",
    \"filename\": \"test-video.mp4\",
    \"userId\": \"test-user\"
  }")

VIDEO_ID=$(echo "$FINALIZE_RESPONSE" | grep -o '"videoId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$VIDEO_ID" ]; then
  echo "   ❌ Failed to finalize upload"
  echo "$FINALIZE_RESPONSE"
  exit 1
fi

echo "   ✅ Upload finalized"
echo "   Video ID: $VIDEO_ID"
echo "   Response: $FINALIZE_RESPONSE" | jq . 2>/dev/null || echo "$FINALIZE_RESPONSE"
echo ""

# Test 6: Check if file exists (check detected temp dir and fallback locations)
echo "6️⃣  Verifying file storage..."
VIDEO_PATH=""
for path in "$PULSEVAULT_TEMP_DIR/videos/$VIDEO_ID" "/tmp/pulsevault-test/videos/$VIDEO_ID" "/tmp/pulsevault/videos/$VIDEO_ID"; do
  if [ -f "$path/original.mp4" ]; then
    VIDEO_PATH="$path"
    break
  fi
done

if [ -n "$VIDEO_PATH" ]; then
  echo "   ✅ File stored at: $VIDEO_PATH/original.mp4"
  if [ -f "$VIDEO_PATH/meta.json" ]; then
    echo "   ✅ Metadata file created"
    echo "   Metadata:"
    cat "$VIDEO_PATH/meta.json" | jq . 2>/dev/null || cat "$VIDEO_PATH/meta.json"
  fi
else
  echo "   ⚠️  File not found (checked: $PULSEVAULT_TEMP_DIR/videos/$VIDEO_ID)"
  echo "   This is normal if worker hasn't processed yet or uses different path"
fi
echo ""

# Test 7: Wait for transcoding (check status - check detected temp dir and fallback locations)
echo "7️⃣  Waiting for transcoding (checking every 2 seconds)..."
MAX_WAIT=30
WAITED=0
META_FILE=""
while [ $WAITED -lt $MAX_WAIT ]; do
  # Check detected temp dir first, then fallback locations
  for path in "$PULSEVAULT_TEMP_DIR/videos/$VIDEO_ID/meta.json" "/tmp/pulsevault-test/videos/$VIDEO_ID/meta.json" "/tmp/pulsevault/videos/$VIDEO_ID/meta.json"; do
    if [ -f "$path" ]; then
      META_FILE="$path"
      break
    fi
  done
  
  if [ -n "$META_FILE" ]; then
    STATUS=$(cat "$META_FILE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "transcoded" ]; then
      echo "   ✅ Transcoding completed! (took ${WAITED}s)"
      VIDEO_PATH=$(dirname "$META_FILE")
      break
    elif [ "$STATUS" = "transcode_failed" ]; then
      echo "   ❌ Transcoding failed"
      cat "$META_FILE" | jq . 2>/dev/null
      break
    else
      echo "   ⏳ Status: $STATUS (waited ${WAITED}s)"
    fi
  else
    echo "   ⏳ Waiting for metadata file... (waited ${WAITED}s)"
  fi
  sleep 2
  WAITED=$((WAITED + 2))
done
echo ""

# Test 8: Generate signed URL
echo "8️⃣  Generating signed URL..."
SIGN_RESPONSE=$(curl -s -X POST "$API_BASE/media/sign" \
  -H "Content-Type: application/json" \
  -d "{
    \"videoId\": \"$VIDEO_ID\",
    \"path\": \"hls/master.m3u8\",
    \"expiresIn\": 300
  }")

SIGNED_URL=$(echo "$SIGN_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SIGNED_URL" ]; then
  echo "   ✅ Signed URL generated"
  echo "   URL: $SIGNED_URL"
else
  echo "   ❌ Failed to generate signed URL"
  echo "$SIGN_RESPONSE"
fi
echo ""

# Test 9: Try to stream (if transcoded - check detected temp dir and fallback locations)
HLS_FILE=""
for path in "$PULSEVAULT_TEMP_DIR/videos/$VIDEO_ID/hls/master.m3u8" "/tmp/pulsevault-test/videos/$VIDEO_ID/hls/master.m3u8" "/tmp/pulsevault/videos/$VIDEO_ID/hls/master.m3u8"; do
  if [ -f "$path" ]; then
    HLS_FILE="$path"
    VIDEO_PATH=$(dirname $(dirname "$path"))
    break
  fi
done

if [ -n "$HLS_FILE" ]; then
  echo "9️⃣  Testing media streaming..."
  STREAM_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE$SIGNED_URL")
  HTTP_CODE=$(echo "$STREAM_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "206" ]; then
    echo "   ✅ Media streaming works! (HTTP $HTTP_CODE)"
  else
    echo "   ⚠️  Streaming returned HTTP $HTTP_CODE"
    echo "   Response: $(echo "$STREAM_RESPONSE" | head -5)"
  fi
else
  echo "9️⃣  Skipping streaming test (HLS files not found)"
  echo "   Checked: $PULSEVAULT_TEMP_DIR/videos/$VIDEO_ID/hls/master.m3u8"
  echo "   Checked: /tmp/pulsevault-test/videos/$VIDEO_ID/hls/master.m3u8"
  echo "   Checked: /tmp/pulsevault/videos/$VIDEO_ID/hls/master.m3u8"
fi
echo ""

# Test 10: Check metrics
echo "🔟 Checking metrics..."
METRICS=$(curl -s "$API_BASE/metrics" | grep "pulsevault_" | head -5)
if [ -n "$METRICS" ]; then
  echo "   ✅ Metrics available:"
  echo "$METRICS" | sed 's/^/      /'
else
  echo "   ⚠️  No metrics found"
fi
echo ""

echo "✨ Test workflow complete!"
echo ""
echo "Summary:"
echo "  • Upload: ✅"
echo "  • Finalize: ✅"
echo "  • Video ID: $VIDEO_ID"
if [ -n "$VIDEO_PATH" ]; then
  echo "  • Storage: $VIDEO_PATH/"
else
  echo "  • Storage: Check $PULSEVAULT_TEMP_DIR/videos/ or /tmp/pulsevault*/videos/"
fi
echo ""
echo "Next steps:"
echo "  • Check worker logs for transcoding progress"
if [ -n "$VIDEO_PATH" ]; then
  echo "  • View files: ls -la $VIDEO_PATH/"
else
  echo "  • View files: ls -la $PULSEVAULT_TEMP_DIR/videos/$VIDEO_ID/"
  echo "  • View files: ls -la /tmp/pulsevault*/videos/$VIDEO_ID/"
fi
echo "  • Check audit logs: ls -la $PULSEVAULT_TEMP_DIR/audit/"

