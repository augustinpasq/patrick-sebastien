FROM node:24-slim AS builder

LABEL org.opencontainers.image.source=https://github.com/augustinpasq/patrick-sebastien

RUN apt update && \
    apt install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e " \
        const fs = require('fs'); \
        const ts = parseInt(fs.readFileSync('/tmp/healthcheck', 'utf8')); \
        process.exit(Date.now() - ts > 90000 ? 1 : 0)" \
    || exit 1

CMD ["npm", "run", "start"]
