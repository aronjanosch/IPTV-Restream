# Frontend

A simple React webpage that can stream iptv streams in hls-format. Provides synchronized playback by using a constant delay. Also supports multiple IPTV streams (channel selection) and a chat if using together with the backend.

## 🚀 Run

It is strongly advised to [use the frontend together with the backend](../deployment/README.md). There is also a `direct` mode which doesn't route the iptv traffic through the backend.


If you still want to use it standalone, consider these options:

### With Docker (Preferred)

```bash
docker run -d \
  --name iptv_restream_frontend \
  -p 8080:80 \
  ghcr.io/antebrl/iptv-restream/frontend:{currentVersion}
```
See the `{currentVersion}` in the [package registry](https://github.com/antebrl/IPTV-Restream/pkgs/container/iptv-restream%2Ffrontend) e.g. `v2.1`.

#### Build

In this directory:
```bash
docker build --build-arg VITE_BACKEND_STREAMS_PATH=/streams/ --build-arg VITE_STREAM_DELAY=18 -t iptv_restream_frontend
```

```bash
docker run -d iptv_restream_backend
```

### Bare metal

Setup a `.env` file or 
equivalent environment variables:
```env
#VITE_BACKEND_URL: http://123.123.123.123:5000
VITE_STREAM_DELAY: 18
```

Run with npm:
```bash
npm install
npm run dev
```

To use together with the backend, [run with docker](../README.md#run-with-docker-preferred).

## ℹ️ Usage without the backend
You have to make some adjustments in the code as the frontend requires websocket connection to the backend at the moment. Use this at your own risk.

