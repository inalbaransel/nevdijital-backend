import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/messages/:groupId - Bir grubun mesajlarını getir
router.get("/:groupId", async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    // Validate groupId
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Fetch messages with pagination
    const messages = await prisma.message.findMany({
      where: { groupId },
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

    res.json({
      messages: messagesReversed,
      total: await prisma.message.count({ where: { groupId } }),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/messages - Mesaj gönder (REST API alternatifi, Socket.io tercih edilir)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { text, userId, groupId } = req.body;

    if (!text || !userId || !groupId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = await prisma.message.create({
      data: { text, userId, groupId },
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

    res.status(201).json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ error: "Failed to create message" });
  }
});

export default router;
