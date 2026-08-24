import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "./app-error.js";

export const errorHandler: ErrorHandler = (error, c) => {
  console.error(error);

  if (error instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      error.statusCode as ContentfulStatusCode,
    );
  }

  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "خطای داخلی سرور",
      },
    },
    500,
  );
};