# Development Containers for StreamHub

This repository includes DevContainer configurations for both the frontend and backend components, allowing for quick setup of development environments.

## Getting Started

1. Open the backend folder in VS Code
2. When prompted, click "Reopen in Container" or use the command palette (F1) and select "Dev Containers: Reopen in Container"
3. After the container builds and starts, the backend development environment will be ready
4. Run `npm start` to start the backend server
5. The backend will be available at http://localhost:5000

## Development Configuration

- Node.js 20 environment with FFmpeg pre-installed
- Persistent volumes for streams and channels data
- Admin mode enabled with default password "dev_password"
- Port 5000 forwarded for API access

## Customizing the Environment

You can modify the DevContainer configuration by editing:

- `.devcontainer/devcontainer.json` - VS Code settings, extensions, and container configuration
- `.devcontainer/Dockerfile` - Container image definition and dependencies