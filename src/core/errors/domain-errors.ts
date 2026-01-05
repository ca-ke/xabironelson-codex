export class DomainError extends Error {
  public override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LLMError extends DomainError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

export class LLMUnavailableError extends LLMError {
  constructor(message: string = "LLM service is unavailable", cause?: Error) {
    super(message, cause);
  }
}

export class LLMAuthenticationError extends LLMError {
  constructor(message: string = "LLM authentication failed", cause?: Error) {
    super(message, cause);
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(message: string = "LLM rate limit exceeded", cause?: Error) {
    super(message, cause);
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(message: string = "LLM request timed out", cause?: Error) {
    super(message, cause);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string = "Input validation failed", cause?: Error) {
    super(message, cause);
  }
}
