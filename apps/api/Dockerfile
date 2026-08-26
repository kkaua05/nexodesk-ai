FROM node:22-bookworm-slim

# System Chromium + the shared libs whatsapp-web.js (via Puppeteer) needs to launch
# headless Chrome in a container — without these, Chrome fails to start with an opaque
# "Failed to launch the browser process" error. Using the distro's Chromium instead of
# Puppeteer's bundled download keeps the image smaller and the version pinned to what
# Debian ships.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/api
EXPOSE 3333
CMD ["node", "scripts/run-server.mjs", "src/server.ts"]
