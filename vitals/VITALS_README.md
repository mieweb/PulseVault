# PulseVault Vitals - Frontend Documentation

## Overview

**Vitals** is the frontend application for PulseVault - a responsive React + Next.js PWA that delivers an infinite-scroll short video feed experience. Built for healthcare and research environments with a focus on security, compliance, and performance.

## Features

- ✅ **Infinite Scroll Feed** - Smooth vertical scrolling video feed using react-virtuoso
- ✅ **HLS Video Playback** - Adaptive streaming with hls.js (desktop) and native HLS (iOS/Safari)
- ✅ **Resumable Uploads** - tus protocol support via Uppy for reliable, resumable uploads
- ✅ **PWA Support** - Installable, offline-capable progressive web app
- ✅ **Responsive Design** - Mobile-first design with Tailwind CSS
- ✅ **Viewport-based Autoplay** - Videos play automatically when visible, pause when scrolled out
- ✅ **Secure Media Access** - HMAC-signed URLs with configurable expiry
- ✅ **TypeScript** - Full type safety throughout the application

## Tech Stack

| Component       | Technology                 |
| --------------- | -------------------------- |
| Framework       | Next.js 15 (App Router)    |
| UI Library      | React 19                   |
| Styling         | Tailwind CSS 4             |
| Virtualization  | react-virtuoso             |
| Video Player    | hls.js                     |
| Uploads         | Uppy + tus-js-client       |
| Type Safety     | TypeScript                 |
| Animation       | Framer Motion (ready)      |
| State/Query     | React Query (ready)        |

## Getting Started

### Prerequisites

- Node.js 20+ or compatible runtime
- npm or yarn package manager
- PulseVault backend running (see `../pulsevault/README.md`)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your backend URL
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to [http://localhost:4000](http://localhost:4000)

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
vitals/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout with PWA metadata
│   │   ├── page.tsx           # Home page (video feed)
│   │   ├── upload/            # Upload page
│   │   └── my-uploads/        # User's uploads listing
│   │
│   ├── components/            # React components
│   │   ├── VideoPlayer.tsx   # HLS video player with IntersectionObserver
│   │   ├── VideoItem.tsx     # Individual video item in feed
│   │   ├── VideoFeed.tsx     # Infinite scroll feed container
│   │   └── VideoUploader.tsx # Upload UI with Uppy
│   │
│   ├── lib/                   # Utilities and helpers
│   │   └── api-client.ts     # Backend API client
│   │
│   ├── hooks/                 # Custom React hooks (ready for use)
│   └── types/                 # TypeScript type definitions (ready for use)
│
├── public/
│   ├── manifest.json          # PWA manifest
│   └── *.png                  # App icons
│
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

## Core Components

### VideoPlayer

HLS video player with automatic quality switching and visibility-based playback.

**Features:**
- Automatic HLS.js vs native HLS detection
- IntersectionObserver-based autoplay
- Error recovery for network and media issues
- Play/pause controls
- Fullscreen support

**Usage:**
```tsx
<VideoPlayer
  videoId="abc123"
  signedUrl="https://api.example.com/media/videos/abc123/hls/master.m3u8?token=..."
  isVisible={true}
  onEnded={() => console.log('Video ended')}
/>
```

### VideoFeed

Virtualized infinite scroll container using react-virtuoso.

**Features:**
- Efficient rendering of large video lists
- Automatic pagination on scroll
- Loading states
- Empty state handling

### VideoUploader

Upload interface using Uppy with tus resumable upload support.

**Features:**
- Drag-and-drop file selection
- Upload progress tracking
- Resumable uploads (survives connection drops)
- Automatic upload finalization
- Success notifications

## API Integration

The frontend communicates with the PulseVault backend through the API client (`src/lib/api-client.ts`).

### Key API Endpoints

#### Get Videos List
```typescript
fetchVideos(page: number, limit: number): Promise<VideoMetadata[]>
```

#### Get Signed URL
```typescript
getSignedUrl(
  videoId: string,
  mediaPath: string,
  expiry?: number
): Promise<SignedUrl>
```

#### Upload Finalization
```typescript
finalizeUpload(
  uploadId: string,
  filename: string,
  userId?: string,
  metadata?: Record<string, any>
): Promise<VideoMetadata>
```

### Configuration

Set the backend URL in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
```

## PWA Configuration

The app is configured as a Progressive Web App with:

- **Manifest**: `/public/manifest.json` - App metadata and icons
- **Service Worker**: Ready for implementation with Next.js
- **Offline Support**: App shell caching (ready for implementation)
- **Installability**: Install prompts on mobile devices

### Manifest Configuration

Edit `public/manifest.json` to customize:
- App name and description
- Theme colors
- Icons (replace placeholders in `/public`)
- Shortcuts

## Responsive Design

The app uses Tailwind CSS with a mobile-first approach:

- **Mobile**: Full-screen video feed, bottom navigation
- **Tablet**: Optimized layout with larger touch targets
- **Desktop**: Side-by-side layout options, keyboard shortcuts

## Video Playback

### Supported Formats

- **HLS (m3u8)**: Preferred for adaptive streaming
- **MP4**: Direct playback fallback
- **WebM**: Direct playback fallback

### Adaptive Streaming

When HLS is available, the player automatically:
- Selects appropriate quality based on bandwidth
- Switches quality during playback
- Buffers efficiently to prevent stalling

### Autoplay Behavior

Videos autoplay when:
- 50%+ of the video is visible in viewport
- User has interacted with the page (browser requirement)

Videos pause when:
- Scrolled out of view
- User manually pauses
- App loses focus

## Upload Flow

1. User selects video file (drag-drop or click)
2. Uppy chunks file and uploads via tus protocol
3. Upload resumes automatically if connection drops
4. On completion, `finalizeUpload` is called
5. Backend moves file to permanent storage
6. Backend enqueues transcoding job
7. User redirected to feed

## Authentication (Ready)

The app is ready for JWT-based authentication:

1. Add auth provider (Clerk, Auth.js, etc.)
2. Store JWT token in localStorage/cookies
3. Include token in API requests
4. Protect routes with middleware

Example auth integration point in `api-client.ts`:

```typescript
headers: {
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
}
```

## WebSocket Integration (Ready)

Realtime features are ready for implementation:

- Reactions and comments
- Live view counts
- Transcoding status updates
- New video notifications

Connection setup:
```typescript
const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
```

## Performance Optimization

### Implemented
- React Virtuoso for efficient list rendering
- Lazy loading of video components
- Debounced scroll events
- HLS adaptive bitrate streaming

### Recommended
- Service Worker for offline support
- IndexedDB for metadata caching
- Image optimization for thumbnails
- CDN for static assets

## Deployment

### Environment Variables

Required for production:
```bash
NEXT_PUBLIC_API_URL=https://api.pulsestream.local
NEXT_PUBLIC_WS_URL=wss://api.pulsestream.local/ws
```

### Build and Deploy

```bash
npm run build
npm start
```

Or use Docker:
```bash
docker build -t vitals .
docker run -p 4000:3000 vitals
```

### Nginx Configuration

Serve through Nginx for production:

```nginx
server {
    listen 443 ssl http2;
    server_name vitals.pulsestream.local;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

The project uses:
- ESLint for code quality
- TypeScript for type safety
- Tailwind CSS for styling

## Troubleshooting

### Videos won't play

1. Check backend is running and accessible
2. Verify CORS headers are configured
3. Check browser console for errors
4. Test signed URL generation

### Uploads fail

1. Verify tus endpoint is accessible: `http://localhost:3000/uploads`
2. Check file size limits
3. Verify network connectivity
4. Check browser console for errors

### Build fails

1. Clear `.next` directory: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Node.js version (requires 20+)

### PWA not installable

1. Verify HTTPS is enabled (required for PWA)
2. Check manifest.json is valid
3. Verify icons exist and are correct sizes
4. Check service worker registration

## Future Enhancements

Ready for implementation:

- [ ] **React Query** - Server state management for better caching
- [ ] **Framer Motion** - Smooth page transitions and animations
- [ ] **Service Worker** - Advanced offline support with Workbox
- [ ] **Auth Integration** - JWT/OIDC with Clerk or Auth.js
- [ ] **WebSocket** - Realtime reactions and comments
- [ ] **Expo Wrapper** - Native mobile app build
- [ ] **Grafana Integration** - Frontend metrics dashboard
- [ ] **IndexedDB** - Local video metadata caching
- [ ] **Thumbnail Generation** - Video poster images
- [ ] **Search** - Full-text search with filters

## Contributing

This is part of the PulseVault platform. See main repository README for contribution guidelines.

## License

Source-available license. See LICENSE file in repository root.

---

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/mieweb/pulsevault
- Documentation: See `/pulsevault/DEPLOYMENT.md` for full stack setup

---

**PulseVault Vitals** - Your data has a heartbeat. Vitals makes it visible.
