# PulseVault Backend - Deployment Guide

## Overview

PulseVault is a HIPAA-compliant video storage and delivery system designed for self-hosted deployment. It provides:

- **Resumable uploads** via tus protocol
- **Secure media delivery** with HMAC-signed URLs
- **Adaptive transcoding** (HLS/DASH with multiple renditions)
- **Atomic metadata** with checksums
- **Audit logging** with hash-chained entries
- **Observability** via Prometheus, Grafana, Loki, and Tempo

---

## Prerequisites

### Hardware Requirements

**Minimum (Development)**
- 4 CPU cores
- 8 GB RAM
- 100 GB SSD storage
- 100 Mbps network

**Recommended (Production)**
- 8+ CPU cores
- 16+ GB RAM
- 1+ TB SSD/NVMe storage (LUKS/ZFS encrypted)
- 1+ Gbps network
- GPU (optional, for hardware-accelerated transcoding)

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for local development)
- FFmpeg 4.4+ (included in Docker images)
- Redis 7+ (included in Docker Compose)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mieweb/pulsevault.git
cd pulsevault
```

### 2. Configure Environment

```bash
cd pulsevault
cp .env.example .env
```

Edit `.env` and set at minimum:

```bash
HMAC_SECRET=your-secure-random-secret-here
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

### 3. Create Storage Directories

```bash
sudo mkdir -p /mnt/media/{uploads,videos,audit}
sudo chown -R 1000:1000 /mnt/media
sudo chmod -R 750 /mnt/media
```

For encrypted storage (recommended):

```bash
# Create LUKS-encrypted volume
sudo cryptsetup luksFormat /dev/sdX
sudo cryptsetup open /dev/sdX pulsevault-media
sudo mkfs.ext4 /dev/mapper/pulsevault-media
sudo mount /dev/mapper/pulsevault-media /mnt/media
```

### 4. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f pulsevault
```

### 5. Verify Installation

```bash
# Check API health
curl http://localhost:3000/

# Check metrics
curl http://localhost:3000/metrics

# Check Prometheus
open http://localhost:9090

# Check Grafana
open http://localhost:3001
# Default credentials: admin/admin
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `NODE_ENV` | `development` | Environment (production/development) |
| `MEDIA_ROOT` | `/mnt/media` | Root media directory |
| `UPLOAD_DIR` | `/mnt/media/uploads` | Upload staging directory |
| `VIDEO_DIR` | `/mnt/media/videos` | Permanent video storage |
| `AUDIT_DIR` | `/mnt/media/audit` | Audit log directory |
| `HMAC_SECRET` | ⚠️ **Required** | Secret for signed URLs |
| `TOKEN_EXPIRY_SECONDS` | `300` | URL token expiry (5 min) |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | _(empty)_ | Redis password |
| `REDIS_DB` | `0` | Redis database number |
| `METADATA_DSN` | _(empty)_ | Optional database mirror DSN |
| `TRANSCODE_ENABLED` | `true` | Enable transcoding |
| `FFMPEG_THREADS` | `0` | FFmpeg thread count (0=auto) |
| `RENDITIONS` | `240p,360p,480p,720p,1080p` | Video renditions |
| `ENABLE_HEVC` | `false` | Enable HEVC codec |
| `ENABLE_AV1` | `false` | Enable AV1 codec |
| `METRICS_ENABLED` | `true` | Enable Prometheus metrics |
| `LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |

---

## Architecture

### Data Flow

```
Upload → tus-node-server → Staging (/uploads)
  ↓
Finalize → Atomic Move → Permanent Storage (/videos/<uuid>/)
  ↓                         ├── original.mp4
  ├── Write meta.json       ├── meta.json
  ├── Compute checksum      └── hls/
  ├── Audit log                 ├── master.m3u8
  └── Enqueue transcode         ├── 240p.m3u8
                                ├── 360p.m3u8
                                └── ...
        ↓
Worker → Redis Queue → FFmpeg → HLS/DASH Renditions
  ↓
Update meta.json → Cache metadata → Audit log
```

### Storage Layout

```
/mnt/media/
  uploads/                  # Temporary uploads (auto-cleanup)
    <upload-id>
  videos/                   # Permanent storage
    <video-uuid>/
      original.mp4          # Original uploaded file
      meta.json             # Canonical metadata (checksummed)
      meta.tmp.json         # Temporary during writes
      hls/                  # HLS renditions
        master.m3u8         # Master playlist
        240p.m3u8           # 240p playlist
        240p_000.ts         # 240p segments
        240p_001.ts
        ...
        360p.m3u8
        ...
  audit/                    # Append-only audit logs
    access-2024-12-18.log   # Hash-chained access logs
    upload-2024-12-18.log   # Hash-chained upload logs
    transcode-2024-12-18.log
```

---

## API Reference

### Upload Endpoints

#### `POST /uploads`

Start a resumable upload (tus protocol).

**Headers:**
- `Upload-Length`: File size in bytes
- `Tus-Resumable`: `1.0.0`

**Response:** `201 Created`
- `Location`: Upload URL

#### `PATCH /uploads/<id>`

Upload file chunks.

**Headers:**
- `Upload-Offset`: Current offset
- `Content-Type`: `application/offset+octet-stream`
- `Tus-Resumable`: `1.0.0`

**Response:** `204 No Content`

#### `POST /uploads/finalize`

Finalize upload and move to permanent storage.

**Body:**
```json
{
  "uploadId": "uuid",
  "filename": "video.mp4",
  "userId": "user-123",
  "metadata": {
    "title": "My Video",
    "description": "..."
  }
}
```

**Response:** `200 OK`
```json
{
  "videoId": "uuid",
  "status": "uploaded",
  "size": 12345678,
  "checksum": "sha256...",
  "transcoding": "queued"
}
```

### Media Endpoints

#### `POST /media/sign`

Generate a signed URL for media access.

**Body:**
```json
{
  "videoId": "uuid",
  "path": "hls/master.m3u8",
  "expiresIn": 300
}
```

**Response:**
```json
{
  "url": "/media/videos/uuid/hls/master.m3u8?token=...",
  "expiresAt": "2024-12-18T12:00:00Z",
  "expiresIn": 300
}
```

#### `GET /media/videos/:videoId/:path?token=<token>`

Stream media file with range request support.

**Headers:**
- `Range`: `bytes=0-1023` (optional)

**Response:** `200 OK` or `206 Partial Content`

#### `GET /media/videos/:videoId/metadata?token=<token>`

Get video metadata.

**Response:**
```json
{
  "videoId": "uuid",
  "filename": "video.mp4",
  "status": "transcoded",
  "uploadedAt": "2024-12-18T12:00:00Z",
  "duration": 120.5,
  "width": 1920,
  "height": 1080,
  "renditions": ["240p", "360p", "480p", "720p", "1080p"]
}
```

#### `GET /media/videos/:videoId/renditions?token=<token>`

List available renditions.

**Response:**
```json
{
  "renditions": ["240p", "360p", "480p", "720p", "1080p"],
  "status": "ready",
  "masterPlaylist": "hls/master.m3u8"
}
```

---

## Security

### HIPAA Compliance Checklist

- [ ] **Encryption in Transit**
  - [ ] TLS 1.2+ on all endpoints
  - [ ] Valid SSL certificates
  - [ ] HSTS headers enabled

- [ ] **Encryption at Rest**
  - [ ] LUKS/ZFS encrypted volumes
  - [ ] Encrypted database (if used)
  - [ ] Secure key management

- [ ] **Access Control**
  - [ ] HMAC-signed URLs (≤300s expiry)
  - [ ] JWT authentication (implement in auth middleware)
  - [ ] Role-based access control

- [ ] **Audit Logging**
  - [ ] Hash-chained append-only logs
  - [ ] Daily log rotation
  - [ ] No PHI in logs (UUIDs only)
  - [ ] IP anonymization

- [ ] **Data Minimization**
  - [ ] UUID-only filenames
  - [ ] No PHI in URLs or logs
  - [ ] Metadata stored on disk (source of truth)

- [ ] **Infrastructure**
  - [ ] Self-hosted (no cloud)
  - [ ] Isolated network
  - [ ] Firewall rules
  - [ ] Regular security updates

- [ ] **Monitoring**
  - [ ] Failed access attempts
  - [ ] Anomalous traffic patterns
  - [ ] Disk space alerts
  - [ ] Service health checks

---

## Operations

### Backup and Recovery

#### Backup Strategy

```bash
# Backup metadata (lightweight)
rsync -av /mnt/media/videos/*/meta.json /backup/metadata/

# Backup audit logs (critical)
rsync -av /mnt/media/audit/ /backup/audit/

# Backup videos (large, consider incremental)
rsync -av --exclude='hls/' /mnt/media/videos/ /backup/videos/
```

#### Restore Procedure

```bash
# Restore videos
rsync -av /backup/videos/ /mnt/media/videos/

# Re-enqueue transcoding if needed
node scripts/requeue-transcodes.js
```

### Monitoring

#### Key Metrics

- `pulsevault_uploads_total` - Total uploads
- `pulsevault_transcodes_total` - Total transcodes
- `pulsevault_queue_length` - Jobs in queue
- `http_request_duration_seconds` - Request latency

#### Alerts

Set up alerts for:
- Queue length > 100 (backlog building)
- Disk usage > 85%
- High error rate (>5% 5xx responses)
- Failed transcodes
- Redis down

### Scaling

#### Horizontal Scaling

```yaml
# docker-compose.yml
transcode-worker:
  deploy:
    replicas: 4  # Scale workers
```

#### Vertical Scaling

- Increase `FFMPEG_THREADS`
- Add GPU for hardware encoding
- Increase worker memory/CPU limits

---

## Troubleshooting

### Upload Fails

**Symptom:** Upload returns 500 error

**Checks:**
1. Disk space: `df -h /mnt/media`
2. Permissions: `ls -la /mnt/media/uploads`
3. Redis: `docker-compose logs redis`

### Transcode Stuck

**Symptom:** Videos remain in "uploaded" status

**Checks:**
1. Worker running: `docker-compose ps transcode-worker`
2. Queue length: `redis-cli LLEN queue:transcode`
3. Worker logs: `docker-compose logs transcode-worker`

### Media Not Playing

**Symptom:** 403 or 404 on media requests

**Checks:**
1. Token valid: Check expiry timestamp
2. File exists: `ls /mnt/media/videos/<uuid>/`
3. Renditions ready: `ls /mnt/media/videos/<uuid>/hls/`

---

## Development

### Local Development

```bash
cd pulsevault
npm install
cp .env.example .env

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Create directories
mkdir -p /tmp/pulsevault/{uploads,videos,audit}

# Update .env
export MEDIA_ROOT=/tmp/pulsevault
export UPLOAD_DIR=/tmp/pulsevault/uploads
export VIDEO_DIR=/tmp/pulsevault/videos
export AUDIT_DIR=/tmp/pulsevault/audit

# Start server
npm run dev

# In another terminal, start worker
node workers/transcode-worker.js
```

### Running Tests

```bash
npm test
```

---

## License

Source-available license. Usage for HIPAA-covered workloads requires a signed BAA and on-premise deployment.

---

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/mieweb/pulsevault/issues
- Documentation: https://github.com/mieweb/pulsevault/wiki
