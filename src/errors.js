export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class UpstreamError extends AppError {
  constructor(status, code, message, retryAfterSeconds) {
    super(status, code, message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
