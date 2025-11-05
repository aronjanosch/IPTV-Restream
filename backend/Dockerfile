# Backend Dockerfile
FROM node:20

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5000
CMD ["npm", "start"]