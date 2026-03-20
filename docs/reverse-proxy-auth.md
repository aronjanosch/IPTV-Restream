# Reverse Proxy & Authentication

The application runs as a single container on port `5000`. A reverse proxy sits in front of it to handle TLS, authentication, and routing.

## Path Routing

Not all paths should be protected by SSO. External players (VLC, Smart TV, Apple TV) connect to `/proxy/current` and cannot perform OAuth/SSO flows. The reverse proxy must therefore split traffic:

| Path prefix | Auth required | Why |
|---|---|---|
| `/proxy/*`, `/streams/*`, `/api/*` | No (bypass SSO) | Stream playback, HLS segments, channel API |
| Everything else | Yes (SSO) | Web UI — admin panel, channel management |

Stream-facing paths are protected at the **application level** via HTTP Basic Auth (see [Stream Authentication](#stream-authentication) below).

---

## Option A — Nginx Proxy Manager + Authentik

NPM supports raw Nginx directives in the "Advanced" tab of each proxy host. Use `auth_request` to forward authentication to Authentik.

### Proxy Host Settings

| Field | Value |
|---|---|
| Domain | `your-iptv-domain.com` |
| Scheme | `http` |
| Forward Hostname | `localhost` (or container IP) |
| Forward Port | `5000` |
| Websockets Support | **On** (required for Socket.IO) |
| Block Common Exploits | On |

### Advanced Tab (Nginx config)

```nginx
# Authentik outpost — forward auth endpoint
location /outpost.goauthentik.io {
    proxy_pass          https://auth.yourdomain.com/outpost.goauthentik.io;
    proxy_set_header    Host $host;
    proxy_set_header    X-Original-URL $scheme://$http_host$request_uri;
    proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header    X-Forwarded-Proto $scheme;
    proxy_pass_request_body off;
    proxy_set_header    Content-Length "";
}

# Stream paths — bypass SSO, pass straight through
location ~* ^/(proxy|streams|api)/ {
    proxy_pass          http://localhost:5000;
    proxy_set_header    Host $host;
    proxy_set_header    X-Real-IP $remote_addr;
    proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header    X-Forwarded-Proto $scheme;
    proxy_http_version  1.1;
    proxy_set_header    Upgrade $http_upgrade;
    proxy_set_header    Connection "upgrade";
}

# All other paths — require Authentik SSO
auth_request        /outpost.goauthentik.io/auth/nginx;
error_page 401    = @goauthentik_proxy_signin;
auth_request_set $auth_cookie $upstream_http_set_cookie;
add_header Set-Cookie $auth_cookie;

location @goauthentik_proxy_signin {
    internal;
    add_header Set-Cookie $auth_cookie;
    return 302 /outpost.goauthentik.io/start?rd=$scheme://$http_host$request_uri;
}
```

Replace `https://auth.yourdomain.com` with your Authentik instance URL.

### Authentik Setup

1. Create a **Proxy Provider** — mode: *Forward auth (single application)*, external host: `https://your-iptv-domain.com`
2. Create an **Application** linked to that provider
3. Assign the application to an **Outpost** (the embedded outpost works fine)

The outpost does not need to run on the same server as the IPTV app — it only needs to be reachable via its public HTTPS URL.

---

## Option B — Traefik + Authentik

Use a high-priority router for stream paths that bypasses the Authentik middleware, and a normal-priority router for the web UI.

```yaml
# Stream paths — high priority, no Authentik
- "traefik.http.routers.iptv-streams.rule=Host(`your-iptv-domain.com`) && (PathPrefix(`/proxy`) || PathPrefix(`/streams`) || PathPrefix(`/api`))"
- "traefik.http.routers.iptv-streams.priority=99"
- "traefik.http.routers.iptv-streams.entrypoints=websecure"
- "traefik.http.routers.iptv-streams.tls=true"
- "traefik.http.routers.iptv-streams.service=iptv-svc"

# Web UI — normal priority, Authentik middleware
- "traefik.http.routers.iptv.rule=Host(`your-iptv-domain.com`)"
- "traefik.http.routers.iptv.entrypoints=websecure"
- "traefik.http.routers.iptv.middlewares=authentik@docker"
- "traefik.http.routers.iptv.tls=true"
- "traefik.http.routers.iptv.service=iptv-svc"

- "traefik.http.services.iptv-svc.loadbalancer.server.port=5000"
```

---

## Stream Authentication

`/proxy/current` (the single URL used by external players) is protected by HTTP Basic Auth at the application level, independent of the SSO layer. This allows Smart TVs, VLC, and other players that cannot perform OAuth flows to authenticate using credentials embedded in the URL.

### Environment Variables

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Full admin access — manage channels, watch stream |
| `STREAM_PASSWORD` | Stream-only access — watch `/proxy/current` only |

### External Player URL Format

```
https://stream:YOUR_STREAM_PASSWORD@your-iptv-domain.com/proxy/current
```

Most players support credentials in the URL directly (VLC, Kodi, IPTV Smarters, TiviMate). For players that use separate credential fields, use `stream` as the username and `STREAM_PASSWORD` as the password.

---

## Future Authentication

The current setup relies entirely on the reverse proxy for web UI authentication. Planned improvements:

- **Native login system** — username/password auth built into the application, removing the dependency on an external SSO proxy for basic access control
- **OIDC/OAuth2 integration** — allow Authentik (or any OIDC provider) to be configured directly in the app, so SSO works without requiring proxy-level forward auth configuration
