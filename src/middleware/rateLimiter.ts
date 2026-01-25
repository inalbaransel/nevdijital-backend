import rateLimit from "express-rate-limit";

/**
 * General API rate limiter
 * 100 requests per minute
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Upload rate limiter
 * 10 uploads per 15 minutes
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per windowMs
  message: {
    error: "Too many file uploads, please wait 15 minutes before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
