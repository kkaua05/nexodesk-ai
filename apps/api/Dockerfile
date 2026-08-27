FROM node:22-bookworm-slim

# Only the shared libs headless Chrome needs to launch in a container — without these,
# Chrome fails to start with an opaque "Failed to launch the browser process" error.
# Puppeteer downloads and runs its OWN matched Chromium build during `pnpm install`
# below (same as local dev, where no PUPPETEER_EXECUTABLE_PATH is set) — we intentionally
# do NOT substitute Debian's `chromium` apt package here. That substitution was tried
# first (smaller image, version pinned to what Debian ships) but caused WhatsApp-linking
# to hang/crash in production ("Execution context was destroyed") in a way that never
# reproduced locally: Puppeteer is tested against one specific Chromium build per
# release, and pairing it with an arbitrary distro build reintroduces exactly this class
# of obscure protocol/timing bug.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc-s1 \
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
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/api
EXPOSE 3333
CMD ["node", "scripts/run-server.mjs", "src/server.ts"]
