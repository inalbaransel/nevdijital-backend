import { Request, Response, NextFunction } from "express";

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
}

/**
 * Global Error Handler (500)
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("❌ Error:", err);

  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(500).json({
    error: "Internal server error",
    ...(isDevelopment && {
      message: err.message,
      stack: err.stack,
    }),
  });
}
