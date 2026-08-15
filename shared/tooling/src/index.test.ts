import { describe, it, expect } from 'vitest';
import { ToolRegistry } from './index';

const webSearchTool = {
  name: 'web_search',
  server: 'web-search',
  description: 'Search the web',
  capabilities: ['web-search'],
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Query string' } },
    required: ['query'],
  },
  async execute(input: unknown) {
    return { input };
  },
};

const mapsTool = {
  name: 'maps_search_places',
  server: 'maps',
  description: 'Search places',
  capabilities: ['maps'],
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Place query' } },
    required: ['query'],
  },
  async execute(input: unknown) {
    return { input };
  },
};

describe('ToolRegistry', () => {
  it('registers and retrieves tools by name', () => {
    const registry = new ToolRegistry([webSearchTool, mapsTool]);
    expect(registry.get('web_search')).toEqual(webSearchTool);
    expect(registry.get('maps_search_places')).toEqual(mapsTool);
  });

  it('groups tools by server and capability', () => {
    const registry = new ToolRegistry([webSearchTool, mapsTool]);
    expect(registry.byServer('web-search')).toHaveLength(1);
    expect(registry.byCapabilities(['maps'])).toHaveLength(1);
  });

  it('selects a subset of tools without loading the whole monolith', () => {
    const registry = new ToolRegistry([webSearchTool, mapsTool]);
    const selected = registry.select(['maps_search_places']);
    expect(selected.map((tool) => tool.server)).toEqual(['maps']);
  });
});
