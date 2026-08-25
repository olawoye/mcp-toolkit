#!/usr/bin/env node
import { createServer } from './server.js';

if (require.main === module) {
  const server = createServer();
  server.start();
}

export { createServer } from './server.js';
export type { McpServer, McpTool } from './server.js';
