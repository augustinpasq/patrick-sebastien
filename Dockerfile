FROM node:24-slim AS builder

LABEL org.opencontainers.image.source=https://github.com/augustinpasq/patrick-sebastien

RUN apt update && \
    apt install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "start"]
