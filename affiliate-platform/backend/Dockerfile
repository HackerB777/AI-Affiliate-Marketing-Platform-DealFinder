# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create log directory
RUN mkdir -p /logs

EXPOSE 5000

CMD ["node", "server.js"]
