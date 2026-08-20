import { AppError, logServerError } from "@/lib/utils/errors";

export function fromDatabaseError(error: unknown, fallback = "A database error occurred."): AppError {
  logServerError("database", error);
  return new AppError("DATABASE_ERROR", fallback, 500);
}
