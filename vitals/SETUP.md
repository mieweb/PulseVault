# PulseVault Vitals - Quick Start Guide

## Prerequisites

- Node.js 20+ installed
- PulseVault backend running (see `../pulsevault/README.md`)
- Git (for cloning)

## Installation

1. **Navigate to vitals directory:**
   ```bash
   cd vitals
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and set your backend URL:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:3000
   NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
   ```

## Running Locally

### Development Mode

Start the development server with hot reload:
```bash
npm run dev
```

The app will be available at [http://localhost:4000](http://localhost:4000)

### Production Build

Build and run in production mode:
```bash
npm run build
npm start
```

## Testing the Stack

### 1. Start Backend

In a separate terminal, start the PulseVault backend:
```bash
cd ../pulsevault
npm run dev
```

The backend should be running on `http://localhost:3000`

### 2. Start Frontend

In the vitals directory:
```bash
npm run dev
```

### 3. Test Features

#### Video Feed
1. Open [http://localhost:4000](http://localhost:4000)
2. You should see the video feed interface
3. If no videos exist, you'll see "No videos yet" message

#### Upload Video
1. Click "Upload" button in navigation
2. Drag and drop a video file or click to select
3. Upload will use tus resumable protocol
4. After upload completes, you'll be redirected to the feed

#### My Uploads
1. Click "My Uploads" in navigation
2. View list of uploaded videos
3. Click "View in Feed" to see video in the feed

## Project Structure

```
vitals/
├── src/
│   ├── app/                      # Next.js pages
│   │   ├── page.tsx             # Home/Feed page
│   │   ├── upload/page.tsx      # Upload page
│   │   └── my-uploads/page.tsx  # User uploads
│   ├── components/              # React components
│   │   ├── VideoPlayer.tsx     # HLS player
│   │   ├── VideoItem.tsx       # Feed item
│   │   ├── VideoFeed.tsx       # Infinite scroll
│   │   └── VideoUploader.tsx   # Upload UI
│   └── lib/
│       └── api-client.ts       # Backend API
└── public/
    ├── manifest.json           # PWA manifest
    └── sw.js                   # Service worker
```

## Common Issues

### Videos don't load
- Ensure backend is running on `http://localhost:3000`
- Check CORS configuration in backend
- Verify signed URLs are being generated

### Build fails
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Port already in use
Change port in package.json:
```json
"dev": "next dev --turbopack --port 4001"
```

## API Integration

The frontend connects to these backend endpoints:

- `GET /videos` - List videos
- `POST /media/sign` - Get signed media URL
- `GET /media/videos/:id/metadata` - Get video metadata
- `GET /media/videos/:id/renditions` - List available qualities
- `POST /uploads` - tus upload endpoint
- `POST /uploads/finalize` - Finalize upload

## PWA Features

### Install as App

On mobile devices:
1. Open the app in browser
2. Look for "Add to Home Screen" prompt
3. Accept to install

On desktop (Chrome/Edge):
1. Look for install icon in address bar
2. Click to install as desktop app

### Offline Support

The service worker caches:
- App shell (layout, navigation)
- Static assets
- Previously viewed content

## Development Tips

### Hot Reload
Next.js with Turbopack provides instant hot reload. Save files to see changes immediately.

### TypeScript
Full type safety is enabled. Run `npm run build` to check for type errors.

### Linting
```bash
npm run lint
```

### VS Code
Recommended extensions:
- ESLint
- Tailwind CSS IntelliSense
- TypeScript

## Next Steps

### Add Authentication

1. Install auth provider:
   ```bash
   npm install @clerk/nextjs
   # or
   npm install next-auth
   ```

2. Configure in layout.tsx

3. Update API client to send auth tokens

### Enable WebSocket

Add realtime features:
```typescript
const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
ws.onmessage = (event) => {
  // Handle realtime updates
};
```

### Add Analytics

Integrate with Prometheus/Grafana:
```typescript
// Track video views, upload success, etc.
```

## Production Deployment

### Docker

```bash
docker build -t pulsevault-vitals .
docker run -p 4000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.pulsestream.local \
  pulsevault-vitals
```

### Environment Variables

Production requires:
```bash
NEXT_PUBLIC_API_URL=https://api.pulsestream.local
NEXT_PUBLIC_WS_URL=wss://api.pulsestream.local/ws
```

### HTTPS

Always use HTTPS in production for:
- PWA installation
- Service Worker
- Secure media access
- WebSocket connections

## Support

For detailed documentation, see [VITALS_README.md](./VITALS_README.md)

For issues:
- GitHub Issues: https://github.com/mieweb/pulsevault
- Backend docs: `../pulsevault/DEPLOYMENT.md`

---

**PulseVault Vitals** - Infinite-scroll video feed for healthcare and research.
