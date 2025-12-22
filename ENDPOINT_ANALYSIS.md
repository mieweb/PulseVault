# PulseVault Endpoint Analysis

**Base URL:** `http://localhost:3000`

| Method | Endpoint | Purpose | Request | Response | Usage | Notes |
|--------|----------|---------|---------|----------|-------|-------|
| `GET` | `/` | Health check | `GET / HTTP/1.1` | `{"root": true}` | Monitoring systems, load balancers, Docker health checks | No auth required |
| `GET` | `/metrics` | Prometheus metrics | `GET /metrics HTTP/1.1` | Prometheus text format | Prometheus scraper polls every 15s for observability dashboards | No auth required |
| `POST` | `/uploads` | Create resumable upload (TUS) | `POST /uploads HTTP/1.1`<br>`Upload-Length: 3670016`<br>`Tus-Resumable: 1.0.0` | `201 Created`<br>`Location: /uploads/{uploadId}`<br>`Upload-Offset: 0` | Mobile app calls this first to create upload session, gets uploadId | Returns uploadId for chunked upload |
| `PATCH` | `/uploads/:id` | Upload file chunks (TUS) | `PATCH /uploads/{id} HTTP/1.1`<br>`Upload-Offset: 0`<br>`Content-Type: application/offset+octet-stream`<br>`[binary chunk]` | `204 No Content`<br>`Upload-Offset: {bytes}` | Mobile app uploads video in chunks, repeats until complete. Can resume if interrupted. | Repeat until file complete |
| `HEAD` | `/uploads/:id` | Get upload status | `HEAD /uploads/{id} HTTP/1.1`<br>`Tus-Resumable: 1.0.0` | `200 OK`<br>`Upload-Offset: {bytes}`<br>`Upload-Length: {total}` | Mobile app checks progress or resumes interrupted upload by checking current offset | For resuming interrupted uploads |
| `POST` | `/uploads/finalize` | Finalize upload, enqueue transcoding | `POST /uploads/finalize HTTP/1.1`<br>`Content-Type: application/json`<br>`X-Upload-Token: {token}`<br><br>`{`<br>`  "uploadId": "...",`<br>`  "filename": "video.mp4",`<br>`  "userId": "user123",`<br>`  "uploadToken": "..."`<br>`}` | `{`<br>`  "videoId": "...",`<br>`  "status": "uploaded",`<br>`  "size": 3670016,`<br>`  "checksum": "...",`<br>`  "transcoding": "queued"`<br>`}` | Mobile app calls after all chunks uploaded. Moves file to permanent storage, starts transcoding. Returns videoId. | Requires token if `REQUIRE_UPLOAD_TOKEN=true`. Moves to permanent storage. |
| `POST` | `/media/sign` | Generate signed URL | `POST /media/sign HTTP/1.1`<br>`Content-Type: application/json`<br><br>`{`<br>`  "videoId": "...",`<br>`  "path": "hls/master.m3u8",`<br>`  "expiresIn": 300`<br>`}` | `{`<br>`  "url": "/media/videos/{id}/hls/master.m3u8?token=...",`<br>`  "expiresAt": "2024-01-15T10:35:00.000Z",`<br>`  "expiresIn": 300`<br>`}` | Web app calls this to get authenticated URL for video player. Pass URL to video player component. | Token expires in 300s (default). Format: `{expiresAt}.{signature}` |
| `GET` | `/media/videos/:videoId/*` | Stream media files | `GET /media/videos/{id}/hls/master.m3u8?token=... HTTP/1.1`<br><br>Or with range:<br>`Range: bytes=0-1048575` | Playlist: `200 OK`<br>`Content-Type: application/vnd.apple.mpegurl`<br>`#EXTM3U...`<br><br>Segment: `206 Partial Content`<br>`Content-Range: bytes 0-1048575/2097152`<br>`[binary data]` | Video player (HLS.js, Video.js, etc.) requests playlists and segments. Browser handles range requests for seeking. | Playlists rewritten with tokens. Supports range requests. Token required. |
| `GET` | `/media/videos/:videoId/metadata` | Get video metadata | `GET /media/videos/{id}/metadata?token=... HTTP/1.1` | `{`<br>`  "videoId": "...",`<br>`  "filename": "video.mp4",`<br>`  "userId": "user123",`<br>`  "status": "transcoded",`<br>`  "dimensions": {width: 1920, height: 1080},`<br>`  "duration": 30.5,`<br>`  "renditions": ["240p", "360p", ...]`<br>`}` | Web app displays video info page: title, duration, quality options, transcoding status. Check if ready before playing. | Checksum excluded. Cached in Redis. Includes renditions list. |
| `GET` | `/qr/deeplink` | Generate secure deeplink | `GET /qr/deeplink?userId=user123&organizationId=org456&draftId=draft789&expiresIn=86400 HTTP/1.1` | `{`<br>`  "deeplink": "pulsecam://?mode=upload&server=...&token=...",`<br>`  "server": "http://localhost:3000",`<br>`  "token": "...",`<br>`  "expiresAt": "2024-01-16T10:30:00.000Z",`<br>`  "expiresIn": 86400,`<br>`  "tokenId": "...",`<br>`  "qrData": "pulsecam://?..."`<br>`}` | Web app generates QR code from `qrData` field. User scans QR with mobile app to start authenticated upload. | Query params: `userId`, `organizationId`, `draftId`, `expiresIn` (default 24h), `oneTimeUse`, `server`. HMAC-signed token. Use `qrData` field to generate QR code client-side. |
| `POST` | `/qr/verify` | Verify upload token | `POST /qr/verify HTTP/1.1`<br>`Content-Type: application/json`<br><br>`{`<br>`  "token": "..."`<br>`}` | Valid: `{`<br>`  "valid": true,`<br>`  "payload": {server, userId, ...}`<br>`}`<br><br>Invalid: `401`<br>`{"valid": false, "reason": "Token expired"}` | Mobile app validates token from QR code before starting upload. Shows error if expired/invalid. | Validates token before upload |

---

## Complete Workflow

1. `GET /qr/deeplink` → Generate QR code
2. `POST /qr/verify` → Verify token
3. `POST /uploads` → Create upload session
4. `PATCH /uploads/:id` → Upload chunks
5. `POST /uploads/finalize` → Finalize, get videoId
6. Background worker → Transcode to HLS
7. `POST /media/sign` → Get signed URL
8. `GET /media/videos/:id/hls/master.m3u8?token=...` → Stream video

---

## Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success, no body
- `206 Partial Content` - Range request served
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Token invalid/expired
- `403 Forbidden` - Path traversal attempt
- `404 Not Found` - Resource not found
- `409 Conflict` - Upload offset mismatch
- `416 Range Not Satisfiable` - Invalid range
- `501 Not Implemented` - Feature not available

---

## Security Notes

- **Upload Tokens:** HMAC-SHA256 signed, 24h expiry (default)
- **Media Tokens:** HMAC-SHA256 signed, 5min expiry (default)
- **Path Traversal:** All paths validated
- **Audit Logging:** All events logged
