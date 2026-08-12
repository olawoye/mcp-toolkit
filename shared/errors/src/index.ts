export class McpToolkitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'McpToolkitError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends McpToolkitError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends McpToolkitError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends McpToolkitError {
  constructor(
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends McpToolkitError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ProviderError extends McpToolkitError {
  constructor(
    message: string,
    public readonly provider: string,
    statusCode = 502,
  ) {
    super(message, 'PROVIDER_ERROR', statusCode);
    this.name = 'ProviderError';
  }
}
