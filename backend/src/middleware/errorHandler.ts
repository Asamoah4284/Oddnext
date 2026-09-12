import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { config } from "../config.js";
import { HttpError } from "../utils/httpError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: err.flatten(),
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    message: "Internal server error",
    ...(config.isDev && err instanceof Error ? { detail: err.message } : {}),
  });
}
