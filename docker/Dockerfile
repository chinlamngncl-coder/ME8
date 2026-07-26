# Mobility Axiom — production app image (protected ship blob)
#
# Build (after npm run build:ship):
#   docker build -f docker/Dockerfile -t mobility-axiom:local .
#
# Runtime still needs storage/license.lic, ports, and usually host or sidecar
# Valkey/Postgres/WVP/ZLM from docker/docker-compose.enterprise.yml + WVP/ZLM compose.
#
# Primary customer path remains host zip (node run.js). This image is for
# controlled container deploys and CI release artifacts.

FROM node:22-bookworm-slim

WORKDIR /app

# Production deps from the staged ship package.json (external to the esbuild blob)
COPY ship-build/protected/package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force

COPY ship-build/protected/ ./

# Customer data mount points
RUN mkdir -p /app/storage /app/keys \
  && chown -R node:node /app

ENV NODE_ENV=production \
    FM_AIRGAP_LICENSE_REQUIRED=1 \
    FM_HTTPS_ENABLED=0

USER node

EXPOSE 3888 5060/udp 29201/udp

VOLUME ["/app/storage", "/app/keys"]

CMD ["node", "run.js"]
