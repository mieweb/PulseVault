#!/bin/bash
# Comprehensive test script for PulseVault full infrastructure
# Tests: API, Nginx, Redis, Prometheus, Grafana, Loki, HMAC signing, etc.

set -e

API_BASE="http://localhost:3000"
NGINX_BASE="http://localhost:80"
PROMETHEUS_BASE="http://localhost:9090"
GRAFANA_BASE="http://localhost:3001"
LOKI_BASE="http://localhost:3100"

# Detect temp directory (same logic as server/worker)
TEMP_BASE=$(node -e "const os = require('os'); console.log(os.tmpdir())" 2>/dev/null || echo "/tmp")
PULSEVAULT_TEMP_DIR="${TEMP_BASE}/pulsevault-test"

echo "🧪 PulseVault Full Infrastructure Test Suite"
echo "============================================="
echo "📁 Using temp directory: $PULSEVAULT_TEMP_DIR"
echo ""

PASSED=0
FAILED=0

# Helper function to test endpoints
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local expected_status=$4
    local data=$5
    
    echo -n "   Testing $name... "
    
    if [ -n "$data" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "HTTP_CODE:000")
    else
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url" 2>/dev/null || echo "HTTP_CODE:000")
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    
    if [ "$HTTP_CODE" = "$expected_status" ]; then
        echo "✅ ($HTTP_CODE)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo "❌ (Expected $expected_status, got $HTTP_CODE)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# ============================================================================
# 1. DOCKER COMPOSE SERVICES
# ============================================================================
echo "1️⃣  Docker Compose Services"
echo "───────────────────────────"

echo -n "   Checking Docker Compose services... "
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    if docker ps | grep -q pulsevault; then
        echo "✅ (Services running)"
        PASSED=$((PASSED + 1))
    else
        echo "⚠️  (Services not running - run: docker-compose up -d)"
        FAILED=$((FAILED + 1))
    fi
else
    echo "⚠️  (Docker not available)"
fi
echo ""

# ============================================================================
# 2. REDIS CONNECTION
# ============================================================================
echo "2️⃣  Redis Connection & Queue"
echo "─────────────────────────────"

# Test Redis connection (Redis doesn't use HTTP)
if command -v redis-cli &> /dev/null; then
    if redis-cli ping 2>/dev/null | grep -q PONG; then
        echo "   ✅ Redis is responding"
        PASSED=$((PASSED + 1))
        
        # Test queue operations
        QUEUE_LEN=$(redis-cli LLEN queue:transcode 2>/dev/null || echo "0")
        echo "   📊 Queue length: $QUEUE_LEN"
    else
        echo "   ❌ Redis not responding"
        FAILED=$((FAILED + 1))
    fi
elif docker exec pulsevault-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "   ✅ Redis is responding (via Docker)"
    PASSED=$((PASSED + 1))
    
    # Test queue operations via Docker
    QUEUE_LEN=$(docker exec pulsevault-redis redis-cli LLEN queue:transcode 2>/dev/null || echo "0")
    echo "   📊 Queue length: $QUEUE_LEN"
else
    echo "   ⚠️  Redis not accessible (redis-cli not available and Docker exec failed)"
    FAILED=$((FAILED + 1))
fi
echo ""

# ============================================================================
# 3. API SERVER (Direct)
# ============================================================================
echo "3️⃣  API Server (Direct - Port 3000)"
echo "────────────────────────────────────"

test_endpoint "Health check" "GET" "$API_BASE/" "200"
test_endpoint "Metrics endpoint" "GET" "$API_BASE/metrics" "200"
echo ""

# ============================================================================
# 4. NGINX REVERSE PROXY
# ============================================================================
echo "4️⃣  Nginx Reverse Proxy (Port 80)"
echo "──────────────────────────────────"

test_endpoint "Nginx health" "GET" "$NGINX_BASE/health" "200"
test_endpoint "Nginx → API root" "GET" "$NGINX_BASE/" "200"
test_endpoint "Nginx → Metrics" "GET" "$NGINX_BASE/metrics" "200"

# Test rate limiting (make 20 rapid requests)
echo -n "   Testing rate limiting... "
RATE_LIMIT_HIT=0
for i in {1..20}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$NGINX_BASE/" 2>/dev/null || echo "000")
    if [ "$STATUS" = "503" ] || [ "$STATUS" = "429" ]; then
        RATE_LIMIT_HIT=1
        break
    fi
    sleep 0.1
done
if [ "$RATE_LIMIT_HIT" = "1" ]; then
    echo "✅ (Rate limiting active)"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  (Rate limiting not triggered)"
fi
echo ""

# ============================================================================
# 5. HMAC SECRET & SIGNED URLS
# ============================================================================
echo "5️⃣  HMAC Secret & Signed URLs"
echo "──────────────────────────────"

# Check if HMAC_SECRET is set
if [ -f "pulsevault/.env" ]; then
    HMAC_SECRET=$(grep "^HMAC_SECRET=" pulsevault/.env | cut -d= -f2- | tr -d '"' || echo "")
    if [ -n "$HMAC_SECRET" ] && [ "$HMAC_SECRET" != "change-me-in-production" ]; then
        echo "   ✅ HMAC_SECRET is configured"
        PASSED=$((PASSED + 1))
    else
        echo "   ⚠️  HMAC_SECRET is default (not secure for production)"
        FAILED=$((FAILED + 1))
    fi
else
    echo "   ⚠️  .env file not found"
    FAILED=$((FAILED + 1))
fi

# Test signed URL generation
echo -n "   Testing signed URL generation... "
SIGN_RESPONSE=$(curl -s -X POST "$API_BASE/media/sign" \
    -H "Content-Type: application/json" \
    -d '{"videoId":"test-id","path":"hls/master.m3u8","expiresIn":300}' 2>/dev/null || echo "")

if echo "$SIGN_RESPONSE" | grep -q "token="; then
    echo "✅"
    PASSED=$((PASSED + 1))
    TOKEN=$(echo "$SIGN_RESPONSE" | grep -o 'token=[^"]*' | cut -d= -f2)
    echo "   📝 Token format: ${TOKEN:0:20}..."
else
    echo "❌"
    FAILED=$((FAILED + 1))
fi
echo ""

# ============================================================================
# 6. PROMETHEUS METRICS
# ============================================================================
echo "6️⃣  Prometheus Metrics"
echo "──────────────────────"

# Prometheus UI redirects (302) to /graph, so accept both 200 and 302
echo -n "   Testing Prometheus UI... "
PROM_UI_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$PROMETHEUS_BASE" 2>/dev/null || echo "HTTP_CODE:000")
PROM_UI_CODE=$(echo "$PROM_UI_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$PROM_UI_CODE" = "200" ] || [ "$PROM_UI_CODE" = "302" ]; then
    echo "✅ ($PROM_UI_CODE)"
    PASSED=$((PASSED + 1))
else
    echo "❌ (Expected 200/302, got $PROM_UI_CODE)"
    FAILED=$((FAILED + 1))
fi

test_endpoint "Prometheus API" "GET" "$PROMETHEUS_BASE/api/v1/query?query=up" "200"

# Check if PulseVault metrics are being scraped
echo -n "   Checking PulseVault metrics in Prometheus... "
METRICS=$(curl -s "$PROMETHEUS_BASE/api/v1/query?query=pulsevault_uploads_total" 2>/dev/null || echo "")
if echo "$METRICS" | grep -q "pulsevault"; then
    echo "✅"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  (Metrics may not be scraped yet)"
fi
echo ""

# ============================================================================
# 7. GRAFANA DASHBOARDS
# ============================================================================
echo "7️⃣  Grafana Dashboards"
echo "──────────────────────"

# Grafana UI redirects (302) to login, so accept both 200 and 302
echo -n "   Testing Grafana UI... "
GRAFANA_UI_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$GRAFANA_BASE" 2>/dev/null || echo "HTTP_CODE:000")
GRAFANA_UI_CODE=$(echo "$GRAFANA_UI_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$GRAFANA_UI_CODE" = "200" ] || [ "$GRAFANA_UI_CODE" = "302" ]; then
    echo "✅ ($GRAFANA_UI_CODE)"
    PASSED=$((PASSED + 1))
else
    echo "❌ (Expected 200/302, got $GRAFANA_UI_CODE)"
    FAILED=$((FAILED + 1))
fi

test_endpoint "Grafana API" "GET" "$GRAFANA_BASE/api/health" "200"
echo ""

# ============================================================================
# 8. LOKI LOG AGGREGATION
# ============================================================================
echo "8️⃣  Loki Log Aggregation"
echo "────────────────────────"

# Wait for Loki to be ready (with retries)
echo -n "   Waiting for Loki to be ready... "
MAX_RETRIES=10
RETRY_COUNT=0
LOKI_READY=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$LOKI_BASE/ready" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        LOKI_READY=1
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

if [ "$LOKI_READY" = "1" ]; then
    echo "✅"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  (Loki not ready after $MAX_RETRIES attempts)"
fi

test_endpoint "Loki health" "GET" "$LOKI_BASE/ready" "200"
test_endpoint "Loki API" "GET" "$LOKI_BASE/loki/api/v1/labels" "200"
echo ""

# ============================================================================
# 9. FULL UPLOAD WORKFLOW (via Nginx)
# ============================================================================
echo "9️⃣  Full Upload Workflow (via Nginx)"
echo "─────────────────────────────────────"

# Test video file
TEST_FILE="/tmp/test-video-real.mp4"
if [ ! -f "$TEST_FILE" ]; then
    echo "   Creating test video..."
    ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=1 \
        -f lavfi -i sine=frequency=1000:duration=5 \
        -c:v libx264 -preset ultrafast -crf 28 \
        -c:a aac -shortest \
        "$TEST_FILE" -y >/dev/null 2>&1 || true
fi

if [ -f "$TEST_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE" 2>/dev/null)
    
    # Create upload via Nginx
    echo -n "   Creating upload via Nginx... "
    UPLOAD_RESPONSE=$(curl -s -i -X POST "$NGINX_BASE/uploads" \
        -H "Upload-Length: $FILE_SIZE" \
        -H "Tus-Resumable: 1.0.0" 2>/dev/null || echo "")
    
    UPLOAD_ID=$(echo "$UPLOAD_RESPONSE" | grep -i "Location:" | sed 's/.*\/uploads\///' | tr -d '\r\n ' || echo "")
    
    if [ -n "$UPLOAD_ID" ]; then
        echo "✅ ($UPLOAD_ID)"
        PASSED=$((PASSED + 1))
        
        # Upload file via Nginx
        echo -n "   Uploading file via Nginx... "
        UPLOAD_RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PATCH "$NGINX_BASE/uploads/$UPLOAD_ID" \
            -H "Content-Type: application/offset+octet-stream" \
            -H "Upload-Offset: 0" \
            -H "Tus-Resumable: 1.0.0" \
            --data-binary "@$TEST_FILE" 2>/dev/null || echo "HTTP_CODE:000")
        
        HTTP_CODE=$(echo "$UPLOAD_RESULT" | grep "HTTP_CODE" | cut -d: -f2)
        if [ "$HTTP_CODE" = "204" ]; then
            echo "✅"
            PASSED=$((PASSED + 1))
        else
            echo "❌ (HTTP $HTTP_CODE)"
            FAILED=$((FAILED + 1))
        fi
    else
        echo "❌"
        FAILED=$((FAILED + 1))
    fi
else
    echo "   ⚠️  Test video not available"
fi
echo ""

# ============================================================================
# 10. NGINX CACHING
# ============================================================================
echo "🔟 Nginx Media Caching"
echo "──────────────────────"

# Test cache headers
echo -n "   Testing cache headers... "
CACHE_HEADERS=$(curl -s -I "$NGINX_BASE/media/videos/test/hls/master.m3u8" 2>/dev/null || echo "")
if echo "$CACHE_HEADERS" | grep -qi "X-Cache-Status"; then
    echo "✅ (Cache headers present)"
    PASSED=$((PASSED + 1))
else
    echo "⚠️  (Cache headers not visible)"
fi
echo ""

# ============================================================================
# 11. SSL/TLS (if configured)
# ============================================================================
echo "1️⃣1️⃣  SSL/TLS Configuration"
echo "───────────────────────────"

if [ -d "nginx/ssl" ] && [ -f "nginx/ssl/cert.pem" ]; then
    echo "   ✅ SSL certificates found"
    PASSED=$((PASSED + 1))
    
    # Test HTTPS endpoint (use -k to accept self-signed certs)
    echo -n "   Testing HTTPS endpoint... "
    HTTPS_RESPONSE=$(curl -s -k -w "\nHTTP_CODE:%{http_code}" "https://localhost/health" 2>/dev/null || echo "HTTP_CODE:000")
    HTTPS_CODE=$(echo "$HTTPS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    if [ "$HTTPS_CODE" = "200" ]; then
        echo "✅ ($HTTPS_CODE)"
        PASSED=$((PASSED + 1))
    else
        echo "⚠️  (HTTP $HTTPS_CODE - may need to accept self-signed cert)"
    fi
else
    echo "   ⚠️  SSL certificates not found (using HTTP only)"
fi
echo ""

# ============================================================================
# 12. AUDIT LOGS
# ============================================================================
echo "1️⃣2️⃣  Audit Logs"
echo "────────────────"

AUDIT_DIR="$PULSEVAULT_TEMP_DIR/audit"
if [ -d "$AUDIT_DIR" ]; then
    LOG_COUNT=$(find "$AUDIT_DIR" -name "*.log" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$LOG_COUNT" -gt 0 ]; then
        echo "   ✅ Audit logs found ($LOG_COUNT files)"
        PASSED=$((PASSED + 1))
        
        # Check log chain integrity (if logs exist)
        LATEST_LOG=$(find "$AUDIT_DIR" -name "*.log" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2- || echo "")
        if [ -n "$LATEST_LOG" ]; then
            echo "   📝 Latest log: $(basename "$LATEST_LOG")"
        fi
    else
        echo "   ⚠️  No audit logs yet"
    fi
else
    echo "   ⚠️  Audit directory not found"
fi
echo ""

# ============================================================================
# 13. TRANSCODE WORKER
# ============================================================================
echo "1️⃣3️⃣  Transcode Worker"
echo "──────────────────────"

# Check for worker containers (may be named pulsevault-transcode-worker-1, etc.)
if docker ps | grep -q "transcode-worker"; then
    echo "   ✅ Worker container(s) running"
    PASSED=$((PASSED + 1))
    
    WORKER_COUNT=$(docker ps | grep "transcode-worker" | wc -l | tr -d ' ')
    echo "   📊 Worker replicas: $WORKER_COUNT"
else
    echo "   ⚠️  Worker container not running"
    FAILED=$((FAILED + 1))
fi
echo ""

# ============================================================================
# 14. STORAGE & PERMISSIONS
# ============================================================================
echo "1️⃣4️⃣  Storage & Permissions"
echo "───────────────────────────"

# Check storage directories inside Docker container
for dir in "/media/uploads" "/media/videos" "/media/audit"; do
    if docker compose exec -T pulsevault test -d "$dir" 2>/dev/null; then
        echo "   ✅ $(basename "$dir") directory exists (in Docker)"
        PASSED=$((PASSED + 1))
    else
        echo "   ❌ $(basename "$dir") directory missing (in Docker)"
        FAILED=$((FAILED + 1))
    fi
done
echo ""

# ============================================================================
# 15. ENVIRONMENT VARIABLES
# ============================================================================
echo "1️⃣5️⃣  Environment Configuration"
echo "───────────────────────────────"

if [ -f "pulsevault/.env" ]; then
    echo "   ✅ .env file exists"
    PASSED=$((PASSED + 1))
    
    # Check critical variables
    REQUIRED_VARS=("HMAC_SECRET" "REDIS_HOST" "VIDEO_DIR")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" pulsevault/.env; then
            echo "   ✅ $var is set"
            PASSED=$((PASSED + 1))
        else
            echo "   ⚠️  $var not found in .env"
        fi
    done
else
    echo "   ❌ .env file not found"
    FAILED=$((FAILED + 1))
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "════════════════════════════════════════════════════════════"
echo "📊 Test Summary"
echo "════════════════════════════════════════════════════════════"
echo "   ✅ Passed: $PASSED"
echo "   ❌ Failed: $FAILED"
TOTAL=$((PASSED + FAILED))
if [ "$TOTAL" -gt 0 ]; then
    PERCENTAGE=$((PASSED * 100 / TOTAL))
    echo "   📈 Success Rate: $PERCENTAGE%"
fi
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Review the output above."
    exit 1
fi

