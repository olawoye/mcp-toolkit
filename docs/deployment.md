# Deployment

## Running a server locally

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run a specific server
node servers/web-search/dist/index.js
```

## Environment variables

Copy `.env.example` to `.env` and fill in the required keys before running.

## Docker

Each server can be containerised independently. Example:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile && pnpm build
CMD ["node", "servers/web-search/dist/index.js"]
```

## Connecting to an AI runtime

Point your MCP-compatible runtime at the server's stdio/SSE endpoint. Each server exposes its tools automatically when `start()` is called.
