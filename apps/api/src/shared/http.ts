import type { Request, RequestHandler, Response } from "express";
import type { Result, ResultAsync } from "neverthrow";
import type { AppError } from "./errors";

const statusOf: Record<AppError["type"], number> = {
  NotFound: 404,
  Validation: 400,
  Unauthorized: 401,
  Forbidden: 403,
  Conflict: 409,
  Unexpected: 500,
};

/** The only place where domain errors become HTTP responses. */
export const sendResult = <T>(res: Response, result: Result<T, AppError>, successStatus = 200) =>
  result.match(
    (data) => res.status(successStatus).json(data),
    (error) => {
      if (error.type === "Unexpected") console.error(error.message, error.cause);
      const body = error.type === "Validation" ? { issues: error.issues } : {};
      return res.status(statusOf[error.type]).json({ code: error.type, message: error.message, ...body });
    },
  );

/** Turns a function that returns ResultAsync into an Express handler. */
export const handle =
  <T>(run: (req: Request) => ResultAsync<T, AppError>, successStatus = 200): RequestHandler =>
  async (req, res) => {
    sendResult(res, await run(req), successStatus);
  };
