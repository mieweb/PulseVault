---
sidebar_position: 1
---

# PulseVault

**PulseVault** is the reference upload server and web app for Pulse Cam. It includes a **Backend** (Fastify + TUS + FFmpeg + Redis), a **Frontend** (Next.js: dashboard, upload, admin, API-key deeplink), and **Nginx** for routing and security. It supports both **logged-in users** (session) and **external apps** (API key) for generating deep links and QR codes.

## Architecture

```
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                        PulseVault (Docker)                      │
                    │                                                                  │
  Browser /         │   ┌─────────┐    /    ┌──────────────────┐    /api/qr/deeplink  │
  External App      │   │ Nginx   │ ───────▶│ Next.js Frontend  │ ◀── API key (X-API-Key)
                    │   │ :80/8080│    \    │ (session, admin,  │    or session (QR)   │
                    │   └────┬───┘     \   │  API-key route)   │                      │
                    │        │           \  └─────────┬────────┘                      │
                    │        │ /uploads     /media/*  │                               │
                    │        │ /media/*     (playback)│  BACKEND_URL (internal)        │
                    │        ▼            only        │  GET /qr/deeplink              │
                    │   ┌────────────────────────────▼──┐                            │
                    │   │ Fastify Backend                │                            │
                    │   │ • /qr/deeplink (token + QR)    │                            │
                    │   │ • /uploads (TUS), /uploads/    │                            │
                    │   │   finalize                     │                            │
                    │   │ • /media/videos (list/sign     │                            │
                    │   │   internal only; playback      │                            │
                    │   │   with token allowed)           │                            │
                    │   └────────────────────────────────┘                            │
                    └─────────────────────────────────────────────────────────────────┘
                                         ▲
                                         │ TUS upload + finalize (token in body/header)
                                         │
                               ┌─────────┴─────────┐
                               │    Pulse Cam      │
                               │  (mobile app)     │
                               └───────────────────┘
```

### Two ways to get a deeplink

| Who | How | Endpoint |
|-----|-----|----------|
| **Logged-in PV user** | Session (cookie). User opens PV web → Upload → “Generate QR”. | Frontend server calls Backend `GET /qr/deeplink?userId=...&draftId=...&server=...` (internal). |
| **External app (e.g. Time Harbour)** | API key in header. No session. | `POST` or `GET` **Frontend** `https://your-pv/api/qr/deeplink` with `X-API-Key: pv_...` and body/query: `draftId`, `externalApp`, `externalUserEmail`, etc. |

See [External apps (API key)](./external-apps) for the external-app flow, API key setup, and “Uploaded via X” on the dashboard.

## Deployment

PulseVault is deployed as a Docker container. See the [PulseVault repository](https://github.com/mieweb/pulse-vault) for full setup instructions.

### Quick Start

```bash
git clone https://github.com/mieweb/pulse-vault.git
cd pulse-vault
docker compose up -d
```

Default port: **8080** (configurable via `PULSEVAULT_PORT` environment variable).

### Proxmox / LXC Deployment

The default PulseVault Docker Compose exposes **Nginx on port 8080** (not 80/443), which is suitable for **non-privileged** environments such as Proxmox LXC where binding to low ports is restricted:

```bash
docker compose up -d
```

Nginx listens on 8080; the backend receives HTTP from Nginx. SSL/TLS is typically terminated at the Proxmox host or an external load balancer. The container uses the `X-Forwarded-Proto` header (when set by the proxy) to build correct HTTPS URLs in responses (e.g. TUS `Location` headers and deep links). No extra configuration is required inside the container for this.

:::tip
If the deep link or upload server URL must use HTTPS, ensure the reverse proxy or Proxmox forwards `X-Forwarded-Proto: https` so PulseVault and Pulse Cam see the correct scheme.
:::

### Nginx and reverse proxy (production)

The PulseVault Docker stack includes **Nginx** as a reverse proxy in front of the API: it handles routing, rate limiting, and (optionally) caching. In production:

- **SSL/TLS** is often terminated at Nginx or at an outer layer (e.g. Proxmox, cloud load balancer). Nginx serves HTTP to the backend; the backend uses `X-Forwarded-Proto` to construct HTTPS URLs when needed.
- **Certificates:** For a standard Nginx-in-Docker setup, place your certs (e.g. from Let’s Encrypt) in the PulseVault repo’s `nginx/ssl/` and point the Nginx config at them. Full steps (certbot, paths, firewall) are in the [PulseVault SETUP guide](https://github.com/mieweb/pulse-vault/blob/main/SETUP.md).
- **Location and proxy rules:** Upload paths (`/uploads`, `/uploads/*`) and API routes are proxied to the Fastify backend. The PulseVault repo’s `nginx/` directory contains the config; see the [PulseVault repository](https://github.com/mieweb/pulse-vault) for the exact Nginx config and production checklist.

Using these deployment options, developers can run PulseVault in development (Quick Start), in Proxmox/LXC (non-privileged ports), or behind Nginx with SSL in production—all covered by the PulseVault repo docs.

### Media API security (Nginx)

The backend exposes:

- **`GET /media/videos`** — List videos (used by the PV frontend for the dashboard).
- **POST /media/sign** — Issue signed playback URLs.
- **`GET /media/videos/:id/...`** — Stream HLS segments (playback; URL includes a short-lived token).

In production, Nginx is configured so that **only the frontend** (or trusted internal callers) can reach list and sign. Playback URLs are still allowed from the internet so that signed HLS streams work in the browser.

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │     Nginx       │
              │  /media/videos  │ ──▶ 403 Forbidden (block list)
              │  /media/sign    │ ──▶ 403 Forbidden (block sign)
              │  /media/videos/ │ ──▶ proxy to backend (playback OK)
              │    :id/...      │
              └─────────────────┘
```

The frontend (same trust zone as the backend) calls the backend directly via `BACKEND_URL` for list and sign; only playback goes through Nginx to the public.

**Security in short:** Tokens are HMAC-signed and short-lived; API keys are hashed and shown once; list/sign are not exposed to the public; use HTTPS and strong `HMAC_SECRET` / `BETTER_AUTH_SECRET` in production.

## API Endpoints

### Health Check

```
GET /health
```

Returns `{ "status": "OK" }` if the server is running.

### Generate Deep Link (Backend)

The **backend** exposes `GET /qr/deeplink` for internal use (e.g. by the PV frontend). It is not intended to be called directly from the public internet; the **frontend** uses it when a logged-in user generates a QR, or when the frontend API-key route proxies a request from an external app.

```
GET /qr/deeplink?userId=<userId>&server=<serverUrl>[&draftId=<draftId>][&externalApp=...][&externalUserEmail=...]
```

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `userId` | No (default: `anonymous`) | User id for the upload (PV user or `anonymous` for external app). |
| `server` | Yes | The PulseVault base URL used in the deep link (e.g. `https://pulse-vault.example.com`). |
| `draftId` | No | Pre-existing draft ID; omit to have the caller generate one. |
| `externalApp` | No | App identifier for dashboard label (e.g. `timeharbour`). Stored in token and video metadata. |
| `externalUserEmail` | No | Email or identifier of the user in the external app. |
| `externalUserId` | No | External app’s own user id. |
| `expiresIn` | No | Token lifetime in seconds (default: 86400). |
| `oneTimeUse` | No | If `true`, token is single-use. |

**Response:** JSON with `deeplink`, `qrData`, `token`, `expiresAt`, `draftId`, `userId`, `externalApp`, `externalUserEmail`, etc.

**Public deeplink API (external apps):** Use the **frontend** route instead: `POST` or `GET` `https://your-pv-domain/api/qr/deeplink` with header `X-API-Key: pv_...` and the same parameters in body or query. See [External apps (API key)](./external-apps).

### TUS Upload Endpoints

PulseVault implements the standard TUS 1.0.0 protocol:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/uploads` | Create a new upload session |
| `PATCH` | `/uploads/:id` | Upload a chunk |
| `HEAD` | `/uploads/:id` | Check upload offset (for resuming) |
| `POST` | `/uploads/finalize` | Finalize and process the upload |

See the [TUS Upload](./tus) page for full protocol details.

## Integration Examples

### Your own web app (session)

If your users log in to PulseVault and use the PV web UI, the frontend calls the backend internally to get a deeplink; no API key is needed. The flow is: **User → PV Frontend (session) → Backend /qr/deeplink → QR / deeplink**.

### External app (API key)

If another app (e.g. Time Harbour) needs to show “Record a short” per ticket, it calls the **PulseVault frontend** with an API key — not the backend directly. See [External apps (API key)](./external-apps) for full details.

```js
// External app: request deeplink from PV frontend (not backend)
const response = await fetch("https://pulse-vault.example.com/api/qr/deeplink", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.PULSEVAULT_API_KEY,
  },
  body: JSON.stringify({
    draftId: ticketId,  // e.g. per ticket
    externalApp: "timeharbour",
    externalUserEmail: user.email,
  }),
});
const { deeplink, qrData } = await response.json();
// Show QR or link; user scans → Pulse Cam → upload → dashboard shows "Uploaded via Time Harbour"
```

### JavaScript (direct backend, e.g. same trust zone)

```js
// Only if your backend is in the same trust zone as PulseVault backend
const response = await fetch(
  `${PULSEVAULT_BACKEND_URL}/qr/deeplink?userId=${userId}&server=${PULSEVAULT_PUBLIC_URL}`
);
const { deeplink, qrData } = await response.json();

const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}`;
document.getElementById("qr").src = qrImage;
```

### React (`@mieweb/ui`)

```jsx
import { PulseRecordButton } from "@mieweb/ui";

function RecordingPanel({ userId }) {
  return (
    <PulseRecordButton
      serverUrl="https://vault.example.com"
      userId={userId}
      onComplete={(result) => {
        console.log("Upload complete:", result.videoId);
      }}
      onError={(error) => {
        console.error("Upload failed:", error);
      }}
    />
  );
}
```

The `@mieweb/ui` `PulseRecordButton` component handles deep link generation, QR display, and upload status polling — see the [React `@mieweb/ui` Guide](../frameworks/react-mieweb-ui) for details.

## Testing with `test-deeplink.sh`

The Pulse repo includes a test script that exercises the PulseVault deep link flow:

```bash
# Uses auto-detected local IP, port 8080
./test-deeplink.sh

# Override server URL
PULSEVAULT_URL=http://192.168.1.50:8080 ./test-deeplink.sh

# With a specific draft ID
./test-deeplink.sh f47ac10b-58cc-4372-a567-0e02b2c3d479
```

The script:
1. Checks server connectivity
2. Generates a deep link via `GET /qr/deeplink`
3. Creates a QR code image at `/tmp/pulse-qr.png`
4. Auto-opens in iOS Simulator if one is booted

## Monitoring Uploads

After Pulse Cam uploads a video, your application can query PulseVault for the status. The finalize response includes:

```json
{
  "videoId": "abc-123",
  "status": "complete",
  "size": 5242880,
  "checksum": "sha256:..."
}
```

Use `videoId` to track the asset in your own system.

## Next steps

- **External app (e.g. Time Harbour)** — [External apps (API key)](./external-apps) (API key, draftId, “Uploaded via X” on dashboard).
- **TUS details** — [TUS Resumable Uploads](./tus) (headers, chunk behavior, CORS, SSL).
- **Web integration** — [JavaScript](../frameworks/javascript) or [React @mieweb/ui](../frameworks/react-mieweb-ui) (deep link + QR).
- **Test locally** — Run `./test-deeplink.sh` in the Pulse repo against this server.
- **Problems?** — [Troubleshooting](../troubleshooting) (connection, token, Proxmox/Nginx).
