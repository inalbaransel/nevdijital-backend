import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/groups - Tüm grupları listele
router.get("/", async (_req: Request, res: Response): Promise<any> => {
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

    return res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// GET /api/groups/:id - Belirli bir grubu getir
router.get("/:id", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: id as string },
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

    return res.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    return res.status(500).json({ error: "Failed to fetch group" });
  }
});

// POST /api/groups - Yeni grup oluştur
router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const { department, classLevel } = req.body;

    if (!department || !classLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if group already exists
    const existingGroup = await prisma.group.findUnique({
      where: {
        department_classLevel: {
          department: department as string,
          classLevel: classLevel as string,
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
        department: department as string,
        classLevel: classLevel as string,
      },
    });

    return res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    return res.status(500).json({ error: "Failed to create group" });
  }
});

export default router;
