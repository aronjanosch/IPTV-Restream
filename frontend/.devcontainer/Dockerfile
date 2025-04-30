FROM node:20

WORKDIR /workspace

# Install basic development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Ensure node user owns workspace
RUN chown -R node:node /workspace

USER node

CMD ["npm", "run", "dev"]