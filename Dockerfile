FROM node:24-slim AS builder

LABEL org.opencontainers.image.source=https://github.com/augustinpasq/patrick-sebastien

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "start"]
