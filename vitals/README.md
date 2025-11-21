This is a [Next.js](https://nextjs.org) project - **PulseVault Vitals**, the frontend PWA for PulseVault's infinite-scroll video feed.

## 🚀 Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.local.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) to see the app.

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Quick start guide and testing instructions
- **[VITALS_README.md](./VITALS_README.md)** - Complete technical documentation

## ✨ Features

- ✅ Infinite-scroll video feed with react-virtuoso
- ✅ HLS adaptive streaming with hls.js
- ✅ Resumable uploads with Uppy + tus protocol
- ✅ PWA support with offline capabilities
- ✅ Viewport-based autoplay/pause
- ✅ Responsive mobile-first design
- ✅ TypeScript for type safety

## 🏗️ Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Styling:** Tailwind CSS 4
- **Video:** hls.js + HTML5 video
- **Uploads:** Uppy + tus-js-client
- **Virtualization:** react-virtuoso
- **TypeScript:** Full type safety

## 📦 Project Structure

```
vitals/
├── src/
│   ├── app/              # Next.js pages (App Router)
│   ├── components/       # React components
│   └── lib/             # API client & utilities
├── public/              # Static assets & PWA files
└── SETUP.md            # Setup instructions
```

## 🔌 Backend Integration

Vitals connects to the PulseVault backend at `http://localhost:3000` by default.

Make sure the backend is running:
```bash
cd ../pulsevault
npm run dev
```

## 📱 PWA Installation

The app can be installed as a Progressive Web App:
- **Mobile:** Look for "Add to Home Screen" prompt
- **Desktop:** Click install icon in browser address bar

## 🧪 Development

```bash
npm run dev      # Start dev server (port 4000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 🔐 Security & Compliance

- HMAC-signed media URLs with expiry
- JWT-ready authentication
- HTTPS required for production PWA
- Designed for HIPAA compliance

## 🤝 Contributing

This is part of the PulseVault platform. See main repository README for contribution guidelines.

## 📄 License

Source-available license. See LICENSE file in repository root.

---

**PulseVault Vitals** - Your data has a heartbeat. Vitals makes it visible.

