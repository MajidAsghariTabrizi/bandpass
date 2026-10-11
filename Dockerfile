# Minimal image for the bandpass MCP server (stdio transport).
# Their listing harness builds this and runs MCP introspection:
#   docker build -t bandpass .
#   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"check","version":"0"}}}' | docker run -i --rm bandpass
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# stdio MCP: no ports, no daemons — reads JSON-RPC on stdin
ENTRYPOINT ["node", "dist/cli.js", "mcp"]
