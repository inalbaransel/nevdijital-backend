import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { deleteFile as deleteFromR2 } from "../services/r2";

const router = Router();
const prisma = new PrismaClient();

// GET /api/files/:groupId - Bir grubun dosyalarını getir
router.get("/:groupId", async (req: Request, res: Response) => {
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
      where: { id: groupId },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Build where clause
    const where: any = { groupId };
    if (fileType) {
      where.fileType = fileType;
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

    res.json({
      files,
      total: await prisma.file.count({ where }),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// POST /api/files/:fileId/like - Dosyayı beğen
router.post("/:fileId/like", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const file = await prisma.file.update({
      where: { id: fileId },
      data: {
        likes: {
          increment: 1,
        },
      },
    });

    res.json(file);
  } catch (error) {
    console.error("Error liking file:", error);
    res.status(500).json({ error: "Failed to like file" });
  }
});

// DELETE /api/files/:fileId - Dosyayı sil
router.delete("/:fileId", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.body;

    // Verify ownership
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
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
      where: { id: fileId },
    });

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
