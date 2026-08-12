// Types for BuiltWith technology detection API — implement when wiring to a tool.

export interface BuiltWithTechnology {
  Name: string;
  Tag: string;
  FirstDetected: number;
  LastDetected: number;
}

export interface BuiltWithResponse {
  Results: Array<{
    Result: {
      Paths: Array<{ Technologies: BuiltWithTechnology[] }>;
    };
  }>;
}

/**
 * Look up the technology stack of a domain via BuiltWith.
 * Requires: BUILTWITH_API_KEY
 */
export async function builtWithLookup(_domain: string): Promise<BuiltWithResponse> {
  throw new Error('Not implemented — wire BUILTWITH_API_KEY');
}
