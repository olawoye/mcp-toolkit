import { describe, it, expect } from 'vitest';
import { searchTool } from '../src/tools/search.js';

describe('web_search tool', () => {
  it('has correct name and schema', () => {
    expect(searchTool.name).toBe('web_search');
    expect(searchTool.inputSchema).toBeDefined();
  });

  it('throws ValidationError on empty query', async () => {
    await expect(searchTool.execute({ query: '' })).rejects.toThrow();
  });
});
