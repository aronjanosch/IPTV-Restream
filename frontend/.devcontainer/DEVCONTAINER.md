# Development Containers for StreamHub

This repository includes DevContainer configurations for both the frontend and backend components, allowing for quick setup of development environments.

## Getting Started

1. Open the frontend folder in VS Code
2. When prompted, click "Reopen in Container" or use the command palette (F1) and select "Dev Containers: Reopen in Container"
3. After the container builds and starts, the frontend development environment will be ready
4. Run `npm run dev` to start the development server
5. Access the frontend at http://localhost:8080

## Development Configuration

- Node.js 20 environment
- Development extensions for React, TypeScript, and TailwindCSS
- Environment variables pre-configured for development
- Port 8080 forwarded for web access
- Host network mode for easy connection to the backend

## Customizing the Environment

You can modify the DevContainer configuration by editing:

- `.devcontainer/devcontainer.json` - VS Code settings, extensions, and container configuration
- `.devcontainer/Dockerfile` - Container image definition and dependencies