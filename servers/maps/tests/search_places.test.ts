import { describe, it, expect } from 'vitest';
import { searchPlacesTool } from '../src/tools/search_places.js';

describe('maps_search_places tool', () => {
  it('has correct name', () => {
    expect(searchPlacesTool.name).toBe('maps_search_places');
  });
  it('throws on missing query', async () => {
    await expect(searchPlacesTool.execute({ query: '' })).rejects.toThrow();
  });
});
