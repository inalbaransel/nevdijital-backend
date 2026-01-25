// Extend Express Request interface to include user
declare namespace Express {
  interface Request {
    user?: {
      uid: string;
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };
  }
}
