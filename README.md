# IPTV StreamHub

A self-hosted IPTV restreaming application for synchronized group viewing. Supports direct, proxy, and FFmpeg restream modes with a real-time React frontend.

## Stack

- **Backend**: Node.js 22 / Express / Socket.IO / FFmpeg
- **Frontend**: React 18 / TypeScript / Vite / HLS.js / Tailwind CSS
- **Deployment**: Docker Compose — designed for use behind [Nginx Proxy Manager](https://nginxproxymanager.com/)

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

Frontend is exposed on port **3000**, backend on port **5000**.

### Nginx Proxy Manager Setup

Create a proxy host pointing to `localhost:3000` and add this to the **Advanced** tab:

```nginx
location ~* ^/(api|socket\.io|proxy|streams)/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Environment Variables

Configure in `docker-compose.yml` before starting:

| Variable | Default | Description |
|---|---|---|
| `ADMIN_ENABLED` | `true` | Enable admin mode |
| `ADMIN_PASSWORD` | — | Admin login password |
| `JWT_SECRET` | — | JWT signing secret (change this) |
| `STORAGE_PATH` | `/streams/` | HLS segment output path (tmpfs) |
| `BACKEND_URL` | auto-detected | Set explicitly if behind a reverse proxy |
| `VITE_STREAM_DELAY` | `18` | Restream sync delay in seconds |
| `VITE_STREAM_PROXY_DELAY` | `30` | Proxy mode sync delay in seconds |

## Development

```bash
# Backend
cd backend && npm install && node server.js

# Frontend
cd frontend && npm install && npm run dev
```

## License

MIT
