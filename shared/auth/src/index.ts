import { AuthenticationError } from '@mcp-toolkit/errors';

export interface ApiKeyConfig {
  envVar: string;
  provider: string;
}

/**
 * Reads an API key from environment variables, throwing if missing.
 */
export function requireApiKey(config: ApiKeyConfig): string {
  const value = process.env[config.envVar];
  if (!value) {
    throw new AuthenticationError(
      `Missing API key for provider "${config.provider}". Set env var: ${config.envVar}`,
    );
  }
  return value;
}

/**
 * Reads an optional API key — returns undefined if not set.
 */
export function optionalApiKey(envVar: string): string | undefined {
  return process.env[envVar] || undefined;
}

/**
 * Returns an Authorization header object using the ******
 */
export function bearerHeader(token: string): Record<string, string> {
  return { Authorization: 'Bearer ' + token };
}
