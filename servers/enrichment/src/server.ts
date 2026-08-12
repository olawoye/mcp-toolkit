import { createLogger } from '@mcp-toolkit/logging';
import { enrichCompanyTool } from './tools/company.js';
import { enrichPersonTool } from './tools/person.js';
import { enrichEmailTool } from './tools/email.js';
import { enrichPhoneTool } from './tools/phone.js';

const logger = createLogger('enrichment-server');

export interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
  execute(input: unknown): Promise<unknown>;
}

export interface McpServer {
  name: string;
  version: string;
  tools: McpTool[];
  start(): void;
}

export function createServer(): McpServer {
  const tools = [enrichCompanyTool, enrichPersonTool, enrichEmailTool, enrichPhoneTool];
  return {
    name: 'enrichment',
    version: '0.1.0',
    tools,
    start() {
      logger.info('MCP Enrichment server ready', { tools: tools.map((t) => t.name) });
    },
  };
}
