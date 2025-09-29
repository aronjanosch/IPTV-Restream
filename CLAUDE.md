# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IPTV StreamHub is a web-based IPTV restreaming and synchronization application that allows multiple users to watch IPTV streams together. The project consists of three main components:

- **Frontend**: React/TypeScript application using Vite, TailwindCSS, and HLS.js for video playback
- **Backend**: Node.js Express server handling stream proxying, restreaming (via FFmpeg), and real-time communication
- **Nginx**: Reverse proxy for routing and serving static content

## Architecture

### Frontend (`/frontend/`)
- **Framework**: React 18 with TypeScript and Vite
- **Styling**: TailwindCSS for UI components
- **Video Player**: HLS.js for adaptive streaming
- **Communication**: Socket.io-client for real-time sync and chat
- **Key Services**:
  - `ApiService.ts`: HTTP API communication with backend
  - `SocketService.ts`: WebSocket connection management
- **Components**: Modular React components in `/src/components/`

### Backend (`/backend/`)
- **Framework**: Node.js with Express
- **Stream Processing**: FFmpeg for restreaming functionality
- **Real-time**: Socket.io for synchronization and chat
- **Controllers**:
  - `ChannelController.js`: IPTV channel management
  - `ProxyController.js`: Stream proxying functionality
- **Services**: Utility services for stream processing

### Stream Modes
The application supports three streaming modes:
1. **Direct**: Streams directly from source (limited by CORS/restrictions)
2. **Proxy**: Routes requests through backend (preferred for most cases)
3. **Restream**: FFmpeg transcodes and serves streams (for device restrictions)

## Development Commands

### Full Stack Development
```bash
# Start entire application with Docker Compose (recommended)
docker compose up -d

# Start with pre-built images
docker compose -f deployment/ghcr-docker-compose.yml up

# Stop all services
docker compose down
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Backend Development
```bash
cd backend
npm install
npm start          # Start production server
npm test          # Run tests (not implemented)
```

### Docker Development
```bash
# Build frontend image
cd frontend
docker build --build-arg VITE_BACKEND_STREAMS_PATH=/streams/ --build-arg VITE_STREAM_DELAY=18 -t iptv_restream_frontend .

# Build backend image
cd backend
docker build -t iptv_restream_backend .
```

## Environment Configuration

### Frontend Environment Variables
- `VITE_BACKEND_URL`: Backend server URL (default: auto-detected)
- `VITE_STREAM_DELAY`: Stream delay in seconds (default: 18)
- `VITE_STREAM_PROXY_DELAY`: Proxy mode delay (default: 30)
- Synchronization settings: `VITE_SYNCHRONIZATION_*` variables

### Backend Environment Variables
- `STORAGE_PATH`: Directory for stream storage (default: /streams/)
- `BACKEND_URL`: Manual backend URL override for playlist generation

## Key Implementation Details

### Stream Synchronization
- Uses constant delay mechanism for synchronized playback
- Configurable tolerance and adjustment parameters
- WebSocket events coordinate channel selection across clients

### API Endpoints
- `/api/channels/*`: Channel management (CRUD operations)
- `/api/channels/playlist`: M3U playlist for external players
- `/proxy/*`: Stream proxying functionality
- `/streams/*`: Restreamed content access

### WebSocket Events
- `channel-selected`: Broadcast channel changes
- `send-chat-message`/`chat-message`: Real-time chat
- `user-connected`/`user-disconnected`: User presence

## Testing

Currently no automated test suite is implemented. Test manually by:
1. Running `docker compose up -d`
2. Opening http://localhost
3. Adding IPTV channels and testing different streaming modes
4. Verifying synchronization with multiple browser tabs/devices

## Deployment Notes

- Use Docker Compose for consistent deployments
- Streams stored in tmpfs for performance (configurable in docker-compose.yml)
- Nginx handles reverse proxying and static content
- Production deployments should configure SSL certificates
- FFmpeg required for restream functionality