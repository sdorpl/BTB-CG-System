FROM node:22-slim

# Install build dependencies for native modules (sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files (workspaces config) and workspace package.json files
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

# Install production dependencies for the server workspace (skip electron/desktop)
RUN npm install --omit=dev --ignore-scripts --workspace=packages/server --workspace=packages/client && \
    npm rebuild better-sqlite3

# Copy server and client sources
COPY packages/server/ packages/server/
COPY packages/client/ packages/client/

# Expose the application port
EXPOSE 3000

# Set explicit port for Docker (overrides default listen(0))
ENV PORT=3000

# Start the server
CMD ["node", "packages/server/server.js"]
