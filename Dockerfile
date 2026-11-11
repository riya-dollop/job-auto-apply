FROM node:22-slim

# Install Chromium and required runtime libraries for Puppeteer on Debian/Ubuntu
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Point Puppeteer to the system-installed Chromium binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PORT=5000 \
    HEADLESS=true

WORKDIR /app

# Copy dependency manifests first for fast Docker layer caching
COPY package*.json ./
COPY client/package*.json ./client/

# Install root & client dependencies (including devDependencies like Vite)
RUN npm install
RUN npm --prefix client install --include=dev

# Copy application source files
COPY . .

# Build client production bundle (Vite SPA into client/dist)
RUN npm --prefix client run build

ENV NODE_ENV=production

# Expose backend REST & static server port
EXPOSE 5000

# Start server
CMD ["node", "server/server.js"]
