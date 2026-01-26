import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/statuses/:groupId - Aktif durumları getir (24 sa geçmemiş olanlar)
router.get("/:groupId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId } = req.params;
    const now = new Date();

    const statuses = await prisma.status.findMany({
      where: {
        groupId: groupId as string,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
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

    return res.json(statuses);
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return res.status(500).json({ error: "Failed to fetch statuses" });
  }
});

// POST /api/statuses - Yeni durum ekle veya mevcut olanı güncelle
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId, groupId, text, music } = req.body;

    if (!userId || !groupId) {
      return res.status(400).json({ error: "UserId and GroupId are required" });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Varsa eski durumunu sil (Kullanıcı başına 1 aktif durum)
    await prisma.status.deleteMany({
      where: {
        userId: userId as string,
        groupId: groupId as string,
      },
    });

    const status = await prisma.status.create({
      data: {
        userId: userId as string,
        groupId: groupId as string,
        text: text as string,
        music: music || undefined,
        expiresAt,
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

    return res.status(201).json(status);
  } catch (error) {
    console.error("Error creating status:", error);
    return res.status(500).json({ error: "Failed to create status" });
  }
});

// DELETE /api/statuses/:id - Durumu sil
router.delete("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const status = await prisma.status.findUnique({
      where: { id: id as string },
    });

    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    if (status.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.status.delete({
      where: { id: id as string },
    });

    return res.json({ message: "Status deleted successfully" });
  } catch (error) {
    console.error("Error deleting status:", error);
    return res.status(500).json({ error: "Failed to delete status" });
  }
});

export default router;
