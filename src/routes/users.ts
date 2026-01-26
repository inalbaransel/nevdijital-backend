import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST /api/users - Firebase user sync (create or update)
router.post("/", async (req: Request, res: Response): Promise<any> => {
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
          department: department as string,
          classLevel: parseInt(classLevel as string),
        },
      },
    });

    if (!group) {
      group = await prisma.group.create({
        data: {
          department: department as string,
          classLevel: parseInt(classLevel as string),
        },
      });
    }

    // Upsert user (create or update)
    const user = await prisma.user.upsert({
      where: { uid: uid as string },
      update: {
        email: email as string,
        name: name as string,
        photoURL: (photoURL as string) || null,
        department: department as string,
        classLevel: parseInt(classLevel as string),
        studentNo: (studentNo as string) || null,
        groupId: group.id,
      },
      create: {
        uid: uid as string,
        email: email as string,
        name: name as string,
        photoURL: (photoURL as string) || null,
        department: department as string,
        classLevel: parseInt(classLevel as string),
        studentNo: (studentNo as string) || null,
        groupId: group.id,
      },
    });

    return res.status(200).json({ user, group });
  } catch (error) {
    console.error("Error syncing user:", error);
    return res.status(500).json({ error: "Failed to sync user" });
  }
});

// GET /api/users/:uid - Kullanıcı bilgilerini getir (Firebase UID ile)
router.get("/:uid", async (req: Request, res: Response): Promise<any> => {
  try {
    const { uid } = req.params;

    const user = await prisma.user.findUnique({
      where: { uid: uid as string },
      include: {
        group: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/users/program - Update university program info
router.put("/program", async (req: any, res): Promise<any> => {
  try {
    const userId = req.user.uid;
    const { id, name, facultyId, facultyName } = req.body;

    if (!id || !name || !facultyId || !facultyName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await prisma.user.update({
      where: { uid: userId },
      data: {
        universityProgram: {
          id,
          name,
          facultyId,
          facultyName,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error saving program info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
