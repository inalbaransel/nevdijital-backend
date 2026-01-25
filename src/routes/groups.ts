import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/groups - Tüm grupları listele
router.get("/", async (req: Request, res: Response) => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: [{ department: "asc" }, { classLevel: "asc" }],
      include: {
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    });

    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// GET /api/groups/:id - Belirli bir grubu getir
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            uid: true,
            name: true,
            photoURL: true,
            studentNo: true,
          },
        },
        _count: {
          select: {
            messages: true,
            files: true,
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

// POST /api/groups - Yeni grup oluştur
router.post("/", async (req: Request, res: Response) => {
  try {
    const { department, classLevel } = req.body;

    if (!department || !classLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if group already exists
    const existingGroup = await prisma.group.findUnique({
      where: {
        department_classLevel: {
          department,
          classLevel: parseInt(classLevel),
        },
      },
    });

    if (existingGroup) {
      return res
        .status(409)
        .json({ error: "Group already exists", group: existingGroup });
    }

    const group = await prisma.group.create({
      data: {
        department,
        classLevel: parseInt(classLevel),
      },
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

export default router;
