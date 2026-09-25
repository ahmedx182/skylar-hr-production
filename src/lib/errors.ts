/** Errors whose message is safe to show a user. Anything else is treated as internal. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required.", options?: ErrorOptions) {
    super("unauthenticated", 401, message, options);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Not allowed.", options?: ErrorOptions) {
    super("forbidden", 403, message, options);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request.", options?: ErrorOptions) {
    super("invalid_request", 400, message, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.", options?: ErrorOptions) {
    super("not_found", 404, message, options);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict.", options?: ErrorOptions) {
    super("conflict", 409, message, options);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "A dependency failed. Try again.", options?: ErrorOptions) {
    super("upstream_failure", 502, message, options);
  }
}

export interface ErrorResponse {
  status: number;
  body: { error: { code: string; message: string } };
}

/** Maps any thrown value to a safe status and body. Causes and internals never leave the server. */
export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message } },
    };
  }
  return {
    status: 500,
    body: { error: { code: "internal", message: "Something went wrong." } },
  };
}
