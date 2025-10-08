# PulseVault Backend

HIPAA-compliant video storage and delivery backend with resumable uploads, adaptive transcoding, and secure media serving.

## Features

- ✅ **Resumable uploads** via tus protocol (up to 2GB+ files)
- ✅ **Atomic metadata** with SHA-256 checksums and fsync
- ✅ **HMAC-signed URLs** with configurable expiry (default 300s)
- ✅ **Range request support** for video seeking
- ✅ **Adaptive transcoding** (HLS/DASH: 240p, 360p, 480p, 720p, 1080p)
- ✅ **Redis job queue** for background transcoding
- ✅ **Hash-chained audit logs** (tamper-evident, append-only)
- ✅ **Prometheus metrics** for observability
- ✅ **No PHI in logs or URLs** (UUID-only identifiers)

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start Redis (required)
docker run -d -p 6379:6379 redis:7-alpine

# Create storage directories
mkdir -p /tmp/pulsevault/{uploads,videos,audit}

# Start the server
npm run dev

# In another terminal, start the transcoding worker
npm run worker
```

The API will be available at `http://localhost:3000`

### Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions including Docker Compose, Nginx, and observability stack.

## API Endpoints

### Upload

- `POST /uploads` - Start resumable upload (tus protocol)
- `PATCH /uploads/:id` - Upload chunks
- `POST /uploads/finalize` - Finalize and enqueue transcoding
- `GET /uploads/status/:uploadId` - Check upload status

### Media

- `POST /media/sign` - Generate signed URL
- `GET /media/videos/:videoId/:path?token=<token>` - Stream media (supports range requests)
- `GET /media/videos/:videoId/metadata?token=<token>` - Get video metadata
- `GET /media/videos/:videoId/renditions?token=<token>` - List available renditions

### Observability

- `GET /metrics` - Prometheus metrics endpoint
- `GET /` - Health check

## Architecture

```
┌─────────────────┐
│  Pulse (App)    │
│  Camera Upload  │
└────────┬────────┘
         │ tus protocol (HTTPS)
         ▼
┌─────────────────┐      ┌──────────────┐
│  PulseVault API │◄────►│    Redis     │
│  Fastify Server │      │  Job Queue   │
└────────┬────────┘      └──────────────┘
         │
         │ Enqueue transcode job
         ▼
┌─────────────────┐      ┌──────────────┐
│ Transcode Worker│◄────►│   FFmpeg     │
│  Node.js        │      │ HLS/DASH     │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────────────────────┐
│     Encrypted Storage           │
│  /videos/<uuid>/                │
│    ├── original.mp4             │
│    ├── meta.json                │
│    └── hls/                     │
│        ├── master.m3u8          │
│        ├── 240p.m3u8            │
│        └── ...                  │
└─────────────────────────────────┘
         │
         ▼ HMAC-signed URLs
┌─────────────────┐
│  Vitals (PWA)   │
│  Video Player   │
└─────────────────┘
```

## Configuration

Key environment variables:

- `HMAC_SECRET` - **Required** in production for signed URLs
- `MEDIA_ROOT` - Root storage directory (default: `/mnt/media`)
- `REDIS_HOST` - Redis hostname (default: `localhost`)
- `TRANSCODE_ENABLED` - Enable transcoding worker (default: `true`)

See [.env.example](./.env.example) for all options.

## Storage Layout

```
/mnt/media/
  uploads/              # Temporary staging
    <upload-id>
  videos/               # Permanent storage
    <video-uuid>/
      original.mp4      # Source file
      meta.json         # Canonical metadata (checksummed)
      hls/              # HLS renditions
        master.m3u8
        240p.m3u8
        240p_000.ts
        ...
  audit/                # Tamper-evident logs
    access-2024-12-18.log
    upload-2024-12-18.log
    transcode-2024-12-18.log
```

## Security

### HIPAA Compliance

- ✅ TLS 1.2+ for all connections
- ✅ LUKS/ZFS encrypted storage volumes
- ✅ HMAC-signed URLs with short expiry (≤300s)
- ✅ Hash-chained audit logs (append-only)
- ✅ IP anonymization in logs
- ✅ UUID-only identifiers (no PHI in filenames/URLs)
- ✅ Self-hosted (no cloud, no third-party data sharing)

### Token Generation Example

```javascript
// Generate a signed URL for a video
const response = await fetch('http://localhost:3000/media/sign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId: 'uuid-here',
    path: 'hls/master.m3u8',
    expiresIn: 300  // 5 minutes
  })
})

const { url } = await response.json()
// url: /media/videos/uuid-here/hls/master.m3u8?token=...
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage (if configured)
npm run test:coverage
```

## Monitoring

### Metrics

Access Prometheus metrics at `http://localhost:3000/metrics`

Key metrics:
- `pulsevault_uploads_total` - Upload counter
- `pulsevault_transcodes_total` - Transcode counter
- `pulsevault_queue_length` - Jobs in queue
- `http_request_duration_seconds` - Request latency

### Logs

Structured JSON logs to stdout. Configure log level via `LOG_LEVEL` env var.

Audit logs in `/mnt/media/audit/` are hash-chained and append-only.

## Development

### Project Structure

```
pulsevault/
  ├── app.js                    # Fastify app entry point
  ├── plugins/                  # Fastify plugins
  │   ├── 00-config.js          # Configuration loader
  │   ├── audit.js              # Audit logging
  │   ├── metrics.js            # Prometheus metrics
  │   └── redis.js              # Redis queue
  ├── routes/                   # API routes
  │   ├── uploads.js            # Upload endpoints
  │   └── media.js              # Media serving
  ├── lib/                      # Utilities
  │   ├── metadata-writer.js    # Atomic metadata
  │   └── audit-logger.js       # Hash-chained logs
  ├── workers/                  # Background workers
  │   └── transcode-worker.js   # FFmpeg transcoding
  └── test/                     # Tests
```

### Adding New Routes

Create a new file in `routes/` directory:

```javascript
// routes/my-route.js
module.exports = async function (fastify, opts) {
  fastify.get('/my-route', async (request, reply) {
    return { hello: 'world' }
  })
}
```

Routes are automatically loaded by `@fastify/autoload`.

### Adding New Plugins

Create a new file in `plugins/` directory using `fastify-plugin`:

```javascript
// plugins/my-plugin.js
const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
  fastify.decorate('myFeature', () => {
    return 'value'
  })
})
```

## License

Source-available license. HIPAA-covered workloads require a signed BAA and on-premise deployment.

---

**Built with ❤️ for HIPAA-compliant healthcare video workflows**
