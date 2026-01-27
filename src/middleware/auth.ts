import { Request, Response, NextFunction } from "express";
import admin from "../config/firebase";

/**
 * Middleware to authenticate Firebase ID tokens
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: No token provided" });
      return;
    }

    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      res.status(401).json({ error: "Unauthorized: Invalid token format" });
      return;
    }

    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);

    console.log(
      `🔐 [AuthMiddleware] Token verified. UID: ${decodedToken.uid}, Email: ${decodedToken.email}`,
    );

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      email_verified: decodedToken.email_verified,
    };

    next();
  } catch (error) {
    console.error("❌ [AuthMiddleware] Token verification FAILED:", error);
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }
}
