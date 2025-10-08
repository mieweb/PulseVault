# Vitals + PulseVault Integration Testing Guide

## Prerequisites

Both the PulseVault backend and Vitals frontend must be running.

## Setup

### 1. Start PulseVault Backend

```bash
cd pulsevault
npm install
npm run dev
```

Backend should be running on `http://localhost:3000`

### 2. Start Vitals Frontend

```bash
cd vitals
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend should be running on `http://localhost:4000`

## Test Scenarios

### Test 1: Video Feed (with empty state)

**URL:** `http://localhost:4000`

**Expected:**
- Navigation bar with "PulseVault" logo and Upload/My Uploads buttons
- Black background (video feed style)
- Message: "No videos yet - Upload your first video to get started"

**Verify:**
- API call to `http://localhost:3000/videos?page=1&limit=10` (may fail if backend not ready)
- Graceful error handling if backend is unavailable

### Test 2: Upload Flow

**URL:** `http://localhost:4000/upload`

**Steps:**
1. Click "Upload" button in navigation
2. Drag and drop a video file OR click "browse files"
3. Select a video file (MP4, WebM, etc.)
4. Click "Upload" button in Uppy interface

**Expected:**
- Upload progress bar appears
- Upload uses tus protocol to `http://localhost:3000/uploads`
- On completion, calls `POST /uploads/finalize`
- Success notification appears
- Redirects to feed after 3 seconds

**Verify:**
- Check Network tab for tus PATCH requests
- Check Console for upload logs
- Check backend logs for upload finalization

### Test 3: My Uploads

**URL:** `http://localhost:4000/my-uploads`

**Expected:**
- Grid layout of uploaded videos (if any exist)
- Each video shows: thumbnail placeholder, filename, status, size, upload date
- "View in Feed" link for each video
- Empty state with "Upload Video" button if no videos

**Verify:**
- API call to `http://localhost:3000/videos?page=1&limit=50`
- Proper display of video metadata

### Test 4: Video Playback (requires backend with videos)

**Setup:**
1. Upload a video through the backend or upload page
2. Wait for transcoding to complete (check backend logs)
3. Navigate to home feed

**Expected:**
- Video appears in feed
- Scroll to video to make it visible
- Video should request signed URL from `POST /media/sign`
- Video should autoplay when 50% visible
- Video should pause when scrolled out of view

**Verify:**
- Check Network tab for:
  - `POST /media/sign` request
  - HLS manifest request (master.m3u8)
  - HLS segment requests (.ts files)
- Check Console for HLS.js logs
- Video plays smoothly without buffering

### Test 5: Infinite Scroll (requires multiple videos)

**Setup:**
- Need 10+ videos in backend

**Steps:**
1. Navigate to home feed
2. Scroll down through videos

**Expected:**
- Smooth scrolling with no jank
- New videos load automatically at bottom
- Only visible videos are rendered (virtualization)
- Videos pause when scrolled out of view

**Verify:**
- Check Network tab for pagination requests
- Check Console for "Video visible:" logs
- Memory usage stays stable

### Test 6: Resumable Upload (connection interruption)

**Steps:**
1. Start uploading a large video (>100MB recommended)
2. During upload, pause network in DevTools (or disconnect)
3. Wait a few seconds
4. Resume network connection

**Expected:**
- Upload pauses when network disconnected
- Upload automatically resumes when network returns
- Upload completes successfully

**Verify:**
- Check Console for Uppy retry messages
- Check Network tab for multiple tus PATCH requests
- Final file should be complete and playable

### Test 7: PWA Installation

**Desktop (Chrome/Edge):**
1. Navigate to `http://localhost:4000`
2. Look for install icon in address bar
3. Click to install

**Mobile:**
1. Open in mobile browser
2. Look for "Add to Home Screen" prompt

**Expected:**
- App installs as standalone application
- Opens in its own window (no browser UI)
- Offline support works (try disconnecting network)

**Note:** PWA features require HTTPS in production. For localhost development, they're enabled by default.

### Test 8: Service Worker & Offline Support

**Steps:**
1. Navigate to `http://localhost:4000`
2. Open DevTools → Application → Service Workers
3. Verify service worker is registered
4. Navigate around the app
5. Stop backend server
6. Refresh page or navigate

**Expected:**
- Service worker shows as "activated and running"
- App shell (layout, navigation) loads from cache
- API calls fail gracefully with error messages
- Previously viewed content may be available

**Verify:**
- Check Application → Cache Storage for cached files
- Check Console for service worker logs

## Backend API Endpoints Used

### Video Listing
```
GET /videos?page=1&limit=10
Response: VideoMetadata[]
```

### Sign Media URL
```
POST /media/sign
Body: { videoId, mediaPath, expiry }
Response: { url, expiresAt, expiresIn }
```

### Get Metadata
```
GET /media/videos/:videoId/metadata?token=xxx
Response: VideoMetadata
```

### Get Renditions
```
GET /media/videos/:videoId/renditions?token=xxx
Response: { renditions: [], status, masterPlaylist }
```

### Upload (tus protocol)
```
POST /uploads
PATCH /uploads/:uploadId
```

### Finalize Upload
```
POST /uploads/finalize
Body: { uploadId, filename, userId, metadata }
Response: VideoMetadata
```

## Common Issues

### CORS Errors
**Symptom:** "Access to fetch has been blocked by CORS policy"

**Solution:** Check backend CORS configuration allows `http://localhost:4000`

### Connection Refused
**Symptom:** "net::ERR_CONNECTION_REFUSED"

**Solution:** Verify backend is running on `http://localhost:3000`

### Videos Won't Play
**Symptom:** Video element appears but doesn't play

**Solution:** 
1. Check transcoding completed (backend logs)
2. Check signed URL is valid (not expired)
3. Check HLS manifest is accessible
4. Check browser console for HLS.js errors

### Upload Fails
**Symptom:** Upload starts but fails immediately

**Solution:**
1. Check backend tus endpoint is configured
2. Check file size limits (5GB default)
3. Check file type is video/*
4. Check backend upload directory is writable

### Service Worker Not Registering
**Symptom:** No service worker in DevTools

**Solution:**
1. Service worker only registers in production mode (`npm run build && npm start`)
2. Or service worker runs in dev mode too - check `/sw.js` is accessible

## Performance Benchmarks

### Expected Load Times
- Initial page load: < 2s
- Video sign URL: < 100ms
- HLS manifest load: < 200ms
- First video frame: < 1s
- Upload start: < 500ms

### Expected Bundle Sizes
- Home page: ~295 KB
- Upload page: ~212 KB
- My Uploads: ~119 KB

## Browser Compatibility

### Tested Browsers
- Chrome/Edge 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅ (native HLS)
- iOS Safari 14+ ✅ (native HLS)
- Chrome Android 90+ ✅

### Known Issues
- Service Worker requires HTTPS in production
- PWA install prompt varies by browser
- HLS.js doesn't work in Safari (uses native HLS)

## Next Steps After Testing

1. ✅ Verify all test scenarios pass
2. 📝 Document any issues found
3. 🎨 Create actual PWA icons (replace placeholders)
4. 🔐 Add authentication (Clerk/Auth.js)
5. 📡 Enable WebSocket for realtime features
6. 📊 Add Grafana integration for metrics
7. 🚀 Deploy to staging environment

## Support

For issues during testing:
- Check browser console for errors
- Check backend logs
- Check Network tab in DevTools
- Review [VITALS_README.md](./VITALS_README.md) for troubleshooting
- Check [SETUP.md](./SETUP.md) for configuration help
