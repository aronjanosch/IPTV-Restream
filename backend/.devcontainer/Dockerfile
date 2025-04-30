FROM node:20

# Install ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Create directories for volumes
RUN mkdir -p /streams /channels \
    && chown -R node:node /workspace /streams /channels

USER node

EXPOSE 5000
CMD ["npm", "start"]