# PulseVault Frontend

**PulseVault Frontend** is a Next.js web application for uploading, viewing, and managing short-form videos in healthcare and research environments. It provides a secure, HIPAA-compliant interface for video content management with SSO authentication.

## Overview

PulseVault Frontend is the frontend component of the PulseVault platform, designed to provide users with an intuitive interface for:
- **Uploading videos** directly from the browser
- **Viewing short-form videos** in an infinite scrolling feed
- **Managing user profiles** and account settings
- **Admin dashboard** for user and system management

## Features

### Authentication
- **SSO-only authentication** via Google and GitHub OAuth
- Account linking support (connect multiple OAuth providers)
- Secure session management with cookie caching
- No email/password authentication

### Video Management
- **Short-form video feed** - Browse videos in an infinite scrolling interface
- **Video upload** - Direct browser uploads with resumable transfer support
- **Adaptive streaming** - Automatic quality adjustment for optimal playback

### User Features
- **Profile management** - Update name, view linked accounts
- **Account management** - Link/unlink social accounts, delete account
- **Role-based access** - Admin and user roles with appropriate permissions

### Security
- **Arcjet integration** - Bot detection and rate limiting
- **HMAC-signed URLs** - Secure media access with time-based expiry
- **HIPAA compliance** - Built with healthcare data protection in mind

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** TailwindCSS + shadcn/ui components
- **Authentication:** Better Auth with OAuth (Google, GitHub)
- **Database:** PostgreSQL with Prisma ORM
- **Security:** Arcjet (bot detection, rate limiting)
- **UI Components:** Radix UI primitives
- **State Management:** React Server Components + Server Actions
- **Notifications:** Sonner (toast notifications)
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OAuth app credentials (Google and/or GitHub)
- Arcjet API key

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `frontend/` directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/pulsevault"

   # Better Auth
   BETTER_AUTH_SECRET="your-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3001"

   # OAuth Providers
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"

   # Security
   ARCJET_API_KEY="your-arcjet-api-key"
   ```

3. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
frontend/
├── app/
│   ├── auth/              # Authentication page (SSO sign-in)
│   ├── dashboard/         # Main video viewing/upload interface
│   ├── profile/           # User profile management
│   ├── admin/             # Admin dashboard (admin users only)
│   ├── api/[...all]/      # Better Auth API routes (with Arcjet)
│   ├── page.tsx           # Landing page
│   └── layout.tsx         # Root layout with navbar
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── animated-title.tsx # Animated landing page title (cycles PulseVault ↔ PulseVideo)
│   ├── navbar.tsx         # Navigation with user menu
│   └── theme-provider.tsx # Dark/light mode
├── lib/
│   ├── auth.ts            # Better Auth configuration
│   ├── actions/           # Server actions (auth, profile, admin)
│   ├── prisma.ts          # Prisma client
│   └── get-session.ts     # Session helper
└── prisma/
    └── schema.prisma      # Database schema
```

## Authentication Flow

1. User visits `/auth` → Sees Google and GitHub sign-in buttons
2. Clicks provider → Redirected to OAuth provider (Google/GitHub)
3. Authenticates with provider → Grants permissions
4. OAuth callback → Better Auth exchanges code for tokens
5. User profile fetched → Name, email, avatar from OAuth provider
6. Session created → Cookie set, user redirected to dashboard
7. Subsequent requests → Session validated via cookie

**Security:**
- Arcjet bot detection on auth endpoints
- Rate limiting (10 requests per 10 minutes for auth)
- HMAC-signed session cookies
- CSRF protection via Better Auth

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `BETTER_AUTH_SECRET` | Secret for session encryption | ✅ Yes |
| `BETTER_AUTH_URL` | Base URL for Better Auth | ✅ Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | ✅ Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | ✅ Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | ✅ Yes |
| `ARCJET_API_KEY` | Arcjet API key for security | ✅ Yes |

## Available Scripts

- `npm run dev` - Start development server (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Pages

### Landing Page (`/`)
- Animated title that cycles between "PulseVault" and "PulseVideo" with backspace/typing animation
- "Pulse" stays static (red), while "Vault"/"Video" cycles (white)
- Feature highlights
- Call-to-action to sign in

### Authentication (`/auth`)
- SSO sign-in with Google and GitHub
- Feature showcase
- Branded UI

### Dashboard (`/dashboard`)
- Video viewing interface
- Video upload functionality
- User role display

### Profile (`/profile`)
- View profile information (name, email, avatar from OAuth)
- Edit name only (profile image is read-only from OAuth provider)
- Manage linked social accounts
- Delete account (with note that videos are preserved)

### Admin (`/admin`)
- User management interface
- Role management
- User creation and invitation
- Admin-only access

## Development

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Server Components for better performance
- Server Actions for mutations

### Adding New Features
1. Create components in `components/` directory
2. Add server actions in `lib/actions/`
3. Update routes in `app/` directory
4. Update database schema in `prisma/schema.prisma` if needed

### Database Migrations
```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## Deployment

### Build for Production
```bash
npm run build
npm run start
```

### Environment Setup
Ensure all environment variables are set in your production environment. Use secure secret management for sensitive values.

### Database
Run migrations in production:
```bash
npx prisma migrate deploy
```

## Security Considerations

- **OAuth Only:** No password storage or management
- **Rate Limiting:** Arcjet protects against abuse
- **Session Security:** Secure, HTTP-only cookies
- **CSRF Protection:** Built into Better Auth
- **Bot Detection:** Arcjet integration on auth endpoints

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Add proper error handling
4. Test authentication flows
5. Update documentation as needed

## License

This project is part of the PulseVault platform and is released under a source-available license. Usage for HIPAA-covered or regulated workloads requires a signed BAA and on-premise deployment.

---

**PulseVault** - Secure video storage and delivery. 🫀
