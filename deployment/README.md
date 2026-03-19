# Deployment

## Docker 

### Easy Way (Preffered)
Clone the repo

```bash
git clone https://github.com/antebrl/IPTV-Restream.git
```

Make sure to have docker up & running. Start with docker compose
```bash
docker compose up -d
```
Open http://localhost

### Production Build (with SSL certificate)
If you want to expose the application to the public under your domain, [this](docker-compose.yml) could be an easy deployment to get it working with `https`. You still have to configure nginx-proxy-manager when using this solution.

### Prebuild Images
Use the [ghcr-docker-compose.yml](ghcr-docker-compose.yml).
```bash
docker compose -f ghcr-docker-compose.yml up
```

Disadvantages:
- not always up to date
- cannot set custom configuration for the frontend, as the config is parsed in the image build process