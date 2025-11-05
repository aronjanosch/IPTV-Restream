# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IPTV-Restream is a full-stack application for proxying, restreaming, and managing IPTV streams with synchronized playback across multiple clients. The system consists of:
- **Backend**: Node.js/Express server handling stream proxying, FFmpeg restreaming, and WebSocket coordination
- **Frontend**: React/TypeScript SPA with HLS video player and synchronized playback
- **Deployment**: Docker Compose setup with nginx reverse proxy

## Development Commands

### Backend (Node.js)
```bash
cd backend
npm install
npm start                    # Start backend server (port 5000)
```

Required environment variables (`.env`):
- `STORAGE_PATH`: Directory for HLS stream segments (requires high I/O, use tmpfs in production)
- `BACKEND_URL`: (Optional) Override auto-detected backend URL for M3U playlists
- `ADMIN_ENABLED`: Enable admin mode (`true`/`false`)
- `ADMIN_PASSWORD`: Admin password when admin mode enabled
- `CHANNEL_SELECTION_REQUIRES_ADMIN`: Restrict channel switching to admins

**System Requirements**: FFmpeg must be installed and available in PATH.

### Frontend (Vite + React + TypeScript)
```bash
cd frontend
npm install
npm run dev                  # Start dev server
npm run build                # Production build
npm run lint                 # Run ESLint
npm run preview              # Preview production build
```

Build-time environment variables (`.env`):
- `VITE_BACKEND_URL`: (Optional) Backend URL override
- `VITE_STREAM_DELAY`: Playback delay in seconds (default: 18)
- `VITE_STREAM_PROXY_DELAY`: Proxy mode delay (default: 30)
- `VITE_SYNCHRONIZATION_TOLERANCE`: Sync tolerance threshold
- `VITE_SYNCHRONIZATION_MAX_DEVIATION`: Max deviation before resync
- `VITE_SYNCHRONIZATION_ADJUSTMENT`: Base adjustment rate
- `VITE_SYNCHRONIZATION_MAX_ADJUSTMENT`: Max adjustment per tick

### Docker Compose
```bash
docker compose up -d         # Start all services (frontend, backend, nginx)
docker compose down          # Stop all services
docker compose logs -f       # View logs
```

Access at `http://localhost` (nginx routes to frontend on port 80)

## Architecture

### Backend Architecture

**Stream Processing Flow**:
1. Client requests channel → `ChannelController`
2. `StreamController` orchestrates FFmpeg via `FFmpegService`
3. Optional session management (`SessionFactory`, `SessionHandler`) for authenticated sources
4. FFmpeg writes HLS segments to `STORAGE_PATH`
5. Nginx serves segments, clients fetch via `/streams/{channelId}/{channelId}.m3u8`

**Key Backend Components**:
- `server.js`: Express app setup, Socket.IO initialization, route registration
- `services/restream/StreamController.js`: Start/stop stream orchestration
- `services/restream/FFmpegService.js`: FFmpeg process management (spawn, kill, health monitoring)
- `services/session/`: Session providers for authenticated IPTV sources (e.g., StreamedSuSession)
- `services/ChannelService.js`: In-memory channel state management
- `services/ChannelStorage.js`: Persistent channel storage to filesystem
- `services/PlaylistService.js`: M3U playlist parsing via `iptv-playlist-parser`
- `services/PlaylistUpdater.js`: Cron-based playlist refresh scheduler
- `controllers/ProxyController.js`: Direct proxy mode (no restream, lower latency)
- `socket/`: WebSocket handlers for channels, chat, playlists

**Channel Modes**:
- `proxy`: Direct HLS proxy (segments fetched on-demand, lower latency)
- `restream`: FFmpeg transcodes to local HLS (enables synchronized playback across clients)

**API Endpoints**:
- `GET /api/channels` - List all channels
- `GET /api/channels/:channelId` - Get specific channel
- `GET /api/channels/current` - Get currently playing channel
- `POST /api/channels` - Add channel (requires auth if admin mode enabled)
- `PUT /api/channels/:channelId` - Update channel (requires auth)
- `DELETE /api/channels/:channelId` - Delete channel (requires auth)
- `GET /api/channels/playlist` - M3U playlist of all channels
- `GET /proxy/channel`, `/proxy/segment`, `/proxy/key` - Proxy endpoints
- `POST /api/auth/admin-login` - Admin authentication
- `GET /api/auth/admin-status` - Check admin mode status

**WebSocket Events**:
- `channel-added`, `channel-selected`, `channel-updated`, `channel-deleted`
- `send-chat-message`, `chat-message`
- `user-connected`, `user-disconnected`
- `playlist-added`, `playlist-updated`

### Frontend Architecture

**Key Frontend Components**:
- `src/App.tsx`: Main application component, channel/playlist state, WebSocket setup
- `src/components/VideoPlayer.tsx`: HLS.js player with synchronization logic
- `src/components/ChannelList.tsx`: Channel selection UI
- `src/components/chat/`: Chat interface components
- `src/components/admin/`: Admin authentication and context
- `src/services/ApiService.ts`: REST API client
- `src/services/SocketService.ts`: Socket.IO client wrapper

**Synchronization Mechanism**:
The frontend implements synchronized playback across clients:
1. All clients play the same HLS stream with a configured delay
2. Video player continuously monitors playback position
3. If drift exceeds tolerance, playback rate adjusts to resync
4. WebSocket ensures all clients select the same channel

**Tech Stack**:
- React 18 with TypeScript
- HLS.js for video playback
- Socket.IO client for real-time updates
- Tailwind CSS for styling
- Lucide React for icons
- Vite for build tooling

### Storage and Data Flow

**Stream Storage** (`STORAGE_PATH`):
- FFmpeg writes HLS segments here: `{STORAGE_PATH}/{channelId}/{channelId}.m3u8`
- Docker Compose uses tmpfs volume for performance (high I/O operations)
- Segments auto-deleted by FFmpeg (`delete_segments` flag)

**Channel Persistence** (`/channels` volume):
- Channel configurations saved as JSON
- Survives container restarts

**nginx Configuration**:
- Frontend: `/` → `http://iptv_restream_frontend:80`
- Backend API: `/api/*` → `http://iptv_restream_backend:5000`
- WebSocket: `/socket.io/*` → `http://iptv_restream_backend:5000`
- Streams: `/streams/*` → Local `/streams` volume

## Important Patterns

### Adding New Channel Sources
If implementing support for new authenticated IPTV providers:
1. Create session provider in `backend/services/session/` (extend base pattern from `StreamedSuSession.js`)
2. Register in `SessionFactory.js`
3. Session URL replaces direct URL before FFmpeg starts

### FFmpeg Configuration
Current FFmpeg args (in `FFmpegService.js`):
- Reconnect logic for stream resilience
- Copy codec (no transcoding by default)
- 6-second segments, 5-segment playlist
- Program date time for synchronization

### Authentication Flow
When admin mode enabled:
1. Frontend calls `/api/auth/admin-login` with password
2. Backend returns JWT token
3. Token stored in localStorage, sent in Authorization header and Socket.IO auth
4. Protected routes/events check token via `authController.verifyToken`

### Testing
No automated tests currently exist. When implementing tests:
- Backend: Test channel CRUD operations, proxy/restream logic, WebSocket events
- Frontend: Test player synchronization, channel switching, admin auth

## Common Development Scenarios

### Running Full Stack Locally
```bash
# Option 1: Docker Compose (recommended)
docker compose up -d

# Option 2: Separate processes
cd backend && npm start &
cd frontend && npm run dev &
```

### Debugging FFmpeg Issues
- Check FFmpeg is installed: `ffmpeg -version`
- Enable FFmpeg stdout logging in `FFmpegService.js` (already logs stderr)
- Verify stream URL accessibility before adding channel
- Check STORAGE_PATH permissions and disk space

### Adding Frontend Features
- State lives in `App.tsx`, passed down via props
- WebSocket updates trigger state changes
- For new API calls, add to `ApiService.ts`
- For new socket events, update `SocketService.ts` and corresponding handler

### Admin Mode Development
- Set `ADMIN_ENABLED=true` and `ADMIN_PASSWORD` in docker-compose.yml or backend .env
- Frontend detects admin mode via `/api/auth/admin-status`
- Protected operations wrapped in `AdminContext` checks
