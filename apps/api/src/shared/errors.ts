// Domain errors are plain values (no classes), returned inside neverthrow's Result.

export type AppError =
  | { type: "NotFound"; message: string }
  | { type: "Validation"; message: string; issues?: unknown }
  | { type: "Unauthorized"; message: string }
  | { type: "Forbidden"; message: string }
  | { type: "Conflict"; message: string }
  | { type: "Unexpected"; message: string; cause?: unknown };

export const appError = {
  notFound: (message: string): AppError => ({ type: "NotFound", message }),
  validation: (message: string, issues?: unknown): AppError => ({ type: "Validation", message, issues }),
  unauthorized: (message = "Sign in required"): AppError => ({ type: "Unauthorized", message }),
  forbidden: (message = "Not allowed"): AppError => ({ type: "Forbidden", message }),
  conflict: (message: string): AppError => ({ type: "Conflict", message }),
  unexpected: (message: string, cause?: unknown): AppError => ({ type: "Unexpected", message, cause }),
};
