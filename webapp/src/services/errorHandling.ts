import { ZodError } from 'zod';

export interface ServiceErrorOptions {
  code?: string;
  cause?: unknown;
  status?: number;
  details?: unknown;
}

export class ServiceError extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(message: string, options: ServiceErrorOptions = {}) {
    super(message);
    this.name = 'ServiceError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    if (options.cause !== undefined) {
      Object.defineProperty(this, 'cause', { value: options.cause, configurable: true });
    }
  }
}

export function isServiceError(value: unknown): value is ServiceError {
  return value instanceof ServiceError;
}

export function toServiceError(input: unknown, fallback: string, options: ServiceErrorOptions = {}): ServiceError {
  if (input instanceof ServiceError) {
    return input;
  }
  if (input instanceof Error) {
    const merged: ServiceErrorOptions = {
      ...options,
      cause: input,
    };
    if (typeof (input as { code?: unknown }).code === 'string') {
      merged.code = merged.code ?? ((input as { code?: string }).code as string);
    }
    if (typeof (input as { status?: unknown }).status === 'number') {
      merged.status = merged.status ?? ((input as { status?: number }).status as number);
    }
    const message = input.message && input.message.trim() ? input.message : fallback;
    return new ServiceError(message, merged);
  }
  if (typeof input === 'string' && input.trim()) {
    return new ServiceError(input.trim(), options);
  }
  return new ServiceError(fallback, { ...options, cause: input });
}

export function fromZodError(error: ZodError, fallback: string, options: ServiceErrorOptions = {}): ServiceError {
  const details = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
  const message = details.length
    ? `${fallback}: ${details.map((detail) => detail.message).join('; ')}`
    : fallback;
  return new ServiceError(message, { ...options, cause: error, details });
}
