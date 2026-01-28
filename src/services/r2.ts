import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Cloudflare R2 is S3-compatible
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadFile(
  file: Express.Multer.File,
  folder: "music" | "notes" | "images" | "documents" | "videos" = "documents",
): Promise<{ fileUrl: string; fileName: string }> {
  try {
    // Generate unique filename
    const fileExtension = file.originalname.split(".").pop();
    const uniqueFileName = `${folder}/${uuidv4()}.${fileExtension}`;

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await r2Client.send(command);

    // Return public URL
    const fileUrl = `${PUBLIC_URL}/${uniqueFileName}`;

    return {
      fileUrl,
      fileName: uniqueFileName,
    };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error("Failed to upload file");
  }
}

/**
 * Delete a file from Cloudflare R2
 */
export async function deleteFile(fileName: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error("Failed to delete file");
  }
}

/**
 * Validate file size (max 50MB)
 */
export function validateFileSize(fileSize: number): boolean {
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB in bytes
  return fileSize <= MAX_SIZE;
}

/**
 * Get file type from mimetype
 */
export function getFileType(
  mimetype: string,
): "MUSIC" | "NOTE" | "IMAGE" | "VIDEO" | "DOCUMENT" {
  if (mimetype.startsWith("audio/")) {
    return "MUSIC";
  } else if (mimetype.startsWith("image/")) {
    return "IMAGE";
  } else if (mimetype.startsWith("video/")) {
    return "VIDEO";
  } else if (
    mimetype === "application/pdf" ||
    mimetype === "application/msword" ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "NOTE";
  } else {
    return "DOCUMENT";
  }
}
