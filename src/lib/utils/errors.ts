export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof EnvError) {
    return error.message;
  }
  return fallback;
}

export function logServerError(context: string, error: unknown): void {
  const detail =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { error };
  console.error(`[${context}]`, detail);
}
