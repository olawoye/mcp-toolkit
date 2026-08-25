#!/usr/bin/env node
/**
 * web-search MCP server entry point.
 * Instantiates and starts the server — wire to an MCP transport (stdio/SSE) here.
 */
import { createServer } from './server.js';

if (require.main === module) {
  const server = createServer();
  server.start();
}

export { createServer } from './server.js';
export type { McpServer, McpTool } from './server.js';
