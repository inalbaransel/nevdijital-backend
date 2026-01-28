import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/statuses/:groupId - Aktif durumları getir (24 sa geçmemiş olanlar)
router.get("/:groupId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId } = req.params;
    const now = new Date();

    // Auth middleware attaches user to req
    const userAuth = (req as any).user;
    const ADMIN_UID = "epbI95IFGjdTe7Wu4pP8bOQD6bz2";

    // Re-verify Admin status from DB for robustness
    const dbUser = await prisma.user.findUnique({
      where: { uid: userAuth?.uid },
      select: { role: true },
    });
    const isAdmin = dbUser?.role === "admin" || userAuth?.uid === ADMIN_UID;

    let whereClause: any = {
      expiresAt: {
        gt: now,
      },
    };

    if (isAdmin) {
      // Admin sees statuses from ALL groups
    } else {
      // Normal user: Sees their group OR Admin's status
      const orConditions: any[] = [{ user: { uid: ADMIN_UID } }];
      if (groupId && groupId !== "global") {
        orConditions.push({ groupId });
      }
      whereClause.OR = orConditions;
    }

    const statuses = await prisma.status.findMany({
      where: whereClause,
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
    const userAuth = (req as any).user;
    const ADMIN_UID = "epbI95IFGjdTe7Wu4pP8bOQD6bz2";

    if (!userId || !groupId) {
      return res.status(400).json({ error: "UserId and GroupId are required" });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let effectiveGroupId = groupId;

    // Handle "global" groupId for Admin
    if (groupId === "global") {
      const dbUser = await prisma.user.findUnique({
        where: { uid: userAuth?.uid },
        select: { role: true, groupId: true },
      });
      const isAdmin = dbUser?.role === "admin" || userAuth?.uid === ADMIN_UID;

      if (isAdmin) {
        // Find a real group ID to satisfy FK constraint
        // We can use the admin's own group or the first available group
        if (dbUser?.groupId) {
          effectiveGroupId = dbUser.groupId;
        } else {
          const fallbackGroup = await prisma.group.findFirst();
          if (fallbackGroup) {
            effectiveGroupId = fallbackGroup.id;
          } else {
            return res
              .status(400)
              .json({ error: "No groups available for global status" });
          }
        }
      } else {
        return res
          .status(403)
          .json({ error: "Only admins can post global statuses" });
      }
    }

    // Varsa eski durumunu sil (Kullanıcı başına 1 aktif durum)
    await prisma.status.deleteMany({
      where: {
        userId: userId as string,
        // We delete by userId only for admin if they post globally?
        // No, keep original behavior per-group for students, but for Admin, maybe global.
        // Let's just use effectiveGroupId.
      },
    });

    const status = await prisma.status.create({
      data: {
        userId: userId as string,
        groupId: effectiveGroupId as string,
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
