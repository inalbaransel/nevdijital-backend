import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST /api/users - Firebase user sync (create or update)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { uid, email, name, photoURL, department, classLevel, studentNo } =
      req.body;

    if (!uid || !email || !name || !department || !classLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find or create group for this department + classLevel
    let group = await prisma.group.findUnique({
      where: {
        department_classLevel: {
          department,
          classLevel: parseInt(classLevel),
        },
      },
    });

    if (!group) {
      group = await prisma.group.create({
        data: {
          department,
          classLevel: parseInt(classLevel),
        },
      });
    }

    // Upsert user (create or update)
    const user = await prisma.user.upsert({
      where: { uid },
      update: {
        email,
        name,
        photoURL,
        department,
        classLevel: parseInt(classLevel),
        studentNo,
        groupId: group.id,
      },
      create: {
        uid,
        email,
        name,
        photoURL,
        department,
        classLevel: parseInt(classLevel),
        studentNo,
        groupId: group.id,
      },
    });

    res.status(200).json({ user, group });
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// GET /api/users/:uid - Kullanıcı bilgilerini getir (Firebase UID ile)
router.get("/:uid", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    const user = await prisma.user.findUnique({
      where: { uid },
      include: {
        group: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
