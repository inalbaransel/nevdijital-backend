import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/messages/:groupId - Bir grubun mesajlarını getir
router.get("/:groupId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    // Validate groupId
    const group = await prisma.group.findUnique({
      where: { id: groupId as string },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Fetch messages with pagination
    const messages = await prisma.message.findMany({
      where: { groupId: groupId as string },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            uid: true,
            name: true,
            photoURL: true,
          },
        },
      },
    });

    // Reverse to show oldest first
    const messagesReversed = messages.reverse();

    return res.json({
      messages: messagesReversed,
      total: await prisma.message.count({
        where: { groupId: groupId as string },
      }),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/messages - Mesaj gönder (REST API alternatifi, Socket.io tercih edilir)
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const { text, userId, groupId } = req.body;

    if (!text || !userId || !groupId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = await prisma.message.create({
      data: {
        text: text as string,
        userId: userId as string,
        groupId: groupId as string,
      },
      include: {
        user: {
          select: {
            id: true,
            uid: true,
            name: true,
            photoURL: true,
          },
        },
      },
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    return res.status(500).json({ error: "Failed to create message" });
  }
});

// DELETE /api/messages/:id - Mesajı sil (Sadece sahibi veya Admin)
router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userUid = (req as any).user?.uid;

    if (!userUid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: id as string },
      include: {
        user: {
          select: { uid: true },
        },
      },
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check requester role
    const requester = await prisma.user.findUnique({
      where: { uid: userUid },
    });

    const isOwner = message.user.uid === userUid;
    const isAdmin = requester?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot delete this message" });
    }

    await prisma.message.delete({
      where: { id: id as string },
    });

    return res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
