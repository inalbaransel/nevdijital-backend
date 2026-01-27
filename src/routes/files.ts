import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { deleteFile as deleteFromR2 } from "../services/r2";

const router = Router();
const prisma = new PrismaClient();

// GET /api/files/:groupId - Bir grubun dosyalarını getir
router.get("/:groupId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId } = req.params;
    const {
      fileType,
      limit = "50",
      offset = "0",
      sortBy = "recent",
    } = req.query;

    // Validate group
    const group = await prisma.group.findUnique({
      where: { id: groupId as string },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Build where clause
    const where: any = { groupId: groupId as string };
    if (fileType) {
      where.fileType = fileType as string;
    }

    // Build orderBy
    let orderBy: any = {};
    if (sortBy === "likes") {
      orderBy = { likes: "desc" };
    } else {
      orderBy = { createdAt: "desc" };
    }

    // Fetch files
    const files = await prisma.file.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy,
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

    return res.json({
      files,
      total: await prisma.file.count({ where }),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return res.status(500).json({ error: "Failed to fetch files" });
  }
});

// POST /api/files/:fileId/like - Dosyayı beğen
router.post(
  "/:fileId/like",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { fileId } = req.params;

      const file = await prisma.file.update({
        where: { id: fileId as string },
        data: {
          likes: {
            increment: 1,
          },
        },
      });

      return res.json(file);
    } catch (error) {
      console.error("Error liking file:", error);
      return res.status(500).json({ error: "Failed to like file" });
    }
  },
);

// DELETE /api/files/:fileId - Dosyayı sil
router.delete("/:fileId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { fileId } = req.params;
    const userUid = (req as any).user?.uid;

    if (!userUid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check requester role
    const requester = await prisma.user.findUnique({
      where: { uid: userUid },
    });

    // Verify ownership or check if admin
    const file = await prisma.file.findUnique({
      where: { id: fileId as string },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Owner check: compare file's userId with requester's database ID
    const isOwner = file.userId === requester?.id;
    const isAdmin = requester?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Forbidden: You cannot delete this file" });
    }

    // 1. Delete from R2
    try {
      const publicUrl = process.env.R2_PUBLIC_URL || "";
      const fileKey = file.fileUrl.replace(`${publicUrl}/`, "");
      console.log(`🗑️ Deleting from R2 with key: ${fileKey}`);
      await deleteFromR2(fileKey);
    } catch (r2Error) {
      console.error(
        "⚠️ Failed to delete from R2 (might be already gone):",
        r2Error,
      );
    }

    // 2. Delete from database
    await prisma.file.delete({
      where: { id: fileId as string },
    });

    return res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
