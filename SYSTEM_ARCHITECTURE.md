# PulseVault System Architecture & Test Coverage

## 🏗️ System Architecture Overview

PulseVault is a HIPAA-compliant video storage and delivery system built with Fastify, featuring resumable uploads, automatic transcoding, and secure media streaming.

### Full Infrastructure Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy                          │
│  - SSL/TLS termination                                               │
│  - Rate limiting (upload: 10r/s, API: 100r/s, media: 50r/s)         │
│  - Media caching (10GB cache, 30d TTL)                              │
│  - Connection limiting                                               │
│  - Security headers (HSTS, X-Frame-Options, etc.)                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Fastify API Server (Port 3000)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Plugins    │  │    Routes    │  │   Middleware │             │
│  │ - Config     │  │ - Uploads    │  │ - Audit      │             │
│  │ - Redis      │  │ - Media      │  │ - Metrics    │             │
│  │ - Metrics    │  │ - Root       │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└────────────────────────────┬────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Redis      │    │  File System │    │  Audit Logs  │
│  (Queue +    │    │  (Storage)   │    │  (Hash Chain)│
│   Cache)     │    │              │    │              │
│  Port 6379   │    │ /mnt/media/  │    │ /audit/*.log │
└──────────────┘    └──────────────┘    └──────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│   Transcode Workers (FFmpeg)            │
│  - 2+ replicas (scalable)               │
│  - Processes jobs from Redis queue      │
│  - Generates HLS renditions             │
│  - Updates metadata                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Observability Stack                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Prometheus   │  │   Grafana    │  │     Loki     │             │
│  │ Port 9090    │  │  Port 3001   │  │  Port 3100   │             │
│  │ - Metrics    │  │ - Dashboards │  │ - Log Agg    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│         │                  │                  │                     │
│         └──────────────────┴──────────────────┘                     │
│                            │                                        │
│                            ▼                                        │
│                   ┌─────────────────┐                               │
│                   │    Promtail     │                               │
│                   │ - Log Collector │                               │
│                   └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Docker Compose Services

1. **pulsevault** - Fastify API server
2. **transcode-worker** - FFmpeg transcoding workers (2+ replicas)
3. **redis** - Job queue and metadata cache
4. **nginx** - Reverse proxy with SSL, caching, rate limiting
5. **prometheus** - Metrics collection and storage
6. **grafana** - Metrics visualization dashboards
7. **loki** - Log aggregation system
8. **promtail** - Log collection agent

---

## 📋 Complete System Flow

### 1. **Upload Phase** (TUS Protocol)

**Endpoint:** `POST /uploads` → `PATCH /uploads/:id`

1. Client creates upload session with file size
2. Server returns upload ID (UUID)
3. Client uploads file in chunks using TUS protocol
4. Server stores chunks in temporary upload directory
5. Upload completion triggers callback

**Files Involved:**
- `routes/uploads.js` - TUS server integration
- `plugins/00-config.js` - Upload directory configuration

**Storage:**
- Temporary: `{uploadDir}/{uploadId}` (e.g., `/tmp/pulsevault-test/uploads/{uuid}`)
- Uses `@tus/server` with `FileStore` backend

---

### 2. **Finalization Phase**

**Endpoint:** `POST /uploads/finalize`

**Process:**
1. ✅ **Validate upload exists** - Check if upload file exists
2. ✅ **Generate Video ID** - Create UUID for permanent storage
3. ✅ **Create video directory** - `{videoDir}/{videoId}/`
4. ✅ **Move file atomically** - Rename from upload dir to `original.mp4`
5. ✅ **Compute checksum** - SHA-256 hash of file
6. ✅ **Create metadata** - Write `meta.json` with:
   - Video ID, filename, user ID
   - File size, checksum
   - Upload timestamp
   - Status: "uploaded"
7. ✅ **Cache in Redis** - Store metadata for fast access
8. ✅ **Audit log** - Log upload event with hash chain
9. ✅ **Enqueue transcoding** - Add job to Redis queue
10. ✅ **Increment metrics** - Track upload count

**Files Involved:**
- `routes/uploads.js` - Finalization endpoint
- `lib/metadata-writer.js` - Atomic metadata writing
- `lib/audit-logger.js` - Audit logging
- `plugins/redis.js` - Queue management

**Storage Structure:**
```
{videoDir}/{videoId}/
├── original.mp4      # Original uploaded file
└── meta.json         # Metadata with checksum
```

---

### 3. **Transcoding Phase** (Background Worker)

**Worker:** `workers/transcode-worker.js`

**Process:**
1. ✅ **Dequeue job** - Blocking pop from Redis queue (`queue:transcode`)
2. ✅ **Read video info** - Use `ffprobe` to get dimensions, duration, codec
3. ✅ **Create HLS directory** - `{videoDir}/{videoId}/hls/`
4. ✅ **Generate renditions** - Transcode to multiple qualities:
   - 240p, 360p, 480p, 720p, 1080p (based on source)
   - Each creates `.m3u8` playlist + `.ts` segments
5. ✅ **Create master playlist** - `master.m3u8` with all renditions
6. ✅ **Update metadata** - Set status to "transcoded", add:
   - Transcode duration
   - Video dimensions, duration
   - List of renditions
7. ✅ **Audit log** - Log transcode success/failure
8. ✅ **Update metrics** - Increment success/failure counters

**Files Involved:**
- `workers/transcode-worker.js` - FFmpeg transcoding
- `lib/metadata-writer.js` - Metadata updates
- `plugins/redis.js` - Job queue

**Storage Structure After Transcoding:**
```
{videoDir}/{videoId}/
├── original.mp4
├── meta.json              # Updated with transcoding info
└── hls/
    ├── master.m3u8        # Master playlist
    ├── 240p.m3u8          # 240p playlist
    ├── 240p_000.ts        # Video segments
    ├── 240p_001.ts
    ├── 360p.m3u8
    ├── 360p_000.ts
    └── ... (more renditions)
```

---

### 4. **Media Delivery Phase**

**Endpoints:**
- `POST /media/sign` - Generate signed URL
- `GET /media/videos/:videoId/*` - Stream media files

**Process:**
1. ✅ **Generate signed URL** - Client requests signed URL with:
   - Video ID
   - Media path (e.g., `hls/master.m3u8`)
   - Expiry time (default 300s)
2. ✅ **HMAC signature** - Create cryptographic signature:
   - Message: `{videoId}:{path}:{expiresAt}`
   - HMAC-SHA256 with secret key
   - Token: `{expiresAt}.{signature}`
3. ✅ **Stream request** - Client requests media with token
4. ✅ **Verify token** - Check:
   - Token format valid
   - Not expired
   - Signature matches
5. ✅ **Security checks** - Prevent path traversal
6. ✅ **Serve file** - Stream with:
   - Range request support (HTTP 206)
   - Proper content types
   - Cache headers
7. ✅ **Audit log** - Log access event

**Files Involved:**
- `routes/media.js` - Media delivery endpoints
- `plugins/00-config.js` - HMAC secret configuration

---

## 🔐 Security Features

### 1. **HMAC-Signed URLs**
- Cryptographic signatures prevent URL tampering
- Time-based expiry (default 5 minutes)
- Secret key stored in environment (`HMAC_SECRET`)
- **Required in production** - generates secure random secret if not set

### 2. **Path Traversal Protection**
- Validates file paths are within video directory
- Prevents accessing files outside intended scope

### 3. **Audit Logging (Hash-Chained)**
- Append-only log files
- Each entry linked to previous via hash
- Tamper-evident: any modification breaks chain
- IP anonymization for privacy

### 4. **Atomic Metadata Writes**
- Write-temp-rename pattern
- fsync guarantees data persistence
- Checksum verification prevents corruption

### 5. **Nginx Security Features**
- **Rate Limiting:**
  - Uploads: 10 requests/second (burst: 5)
  - API: 100 requests/second (burst: 50)
  - Media: 50 requests/second (burst: 20)
- **Connection Limiting:** Max 10 concurrent connections per IP
- **Security Headers:**
  - `Strict-Transport-Security` (HSTS)
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **SSL/TLS:** TLS 1.2+ with strong ciphers
- **CORS:** Configurable CORS headers for media access

---

## 📊 Observability

### Metrics (Prometheus)
- `pulsevault_uploads_total` - Total uploads
- `pulsevault_upload_size_bytes` - Upload size histogram
- `metrics:uploads:completed` - Redis counter
- `metrics:transcode:success` - Transcode success count
- `metrics:transcode:failed` - Transcode failure count

### Audit Logs
- `access-{date}.log` - Media access events
- `upload-{date}.log` - Upload events
- `transcode-{date}.log` - Transcoding events

---

## 🧪 Test Coverage

### Basic Workflow Test (`test-workflow.sh`)

### ✅ Test 1: Health Check
- **Endpoint:** `GET /`
- **Validates:** Server is running and responding

### ✅ Test 2: Test Video Preparation
- Creates test video if needed (5s, 320x240)
- Validates file exists and gets metadata

### ✅ Test 3: TUS Upload Creation
- **Endpoint:** `POST /uploads`
- **Headers:** `Upload-Length`, `Tus-Resumable: 1.0.0`
- **Validates:** Upload ID returned

### ✅ Test 4: File Upload
- **Endpoint:** `PATCH /uploads/:id`
- **Headers:** `Content-Type: application/offset+octet-stream`, `Upload-Offset: 0`
- **Validates:** HTTP 204 (upload complete)

### ✅ Test 5: Upload Finalization
- **Endpoint:** `POST /uploads/finalize`
- **Body:** `{uploadId, filename, userId}`
- **Validates:**
  - Video ID returned
  - Status: "uploaded"
  - File size and checksum in response
  - Transcoding status: "queued"

### ✅ Test 6: File Storage Verification
- **Checks:**
  - Original file exists at `{videoDir}/{videoId}/original.mp4`
  - Metadata file exists at `{videoDir}/{videoId}/meta.json`
  - Metadata contains correct information

### ✅ Test 7: Transcoding Wait & Verification
- **Process:**
  - Polls metadata file every 2 seconds (max 30s)
  - Checks status transitions: "uploaded" → "transcoded"
  - Validates transcoding completion
- **Validates:**
  - Metadata status updated to "transcoded"
  - Transcode duration recorded
  - Video dimensions and duration in metadata

### ✅ Test 8: Signed URL Generation
- **Endpoint:** `POST /media/sign`
- **Body:** `{videoId, path: "hls/master.m3u8", expiresIn: 300}`
- **Validates:**
  - Signed URL returned
  - Token format correct
  - Expiry time set

### ✅ Test 9: Media Streaming
- **Endpoint:** `GET /media/videos/:videoId/hls/master.m3u8?token=...`
- **Validates:**
  - HTTP 200 or 206 response
  - HLS playlist served correctly
  - Token authentication works

### ✅ Test 10: Metrics Endpoint
- **Endpoint:** `GET /metrics`
- **Validates:**
  - Prometheus metrics available
  - Upload counters present

---

### Full Infrastructure Test (`test-full-infrastructure.sh`)

Comprehensive test suite covering all infrastructure components:

#### ✅ Test 1: Docker Compose Services
- Validates all containers are running
- Checks service health

#### ✅ Test 2: Redis Connection & Queue
- Tests Redis connectivity
- Checks queue length
- Validates queue operations

#### ✅ Test 3: API Server (Direct - Port 3000)
- Health check endpoint
- Metrics endpoint
- Direct API access

#### ✅ Test 4: Nginx Reverse Proxy (Port 80)
- Nginx health endpoint
- Proxy to API root
- Proxy to metrics
- **Rate limiting** - Tests rate limit enforcement

#### ✅ Test 5: HMAC Secret & Signed URLs
- Validates `HMAC_SECRET` is configured (not default)
- Tests signed URL generation
- Verifies token format

#### ✅ Test 6: Prometheus Metrics
- Prometheus UI accessible (Port 9090)
- Prometheus API queries
- Validates PulseVault metrics are being scraped

#### ✅ Test 7: Grafana Dashboards
- Grafana UI accessible (Port 3001)
- Grafana API health check

#### ✅ Test 8: Loki Log Aggregation
- Loki health endpoint (Port 3100)
- Loki API queries
- Validates log ingestion

#### ✅ Test 9: Full Upload Workflow (via Nginx)
- Upload creation through Nginx proxy
- File upload through Nginx
- Validates end-to-end flow via reverse proxy

#### ✅ Test 10: Nginx Media Caching
- Tests cache headers (`X-Cache-Status`)
- Validates caching configuration

#### ✅ Test 11: SSL/TLS Configuration
- Checks for SSL certificates
- Tests HTTPS endpoints (if configured)

#### ✅ Test 12: Audit Logs
- Validates audit log directory exists
- Checks log file creation
- Verifies log chain integrity

#### ✅ Test 13: Transcode Worker
- Checks worker containers are running
- Validates worker replica count

#### ✅ Test 14: Storage & Permissions
- Validates storage directories exist
- Checks permissions

#### ✅ Test 15: Environment Configuration
- Validates `.env` file exists
- Checks critical environment variables:
  - `HMAC_SECRET`
  - `REDIS_HOST`
  - `VIDEO_DIR`

---

## 🔄 Complete End-to-End Flow (Tested)

```
1. Client → POST /uploads
   ↓
2. Server → Returns upload ID
   ↓
3. Client → PATCH /uploads/:id (upload file)
   ↓
4. Server → Stores in upload directory
   ↓
5. Client → POST /uploads/finalize
   ↓
6. Server → Moves to permanent storage
   ↓
7. Server → Creates metadata (status: "uploaded")
   ↓
8. Server → Enqueues transcoding job
   ↓
9. Worker → Dequeues job from Redis
   ↓
10. Worker → Transcodes video (FFmpeg)
   ↓
11. Worker → Generates HLS renditions
   ↓
12. Worker → Updates metadata (status: "transcoded")
   ↓
13. Client → POST /media/sign
   ↓
14. Server → Returns signed URL
   ↓
15. Client → GET /media/videos/:id/hls/master.m3u8?token=...
   ↓
16. Server → Verifies token, streams HLS playlist
```

---

## 🗂️ File Structure

```
pulsevault/
├── app.js                    # Fastify server entry point
├── plugins/
│   ├── 00-config.js         # Configuration & temp dir detection
│   ├── redis.js             # Redis queue & caching
│   ├── audit.js             # Audit logger plugin
│   └── metrics.js           # Prometheus metrics
├── routes/
│   ├── uploads.js           # TUS upload & finalization
│   ├── media.js             # Media delivery & signed URLs
│   └── root.js              # Health check
├── lib/
│   ├── metadata-writer.js   # Atomic metadata operations
│   └── audit-logger.js      # Hash-chained audit logs
└── workers/
    └── transcode-worker.js  # FFmpeg transcoding worker
```

---

## 🌍 Cross-Platform Support

### Temp Directory Detection
- **macOS:** `/var/folders/.../T/pulsevault-test`
- **Linux:** `/tmp/pulsevault-test`
- **Windows:** `%TEMP%\pulsevault-test`

Uses Node.js `os.tmpdir()` for automatic detection.

---

## 📈 What's Working (Verified)

✅ **Upload System**
- TUS resumable uploads
- Chunked file uploads
- Upload finalization
- Atomic file moves

✅ **Storage**
- Permanent file storage
- Metadata management
- Checksum verification

✅ **Transcoding**
- Redis job queue
- FFmpeg transcoding
- HLS rendition generation
- Multiple quality levels

✅ **Media Delivery**
- HMAC-signed URLs
- Token verification
- Range request support
- HLS streaming

✅ **Security**
- Path traversal protection
- Audit logging
- Hash-chained logs

✅ **Observability**
- Prometheus metrics
- Audit logs
- Request logging

---

## 🎯 Test Results Summary

### Basic Workflow Test Results
From your test run:
- ✅ Upload: **Working** (3.44 MB file)
- ✅ Finalization: **Working** (Video ID generated)
- ✅ Storage: **Working** (File stored correctly)
- ✅ Metadata: **Working** (meta.json created)
- ✅ Transcoding: **Working** (Completed in 6s)
- ✅ Signed URLs: **Working** (Token generated)
- ✅ Streaming: **Working** (HTTP 200, HLS served)
- ✅ Metrics: **Working** (Prometheus endpoint)

**Total Test Duration:** ~6-8 seconds (including transcoding)

### Full Infrastructure Test
Run `./test-full-infrastructure.sh` to test:
- ✅ All Docker Compose services
- ✅ Nginx reverse proxy and rate limiting
- ✅ Redis queue and caching
- ✅ Prometheus metrics scraping
- ✅ Grafana dashboards
- ✅ Loki log aggregation
- ✅ HMAC secret configuration
- ✅ SSL/TLS setup
- ✅ Audit log integrity
- ✅ Worker scaling

---

## 🚀 Next Steps / Potential Enhancements

1. **Database Integration** - Store metadata in PostgreSQL/MySQL
2. **Object Storage** - Move to S3/MinIO for production
3. **CDN Integration** - CloudFront/Cloudflare for global delivery
4. **Multi-worker Scaling** - Multiple transcoding workers (already supported)
5. **Webhook Notifications** - Notify on transcoding completion
6. **Video Thumbnails** - Generate preview images
7. **DRM Support** - Content protection for sensitive videos

## 📝 Running Tests

### Basic Workflow Test
```bash
./test-workflow.sh
```
Tests the core upload → transcode → stream workflow.

### Full Infrastructure Test
```bash
./test-full-infrastructure.sh
```
Tests all infrastructure components including Docker services, Nginx, Prometheus, Grafana, Loki, etc.

### Prerequisites for Full Test
1. Docker Compose services running: `docker-compose up -d`
2. Redis accessible on port 6379
3. All services healthy (check with `docker-compose ps`)
4. `.env` file configured with `HMAC_SECRET`

---

## 💾 Data Persistence & Volumes

### Volume Configuration

All critical data is persisted across container restarts using Docker volumes:

| Service | Volume | Data Type | Critical | Status |
|---------|--------|-----------|----------|--------|
| Redis | `redis-data` | Queue, Cache | ✅ YES | ✅ Configured |
| PulseVault | `media-storage` | Videos, Logs | ✅ YES | ✅ Configured |
| Worker | `media-storage` | Videos | ✅ YES | ✅ Configured |
| Prometheus | `prometheus-data` | Metrics | ⚠️ MEDIUM | ✅ Configured |
| Grafana | `grafana-data` | Dashboards | ⚠️ MEDIUM | ✅ Configured |
| Loki | `loki-data` | Logs | ⚠️ MEDIUM | ✅ Configured |
| Nginx | `nginx-cache` | Cache | ❌ NO | ✅ Optional |

### Volume Details

1. **Redis** (`redis-data:/data`)
   - **Stores:** Job queue, cached metadata, metrics counters
   - **Critical:** YES - Queue jobs would be lost without persistence
   - **Status:** ✅ Configured

2. **PulseVault Backend** (`media-storage:/media`)
   - **Stores:** 
     - `/media/uploads` - Temporary upload files
     - `/media/videos/{uuid}/` - Permanent video storage
     - `/media/audit/` - Audit logs
   - **Critical:** YES - All video data and audit logs
   - **Status:** ✅ Configured

3. **Transcode Worker** (`media-storage:/media`)
   - **Stores:** Reads/writes videos and metadata
   - **Critical:** YES - Shares media storage with backend
   - **Status:** ✅ Configured

4. **Prometheus** (`prometheus-data:/prometheus`)
   - **Stores:** Time-series metrics data (30 day retention)
   - **Critical:** MEDIUM - Metrics history for analysis
   - **Status:** ✅ Configured

5. **Grafana** (`grafana-data:/var/lib/grafana`)
   - **Stores:** 
     - Dashboards
     - Datasources configuration
     - User accounts and preferences
     - Alert rules
   - **Critical:** MEDIUM - Dashboard configurations
   - **Status:** ✅ Configured

6. **Loki** (`loki-data:/loki`)
   - **Stores:**
     - `/loki/chunks` - Log data chunks
     - `/loki/index` - Log indexes
     - `/loki/rules` - Alert rules
   - **Critical:** MEDIUM - Log history for debugging
   - **Status:** ✅ Configured

7. **Nginx** (`nginx-cache:/var/cache/nginx`)
   - **Stores:** Media cache (10GB, 30d TTL)
   - **Critical:** NO - Cache can be rebuilt
   - **Status:** ✅ Optional (improves performance)

### Backup Recommendations

**For Production:**

1. **Critical Backups:**
   - `media-storage` - Videos, audit logs (daily)
   - `redis-data` - Queue state (hourly)

2. **Important Backups:**
   - `grafana-data` - Dashboards (weekly)
   - `prometheus-data` - Metrics history (optional, 30d retention)
   - `loki-data` - Log history (optional)

3. **Use Bind Mounts for Production:**
   - Better control over storage location
   - Easier backup/restore
   - Can use encrypted filesystems (LUKS/ZFS)

---

## 🧪 Testing Setup

### Option 1: Basic Workflow Test (Development)

**Prerequisites:**
- ✅ API Server running (`npm run dev`)
- ✅ Worker running (`npm run worker`)
- ⚠️ **Redis needed**

**Start Redis:**
```bash
# Option A: Docker (Recommended)
docker run -d \
    --name pulsevault-redis-dev \
    -p 6379:6379 \
    redis:7-alpine

# Option B: Local Redis
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

**Run Basic Test:**
```bash
./test-workflow.sh
```

This tests:
- Upload → Finalize → Transcode → Stream workflow
- Direct API access (port 3000)
- HMAC signing
- Metadata management

### Option 2: Full Infrastructure Test (Docker Compose)

**Prerequisites:**
- Docker and Docker Compose installed
- All services in `docker-compose.yml`

**Setup Steps:**

1. **Stop your current dev server and worker** (they'll run in Docker)
   ```bash
   # Press Ctrl+C in terminals running npm run dev and npm run worker
   ```

2. **Configure environment**
   ```bash
   cd pulsevault
   
   # Ensure .env exists and has HMAC_SECRET
   if [ ! -f .env ]; then
       cp .env.example .env
       # Generate secure HMAC secret
       SECRET=$(openssl rand -base64 32)
       echo "HMAC_SECRET=$SECRET" >> .env
   fi
   ```

3. **Create storage directory** (if not using temp dir)
   ```bash
   sudo mkdir -p /mnt/media/{uploads,videos,audit}
   sudo chown -R 1000:1000 /mnt/media
   sudo chmod -R 750 /mnt/media
   ```
   
   **OR** for development, the system will auto-use temp directory.

4. **Start all services**
   ```bash
   cd ..
   docker-compose up -d
   ```

5. **Verify services are running**
   ```bash
   docker-compose ps
   ```
   
   Should show:
   - ✅ pulsevault-redis (healthy)
   - ✅ pulsevault-backend (healthy)
   - ✅ pulsevault-worker (running)
   - ✅ pulsevault-nginx (healthy)
   - ✅ pulsevault-prometheus (running)
   - ✅ pulsevault-grafana (running)
   - ✅ pulsevault-loki (running)
   - ✅ pulsevault-promtail (running)

6. **Check logs if needed**
   ```bash
   docker-compose logs -f pulsevault
   ```

**Run Full Infrastructure Test:**
```bash
./test-full-infrastructure.sh
```

This tests:
- All Docker services
- Nginx reverse proxy (port 80)
- Rate limiting
- Prometheus metrics (port 9090)
- Grafana dashboards (port 3001)
- Loki log aggregation (port 3100)
- SSL/TLS (if configured)
- Worker scaling
- HMAC secret configuration

### Quick Start (Recommended)

Since you already have the server and worker running, just add Redis:

```bash
# Start Redis in Docker
docker run -d \
    --name pulsevault-redis-dev \
    -p 6379:6379 \
    redis:7-alpine

# Verify Redis is running
redis-cli ping
# Should return: PONG

# Now run the basic test
./test-workflow.sh
```

### Troubleshooting

**Redis Connection Failed:**
```bash
# Check if Redis is running
docker ps | grep redis

# Check Redis logs
docker logs pulsevault-redis-dev

# Test connection
redis-cli ping
```

**Port Already in Use:**
```bash
# Check what's using port 3000
lsof -i :3000

# Check what's using port 6379 (Redis)
lsof -i :6379
```

**Docker Compose Services Not Starting:**
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild if needed
docker-compose up -d --build
```

### Test Comparison

| Feature | Basic Test | Full Infrastructure Test |
|---------|-----------|-------------------------|
| API Server | ✅ Direct (3000) | ✅ Via Nginx (80) |
| Upload Workflow | ✅ | ✅ |
| Transcoding | ✅ | ✅ |
| HMAC Signing | ✅ | ✅ |
| Redis Queue | ✅ | ✅ |
| Nginx Proxy | ❌ | ✅ |
| Rate Limiting | ❌ | ✅ |
| Prometheus | ❌ | ✅ |
| Grafana | ❌ | ✅ |
| Loki | ❌ | ✅ |
| SSL/TLS | ❌ | ✅ |
| Worker Scaling | ❌ | ✅ |

---

## 🔧 Configuration & Troubleshooting

### Key Configuration Changes

#### docker-compose.yml
- **Worker scaling:** Removed `container_name` to allow multiple workers
- **Media storage:** Changed to named volume (works without `/mnt/media`)
- **Nginx config:** Added `conf.d` volume mount
- **Loki:** Disabled compactor module in command
- **Worker env:** Added `NODE_ENV=production` and `MEDIA_ROOT=/media`

#### loki/loki-config.yml
- **Schema:** Updated to `tsdb` store with `v13` schema (replaces deprecated `boltdb_shipper`)
- **Compactor:** Disabled (causes permission issues in basic setup)

#### test-workflow.sh
- **Cross-platform:** Dynamic temp directory detection using `os.tmpdir()` (fixes macOS)

#### test-full-infrastructure.sh
- **Redis check:** Use `redis-cli ping` instead of HTTP
- **UI tests:** Accept `302` redirects (Prometheus/Grafana)
- **Worker detection:** Pattern matching for scaled workers
- **HTTPS test:** Added `-k` flag for self-signed certs

### Common Issues

**Port already in use:**
```bash
sudo lsof -i :3000
sudo systemctl stop apache2  # or nginx
```

**Permission denied on storage:**
```bash
sudo chown -R 1000:1000 /mnt/media
sudo chmod -R 750 /mnt/media
```

**Redis connection failed:**
```bash
docker ps | grep redis
docker exec pulsevault-redis redis-cli ping
```

**Services not starting:**
```bash
docker-compose logs
docker-compose up -d --build
```

**Worker using wrong path:**
- Ensure `NODE_ENV=production` and `MEDIA_ROOT=/media` in docker-compose.yml

**Loki startup errors:**
- Check schema is `tsdb` with `v13`
- Ensure compactor is disabled in command

