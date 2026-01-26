import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Schema Validation
const courseSchema = z.object({
  name: z.string(),
  day: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  classroom: z.string().optional(),
  color: z.string().optional(),
});

const batchCourseSchema = z.array(courseSchema);

// GET /api/schedule - Get user's schedule
router.get("/", async (req: any, res) => {
  try {
    const userId = req.user.uid; // Firebase UID from middleware

    // Find internal user ID
    const user = await prisma.user.findUnique({
      where: { uid: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const courses = await prisma.course.findMany({
      where: { userId: user.id },
      orderBy: { startTime: "asc" },
    });

    res.json(courses);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/schedule - Add a course
router.post("/", async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const data = courseSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { uid: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const course = await prisma.course.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    res.json(course);
  } catch (error) {
    console.error("Error adding course:", error);
    res.status(400).json({ error: "Invalid data" });
  }
});

// POST /api/schedule/batch - Batch add courses (for sync/migration)
router.post("/batch", async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const coursesData = batchCourseSchema.parse(req.body.courses);
    const shouldClear = req.body.clearBefore === true;

    const user = await prisma.user.findUnique({
      where: { uid: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      if (shouldClear) {
        await tx.course.deleteMany({
          where: { userId: user.id },
        });
      }

      for (const course of coursesData) {
        await tx.course.create({
          data: {
            ...course,
            userId: user.id,
          },
        });
      }
    });

    res.json({ success: true, count: coursesData.length });
  } catch (error) {
    console.error("Error batch adding courses:", error);
    res.status(400).json({ error: "Invalid data or server error" });
  }
});

// DELETE /api/schedule/:id - Delete a course
router.delete("/:id", async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { uid: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify ownership
    const course = await prisma.course.findFirst({
      where: { id, userId: user.id },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    await prisma.course.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
