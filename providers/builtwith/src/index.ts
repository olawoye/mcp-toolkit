import { requireApiKey } from '@mcp-toolkit/auth';
import { httpGet } from '@mcp-toolkit/http';
import { buildUrl } from '@mcp-toolkit/utils';

const BASE = 'https://api.builtwith.com/v21/api.json';

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

export async function builtWithLookup(domain: string): Promise<BuiltWithResponse> {
  const key = requireApiKey({ envVar: 'BUILTWITH_API_KEY', provider: 'BuiltWith' });
  const url = buildUrl(BASE, { KEY: key, LOOKUP: domain });
  const response = await httpGet<BuiltWithResponse>(url);
  return response.data;
}
