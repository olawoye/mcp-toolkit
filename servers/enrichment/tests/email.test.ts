import { describe, it, expect } from 'vitest';
import { enrichEmailTool } from '../src/tools/email.js';

describe('enrich_email tool', () => {
  it('has correct name', () => {
    expect(enrichEmailTool.name).toBe('enrich_email');
  });
  it('throws when neither domain nor email provided', async () => {
    await expect(enrichEmailTool.execute({})).rejects.toThrow();
  });
});
