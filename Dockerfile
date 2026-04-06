# ── Single-stage build ────────────────────────────────────
FROM node:22-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root + package manifests (for cache-friendly layer)
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

# Install production deps for server workspace only
RUN npm install --omit=dev --ignore-scripts --workspace=packages/server --workspace=packages/client && \
    npm rebuild better-sqlite3

# Copy server source
COPY packages/server/ packages/server/

# Copy client static files
COPY packages/client/ packages/client/

# Data directories (DB + uploads) — mount as volumes for persistence
RUN mkdir -p /data/uploads

ENV PORT=3000
ENV DATABASE_URL=/data/database.sqlite
ENV APPDATA_PATH=/data
ENV CLIENT_ROOT=/app/packages/client

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:3000/').then(r=>{if(!r.ok)throw r.status}).catch(()=>process.exit(1))"

CMD ["node", "packages/server/server.js"]
