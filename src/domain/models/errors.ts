/**
 * Domain exceptions for the LLM system.
 */

/**
 * Base class for all domain exceptions.
 */
export class DomainError extends Error {
  public override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Base class for LLM-related errors.
 */
export class LLMError extends DomainError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Exception raised when the LLM service is unavailable.
 */
export class LLMUnavailableError extends LLMError {
  constructor(message: string = "LLM service is unavailable", cause?: Error) {
    super(message, cause);
  }
}

/**
 * Exception raised when LLM authentication fails.
 */
export class LLMAuthenticationError extends LLMError {
  constructor(message: string = "LLM authentication failed", cause?: Error) {
    super(message, cause);
  }
}

/**
 * Exception raised when LLM rate limit is exceeded.
 */
export class LLMRateLimitError extends LLMError {
  constructor(message: string = "LLM rate limit exceeded", cause?: Error) {
    super(message, cause);
  }
}

/**
 * Exception raised when LLM request times out.
 */
export class LLMTimeoutError extends LLMError {
  constructor(message: string = "LLM request timed out", cause?: Error) {
    super(message, cause);
  }
}

/**
 * Exception raised when input validation fails.
 */
export class ValidationError extends DomainError {
  constructor(message: string = "Input validation failed", cause?: Error) {
    super(message, cause);
  }
}
