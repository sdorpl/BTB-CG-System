FROM node:22-slim

# Install build dependencies for native modules (sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies (skip electron postinstall — not needed in Docker)
RUN npm install --omit=dev --ignore-scripts && \
    npm rebuild better-sqlite3

# Copy application source
COPY . .

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
