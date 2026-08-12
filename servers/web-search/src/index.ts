#!/usr/bin/env node
/**
 * web-search MCP server entry point.
 * Instantiates and starts the server — wire to an MCP transport (stdio/SSE) here.
 */
import { createServer } from './server.js';

const server = createServer();
server.start();
