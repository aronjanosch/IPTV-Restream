# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

**IPTV StreamHub** is a full-stack application for IPTV restreaming and synchronized viewing. It consists of:

- **Backend**: Node.js/Express with Socket.IO for real-time communication, FFmpeg for restreaming
- **Frontend**: React/TypeScript with HLS.js for video playback and Socket.IO client
- **Deployment**: Docker Compose with Nginx reverse proxy

### Three Streaming Modes

The application supports three streaming modes handled differently:

1. **Direct Mode**: Stream URL passed directly to client (minimal server resources)
2. **Proxy Mode**: Server proxies HLS streams, handles CORS and custom headers
3. **Restream Mode**: Full FFmpeg transcoding with viewer-based start/stop

## Development Commands

### Frontend (React/TypeScript/Vite)
```bash
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start development server
npm run build                  # Build for production
npm run lint                   # Run ESLint
npm run preview               # Preview production build
```

### Backend (Node.js/Express)
```bash
cd backend
npm install                    # Install dependencies
npm start                     # Start server (production)
node server.js               # Direct start
```

### Docker Development
```bash
docker compose up -d          # Start all services
docker compose down           # Stop all services
docker compose logs -f        # View logs
docker compose build --no-cache  # Rebuild containers
```

### Docker + VPN (gluetun)

Optional stacks route **outbound** IPTV traffic through a VPN while keeping the default `docker-compose.yml` free of provider-specific settings.

- **`docker-compose.airvpn.yml`** — AirVPN WireGuard (`VPN_SERVICE_PROVIDER=airvpn`). Set `AIRVPN_*` vars in `.env` (see `.env.example`). Use IPv4-only `AIRVPN_WIREGUARD_ADDRESSES` unless Docker IPv6 is enabled.
- **`docker-compose.protonvpn.yml`** — ProtonVPN WireGuard. Set `PROTON_WIREGUARD_PRIVATE_KEY` and optional `PROTON_SERVER_COUNTRIES` in `.env`.

Both files use Compose `name: iptv-restream` so `db_data` / `streams_data` are shared when you switch stacks. Run only one VPN stack at a time (port `5000`).

```bash
docker compose -f docker-compose.airvpn.yml up -d
docker compose -f docker-compose.protonvpn.yml up -d
```

Local-only overrides can still live in gitignored `docker-compose.prod.yml` or `docker-compose.override.yml`.

## Key Services & Components

### Backend Architecture

- **ChannelService**: Central service managing channels, viewer connections, and stream lifecycle
- **FFmpegService**: Direct FFmpeg interface for restreaming operations
- **StreamController**: Orchestrates streaming operations and viewer-based start/stop
- **ProxyHelperService**: URL rewriting and HTTP proxying for HLS streams
- **Socket Handlers**: Real-time communication (ChannelSocketHandler, ChatSocketHandler, PlaylistSocketHandler)

### Frontend Architecture

- **VideoPlayer.tsx**: Advanced HLS.js integration with synchronization features
- **SocketService.ts**: Centralized WebSocket management with JWT authentication
- **AdminContext.tsx**: Global authentication state management
- **ApiService.ts**: HTTP client with JWT token handling

## Configuration

### Environment Variables

**Backend** (docker-compose.yml):
- `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`: First-boot admin seeding (only used when DB is empty)
- `JWT_SECRET`: JWT signing secret (**required** — server refuses to start without it)
- `SESSION_SECRET`: Express session secret for OIDC PKCE state
- `STREAM_PASSWORD`: Shared password for IPTV clients using `stream` as username
- `STORAGE_PATH`: Path for restream segments
- `BACKEND_URL`: Backend URL for playlist generation
- `OIDC_ISSUER_URL` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` / `OIDC_REDIRECT_URI`: OIDC/SSO provider config (optional)
- `OIDC_FRONTEND_URL`: Frontend URL for OIDC post-login redirect
- `OIDC_ADMIN_GROUPS`: Comma-separated OIDC group names whose members get the admin role

**Frontend** (build-time):
- `VITE_BACKEND_URL`: Backend API URL
- `VITE_STREAM_DELAY`: Direct stream delay (seconds)
- `VITE_STREAM_PROXY_DELAY`: Proxy stream delay (seconds)
- Synchronization parameters: `VITE_SYNCHRONIZATION_*`

## Stream Mode Implementation

### Proxy Mode (ProxyController.js)
- Routes: `/proxy/channel`, `/proxy/segment`, `/proxy/key`
- M3U8 playlist URL rewriting via `ProxyHelperService.rewriteUrls()`
- Custom header support for protected streams

### Restream Mode (FFmpegService.js)
- Viewer-based streaming: starts/stops based on connection count
- HLS segment generation with 6-second segments
- Automatic cleanup of old segments
- Program date time injection for synchronization

## Real-time Features

### Socket.IO Events
- `channel-selected`: Synchronized channel switching
- `stream-status-changed`: Stream start/stop notifications
- `chat-message`: Real-time chat
- `viewer-connected`/`viewer-disconnected`: Viewer tracking

### Synchronization Logic
- Program DateTime synchronization for live streams
- Configurable tolerance and deviation handling
- Adaptive playback rate adjustment
- Automatic stream resume after pause

## Authentication & User Accounts

### Architecture
- All users must log in — the frontend shows `LoginPage` until a valid JWT is present
- Two login methods: username/email + password, and OIDC/SSO (optional, enabled via env vars)
- JWTs are signed with `JWT_SECRET`, stored in `localStorage`, and verified on every HTTP and Socket.IO request
- Roles: `user` (watch + chat) and `admin` (full channel/playlist management)

### Key Files
- `database.js`: SQLite schema + first-boot admin seeding
- `services/UserService.js`: bcrypt CRUD for user accounts
- `services/OidcService.js`: `openid-client` discovery + PKCE flow
- `controllers/AuthController.js`: login, OIDC initiation/callback, JWT minting, `verifyToken` middleware
- `controllers/UserController.js`: admin-gated REST CRUD for user management
- `middleware/basicAuth.js`: accepts username+password or JWT-as-password for IPTV clients (VLC etc.)
- `socket/middleware/jwt.js`: JWT verification on every Socket.IO connection

### Admin-only Operations
- Channel CRUD (HTTP routes + Socket.IO events)
- Playlist management (Socket.IO events)
- User management (`GET/POST/PUT/DELETE /api/users`)

## Development Notes

### Backend Testing
- No formal test framework configured
- Manual testing via REST API endpoints
- Socket.IO events can be tested via browser developer tools

### Frontend Development
- TypeScript strict mode enabled
- ESLint configured for React hooks and TypeScript
- Tailwind CSS for styling
- HLS.js for video playback

### Common Development Tasks

**Adding New Channel Features**:
1. Update `Channel.js` model if needed
2. Add API endpoints in relevant controller
3. Update socket handlers for real-time updates
4. Add frontend components and API service methods

**Modifying Stream Modes**:
- Proxy mode: Edit `ProxyController.js` and `ProxyHelperService.js`
- Restream mode: Edit `FFmpegService.js` and `StreamController.js`
- Frontend: Update `VideoPlayer.tsx` HLS.js configuration

**Admin Features**:
- Backend: Add to protected routes in controllers
- Frontend: Check `isAdmin` context before rendering UI
- Socket: Use `socket.user?.isAdmin` for event handling