import { err, ok, type Result } from "neverthrow";
import type { ZodType } from "zod";
import { appError, type AppError } from "./errors";

/** Validates input with a shared Zod schema and returns a Result instead of throwing. */
export const parseWith = <T>(schema: ZodType<T>, input: unknown): Result<T, AppError> => {
  const parsed = schema.safeParse(input);
  return parsed.success ? ok(parsed.data) : err(appError.validation("Invalid input", parsed.error.issues));
};
