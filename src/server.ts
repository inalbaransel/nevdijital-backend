import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Environment variables
dotenv.config();

// Initialize Express & Prisma
const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

// Socket.io setup with CORS
const isDev = process.env.NODE_ENV === "development";
const allowedOrigins = (
  process.env.FRONTEND_URL || "http://localhost:3000"
).split(",");

const io = new Server(httpServer, {
  cors: {
    origin: isDev ? true : allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: isDev ? true : allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Firebase Admin
import { initializeFirebaseAdmin } from "./config/firebase";
initializeFirebaseAdmin();

// Import middleware
import { authenticateToken } from "./middleware/auth";
import { apiRateLimiter, uploadRateLimiter } from "./middleware/rateLimiter";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

// Import routes
import messagesRouter from "./routes/messages";
import groupsRouter from "./routes/groups";
import usersRouter from "./routes/users";
import filesRouter from "./routes/files";
import uploadRouter from "./routes/upload";
import statusesRouter from "./routes/statuses";
import scheduleRouter from "./routes/schedule";

// Apply rate limiting to all API routes
app.use("/api", apiRateLimiter);

// Health check endpoint (no auth required)
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes (protected with authentication)
app.use("/api/messages", authenticateToken, messagesRouter);
app.use("/api/groups", authenticateToken, groupsRouter);
app.use("/api/users", usersRouter);
app.use("/api/files", authenticateToken, filesRouter);
app.use("/api/upload", authenticateToken, uploadRateLimiter, uploadRouter);
app.use("/api/statuses", authenticateToken, statusesRouter);
app.use("/api/schedule", authenticateToken, scheduleRouter);

// Socket.io Authentication Middleware
import admin from "./config/firebase";

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user data to socket
    socket.data.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };

    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication error: Invalid token"));
  }
});

// Socket.io Events
// Socket.io Events
io.on("connection", async (socket) => {
  const user = socket.data.user;
  console.log(`✅ User connected: ${socket.id} (${user?.email})`);

  // SET ONLINE STATUS
  if (user?.uid) {
    try {
      // 1. Update DB -> Online
      const dbUser = await prisma.user.update({
        where: { uid: user.uid },
        data: { isOnline: true },
        select: { id: true, groupId: true },
      });

      // 2. Broadcast to their group if they have one
      if (dbUser.groupId) {
        socket.join(dbUser.groupId); // Auto-join room based on DB
        io.to(dbUser.groupId).emit("user_status_change", {
          userId: dbUser.id,
          isOnline: true,
        });
      }
    } catch (err) {
      console.error("Error setting user online:", err);
    }
  }

  // Join a group chat room (Explicit join)
  socket.on("join_group", async (groupId: string) => {
    try {
      const ADMIN_UID = "epbI95IFGjdTe7Wu4pP8bOQD6bz2";

      // Special case for Admin Global Stories
      if (groupId === "global") {
        const dbUser = await prisma.user.findUnique({
          where: { uid: user?.uid },
          select: { role: true },
        });
        if (dbUser?.role === "admin" || user?.uid === ADMIN_UID) {
          socket.join("admin_global");
          console.log(`🌍 Admin ${socket.id} joined admin_global room`);
          socket.emit("joined_group", { groupId: "global" });
          return;
        }
      }

      // Validate group exists
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        socket.emit("error", { message: "Group not found" });
        return;
      }

      socket.join(groupId);
      console.log(`👥 User ${socket.id} joined group: ${groupId}`);

      socket.emit("joined_group", {
        groupId,
        department: group.department,
        classLevel: group.classLevel,
      });
    } catch (error) {
      console.error("Error joining group:", error);
      socket.emit("error", { message: "Failed to join group" });
    }
  });

  // Send a message
  socket.on(
    "send_message",
    async (data: { text: string; userId: string; groupId: string }) => {
      try {
        const { text, userId, groupId } = data;

        // Validate required fields
        if (!text || !userId || !groupId) {
          socket.emit("error", { message: "Missing required fields" });
          return;
        }

        // Save message to database
        const message = await prisma.message.create({
          data: {
            text,
            userId,
            groupId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photoURL: true,
                uid: true,
              },
            },
          },
        });

        // Broadcast to all users in the group
        io.to(groupId).emit("new_message", message);

        console.log(`💬 Message sent in group ${groupId} by user ${userId}`);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    },
  );

  // Status update notification
  socket.on("update_status", (data: { groupId: string; status: any }) => {
    const { groupId, status } = data;
    const ADMIN_UID = "epbI95IFGjdTe7Wu4pP8bOQD6bz2";

    const isGlobal = status?.user?.uid === ADMIN_UID;

    if (isGlobal) {
      io.emit("status_updated", status); // Broadcast to everyone
    } else {
      if (groupId) {
        io.to(groupId).emit("status_updated", status);
      }
      // ALSO send to admin_global so they can see everything in real-time
      io.to("admin_global").emit("status_updated", status);
    }
  });

  // Disconnect
  socket.on("disconnect", async () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    if (user?.uid) {
      try {
        // 1. Update DB -> Offline & LastSeen
        const dbUser = await prisma.user.update({
          where: { uid: user.uid },
          data: {
            isOnline: false,
            lastSeen: new Date(),
          },
          select: { id: true, groupId: true },
        });

        // 2. Broadcast (Offline)
        if (dbUser.groupId) {
          io.to(dbUser.groupId).emit("user_status_change", {
            userId: dbUser.id,
            isOnline: false,
            lastSeen: new Date(),
          });
        }
      } catch (err) {
        console.error("Error setting user offline:", err);
      }
    }
  });
});

// Error Handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready for connections`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("HTTP server closed");
  });
  await prisma.$disconnect();
});
