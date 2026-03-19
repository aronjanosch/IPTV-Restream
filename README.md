# IPTV StreamHub

A self-hosted IPTV restreaming application for synchronized group viewing. Supports direct, proxy, and FFmpeg restream modes with a real-time React frontend.

## Stack

- **Backend**: Node.js 22 / Express / Socket.IO / FFmpeg
- **Frontend**: React 18 / TypeScript / Vite / HLS.js / Tailwind CSS
- **Deployment**: Single Docker container — designed for use behind [Nginx Proxy Manager](https://nginxproxymanager.com/)

## Streaming Modes

| Mode | How it works |
|---|---|
| **Direct** | Stream URL passed straight to the client |
| **Proxy** | Server proxies HLS segments, handles CORS and custom headers |
| **Restream** | FFmpeg transcodes to HLS; starts/stops based on viewer count |

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Nginx Proxy Manager (or any reverse proxy)

### Run

```bash
docker compose up -d
```

The app is available on port **5000**. Point your reverse proxy at `localhost:5000`.

### Nginx Proxy Manager Setup

Create a proxy host for your domain pointing to `localhost:5000`. No advanced config needed — everything (frontend, API, WebSocket, HLS) is served from the same port.

### Environment Variables

Configure in `docker-compose.yml` before building:

| Variable | Default | Description |
|---|---|---|
| `ADMIN_ENABLED` | `true` | Enable admin mode |
| `ADMIN_PASSWORD` | — | Admin login password |
| `JWT_SECRET` | — | JWT signing secret (change this) |
| `STORAGE_PATH` | `/streams/` | HLS segment output path (tmpfs) |
| `BACKEND_URL` | auto-detected | Set explicitly if behind a reverse proxy and playlist URLs are wrong |
| `VITE_STREAM_DELAY` | `18` | Restream sync delay in seconds (build arg) |
| `VITE_STREAM_PROXY_DELAY` | `30` | Proxy mode sync delay in seconds (build arg) |

## Development

Frontend and backend can be run separately during development. The Vite dev server proxies all API and socket calls to the backend automatically.

```bash
# Backend
cd backend && npm install && node server.js

# Frontend (in a separate terminal)
cd frontend && npm install && npm run dev
```

Frontend dev server runs on `http://localhost:8080` and proxies to `http://localhost:5000`.

## License

MIT
