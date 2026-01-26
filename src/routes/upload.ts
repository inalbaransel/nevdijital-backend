import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { uploadFile, validateFileSize, getFileType } from "../services/r2";

const router = Router();
const prisma = new PrismaClient();

// Multer configuration (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// POST /api/upload - Upload file to R2 and save metadata
router.post(
  "/",
  upload.single("file"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const file = req.file;
      const { userId, groupId, musicTitle, musicUrl } = req.body;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!userId || !groupId) {
        return res
          .status(400)
          .json({ error: "Missing required fields: userId, groupId" });
      }

      // Validate file size
      if (!validateFileSize(file.size)) {
        return res.status(400).json({ error: "File size exceeds 50MB limit" });
      }

      // Determine file type and folder
      const fileType = getFileType(file.mimetype);
      const folderMap: Record<
        string,
        "music" | "notes" | "images" | "documents"
      > = {
        MUSIC: "music",
        NOTE: "notes",
        IMAGE: "images",
        DOCUMENT: "documents",
      };
      const folder = folderMap[fileType] || "documents";

      // Upload to R2
      const { fileUrl } = await uploadFile(file, folder);

      // Save metadata to database
      const dbFile = await prisma.file.create({
        data: {
          fileName: file.originalname, // Orijinal ismi kaydet
          fileType,
          fileUrl,
          fileSize: file.size,
          mimeType: file.mimetype,
          musicTitle: (musicTitle as string) || null,
          musicUrl: (musicUrl as string) || null,
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

      return res.status(201).json(dbFile);
    } catch (error: any) {
      console.error("❌ Error uploading file:", error);
      return res.status(500).json({
        error: "Failed to upload file",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
);

export default router;
