#!/bin/bash
# Quick test script for PulseVault

set -e

API_BASE="http://localhost:3000"

# Detect temp directory (same logic as server/worker)
# Use Node.js to get os.tmpdir() which matches what the server uses
TEMP_BASE=$(node -e "const os = require('os'); console.log(os.tmpdir())" 2>/dev/null || echo "/tmp")
PULSEVAULT_TEMP_DIR="${TEMP_BASE}/pulsevault-test"

# Initialize variables for viewer
VIEWER_HTML=""
FULL_HLS_URL=""

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

# Test 4.5: Get upload token from QR endpoint
echo "4️⃣.5️⃣  Getting upload token..."
QR_RESPONSE=$(curl -s "$API_BASE/qr/deeplink?server=$API_BASE&userId=test-user")

# Try to extract token using jq if available, otherwise use grep
if command -v jq >/dev/null 2>&1; then
  UPLOAD_TOKEN=$(echo "$QR_RESPONSE" | jq -r '.token // empty' 2>/dev/null)
else
  UPLOAD_TOKEN=$(echo "$QR_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$UPLOAD_TOKEN" ] || [ "$UPLOAD_TOKEN" = "null" ]; then
  echo "   ⚠️  Failed to get token from QR endpoint"
  echo "   Response: $QR_RESPONSE"
  UPLOAD_TOKEN=""
else
  echo "   ✅ Upload token obtained"
fi
echo ""

# Test 5: Finalize upload
echo "5️⃣  Finalizing upload..."
FINALIZE_BODY="{
  \"uploadId\": \"$UPLOAD_ID\",
  \"filename\": \"test-video.mp4\",
  \"userId\": \"test-user\""

if [ -n "$UPLOAD_TOKEN" ]; then
  FINALIZE_BODY="$FINALIZE_BODY,
  \"uploadToken\": \"$UPLOAD_TOKEN\""
fi

FINALIZE_BODY="$FINALIZE_BODY
}"

FINALIZE_RESPONSE=$(curl -s -X POST "$API_BASE/uploads/finalize" \
  -H "Content-Type: application/json" \
  -d "$FINALIZE_BODY")

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

# Test 6: Check if file exists (check Docker container first, then local paths)
echo "6️⃣  Verifying file storage..."
VIDEO_PATH=""

# Check inside Docker container first
if docker compose exec -T pulsevault test -f "/media/videos/$VIDEO_ID/original.mp4" 2>/dev/null; then
  VIDEO_PATH="docker:/media/videos/$VIDEO_ID"
  echo "   ✅ File found in Docker container at: /media/videos/$VIDEO_ID/original.mp4"
  if docker compose exec -T pulsevault test -f "/media/videos/$VIDEO_ID/meta.json" 2>/dev/null; then
    echo "   ✅ Metadata file created"
    echo "   Metadata:"
    docker compose exec -T pulsevault cat "/media/videos/$VIDEO_ID/meta.json" | jq . 2>/dev/null || docker compose exec -T pulsevault cat "/media/videos/$VIDEO_ID/meta.json"
  fi
else
  # Fallback: check local filesystem paths (for non-Docker setups)
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
    echo "   ⚠️  File not found (checked Docker container and local paths)"
    echo "   This is normal if worker hasn't processed yet"
  fi
fi
echo ""

# Test 7: Wait for transcoding (check Docker container first, then local paths)
echo "7️⃣  Waiting for transcoding (checking every 2 seconds)..."
MAX_WAIT=30
WAITED=0
META_FILE=""
while [ $WAITED -lt $MAX_WAIT ]; do
  # Check Docker container first
  if docker compose exec -T pulsevault test -f "/media/videos/$VIDEO_ID/meta.json" 2>/dev/null; then
    META_FILE="docker:/media/videos/$VIDEO_ID/meta.json"
    STATUS=$(docker compose exec -T pulsevault cat "/media/videos/$VIDEO_ID/meta.json" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "transcoded" ]; then
      echo "   ✅ Transcoding completed! (took ${WAITED}s)"
      VIDEO_PATH="docker:/media/videos/$VIDEO_ID"
      break
    elif [ "$STATUS" = "transcode_failed" ]; then
      echo "   ❌ Transcoding failed"
      docker compose exec -T pulsevault cat "/media/videos/$VIDEO_ID/meta.json" | jq . 2>/dev/null
      break
    else
      echo "   ⏳ Status: $STATUS (waited ${WAITED}s)"
    fi
  else
    # Fallback: check local filesystem paths (for non-Docker setups)
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

# Test 9: Try to stream (check Docker container first, then local paths)
HLS_FILE=""
# Check Docker container first
if docker compose exec -T pulsevault test -f "/media/videos/$VIDEO_ID/hls/master.m3u8" 2>/dev/null; then
  HLS_FILE="docker:/media/videos/$VIDEO_ID/hls/master.m3u8"
  VIDEO_PATH="docker:/media/videos/$VIDEO_ID"
else
  # Fallback: check local filesystem paths (for non-Docker setups)
  for path in "$PULSEVAULT_TEMP_DIR/videos/$VIDEO_ID/hls/master.m3u8" "/tmp/pulsevault-test/videos/$VIDEO_ID/hls/master.m3u8" "/tmp/pulsevault/videos/$VIDEO_ID/hls/master.m3u8"; do
    if [ -f "$path" ]; then
      HLS_FILE="$path"
      VIDEO_PATH=$(dirname $(dirname "$path"))
      break
    fi
  done
fi

if [ -n "$HLS_FILE" ]; then
  echo "9️⃣  Testing media streaming..."
  STREAM_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE$SIGNED_URL")
  HTTP_CODE=$(echo "$STREAM_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "206" ]; then
    echo "   ✅ Media streaming works! (HTTP $HTTP_CODE)"
    
    # Generate fresh token for viewer (longer expiry for viewing)
    echo "   🔄 Generating fresh token for video viewer..."
    VIEWER_SIGN_RESPONSE=$(curl -s -X POST "$API_BASE/media/sign" \
      -H "Content-Type: application/json" \
      -d "{
        \"videoId\": \"$VIDEO_ID\",
        \"path\": \"hls/master.m3u8\",
        \"expiresIn\": 3600
      }")
    
    VIEWER_SIGNED_URL=$(echo "$VIEWER_SIGN_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    FULL_HLS_URL="$API_BASE$VIEWER_SIGNED_URL"
    VIEWER_HTML="/tmp/pulsevault-video-viewer-$VIDEO_ID.html"
    
    # Extract expiry info from sign response
    EXPIRES_AT=$(echo "$VIEWER_SIGN_RESPONSE" | grep -o '"expiresAt":"[^"]*"' | cut -d'"' -f4 || echo "")
    
    cat > "$VIEWER_HTML" << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PulseVault Video - $VIDEO_ID</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        body { margin: 0; padding: 20px; background: #000; }
        .container { max-width: 1200px; margin: 0 auto; }
        video { width: 100%; display: block; pointer-events: auto; }
        .quality-select { 
            margin-top: 10px; 
            padding: 8px; 
            background: #333; 
            color: #fff; 
            border: 1px solid #555; 
            border-radius: 4px; 
            cursor: pointer;
            width: 200px;
            z-index: 1000;
            position: relative;
        }
        .quality-select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="container">
        <video id="video" controls crossorigin="anonymous"></video>
        <div style="margin-top: 10px;">
            <label for="qualitySelect" style="color: #fff; margin-right: 10px;">Quality:</label>
            <select id="qualitySelect" class="quality-select">
                <option value="auto">Loading...</option>
            </select>
        </div>
    </div>
    <script>
        const video = document.getElementById('video');
        let qualitySelect = document.getElementById('qualitySelect');
        const hlsUrl = '$FULL_HLS_URL';
        let hls = null;
        let levels = [];
        
        function getLevelHeight(level) {
            try {
                // First try direct height property
                if (level && level.height && level.height > 0) return level.height;
                
                // level.url might be a string, array, or object
                let url = '';
                if (!level || !level.url) {
                    return 0;
                }
                
                if (typeof level.url === 'string') {
                    url = level.url;
                } else if (Array.isArray(level.url) && level.url.length > 0) {
                    url = level.url[0]; // Use first URL if array
                } else if (typeof level.url === 'object') {
                    url = String(level.url) || '';
                }
                
                // Try to parse height from URL
                if (url && typeof url === 'string') {
                    const match = url.match(/(\d+)p\.m3u8/);
                    if (match) return parseInt(match[1]);
                }
                
                // Try level.name if available
                if (level.name && typeof level.name === 'string') {
                    const match = level.name.match(/(\d+)p/);
                    if (match) return parseInt(match[1]);
                }
                
                // Fallback: use width to estimate (16:9 ratio)
                if (level.width && level.width > 0) {
                    return Math.round(level.width * 9 / 16);
                }
                
                return 0;
            } catch (e) {
                return 0;
            }
        }
        
        function updateQualitySelect() {
            if (!levels || levels.length === 0) {
                const currentSelect = document.getElementById('qualitySelect');
                if (currentSelect) {
                    currentSelect.innerHTML = '<option value="auto">No levels</option>';
                }
                return;
            }
            
            let currentSelect = document.getElementById('qualitySelect');
            if (!currentSelect) return;
            
            // Build options
            const options = [];
            const autoOption = document.createElement('option');
            autoOption.value = 'auto';
            autoOption.textContent = 'Auto (Adaptive)';
            options.push(autoOption);
            
            levels.forEach((level, index) => {
                const option = document.createElement('option');
                option.value = index.toString();
                const height = getLevelHeight(level);
                option.textContent = height > 0 ? height + 'p' : 'Level ' + index;
                options.push(option);
            });
            
            // Replace select element
            const parent = currentSelect.parentNode;
            const newSelect = document.createElement('select');
            newSelect.id = 'qualitySelect';
            newSelect.className = 'quality-select';
            options.forEach(opt => newSelect.appendChild(opt));
            parent.replaceChild(newSelect, currentSelect);
            qualitySelect = newSelect;
            
            // Attach change listener
            qualitySelect.addEventListener('change', function(e) {
                if (!hls) return;
                const value = e.target.value;
                if (value === 'auto') {
                    hls.currentLevel = -1;
                } else {
                    const levelIndex = parseInt(value);
                    if (levelIndex >= 0 && levelIndex < levels.length) {
                        hls.currentLevel = levelIndex;
                        if (hls.abrController && hls.abrController.bwEstimator) {
                            hls.abrController.bwEstimator.setEstimate(999999999);
                        }
                    }
                }
            });
        }
        
        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                levels = hls.levels;
                if (levels && levels.length > 0) {
                    updateQualitySelect();
                }
            });
            
            hls.on(Hls.Events.LEVEL_SWITCHED, function(event, data) {
                const currentSelect = document.getElementById('qualitySelect');
                if (currentSelect && hls.currentLevel !== -1) {
                    currentSelect.value = hls.currentLevel.toString();
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            qualitySelect.disabled = true;
            qualitySelect.innerHTML = '<option>Native HLS (no manual selection)</option>';
        }
    </script>
</body>
</html>
EOF
    
    echo ""
    echo "   🎥 HLS Video Viewer Created!"
    echo "   📄 Open this file in your browser:"
    echo "      file://$VIEWER_HTML"
    echo ""
    echo "   🌐 Or use this direct HLS URL:"
    echo "      $FULL_HLS_URL"
    echo ""
    
    # Try to open the HTML file automatically (macOS)
    if command -v open >/dev/null 2>&1; then
      echo "   🚀 Opening viewer in browser..."
      open "$VIEWER_HTML" 2>/dev/null || true
    fi
    echo ""
    
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
if [ -n "$VIEWER_HTML" ] && [ -f "$VIEWER_HTML" ]; then
  echo "  • Video Viewer: file://$VIEWER_HTML"
  echo "  • HLS URL: $FULL_HLS_URL"
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
if [ -n "$VIEWER_HTML" ] && [ -f "$VIEWER_HTML" ]; then
  echo "  • Watch video: open file://$VIEWER_HTML"
fi


