import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST /api/users - Firebase user sync (create or update)
router.post("/", async (req: Request, res: Response): Promise<any> => {
  const { uid, email, name, photoURL, department, classLevel, studentNo } =
    req.body;
  // Force redeploy fix
  let group: any;

  try {
    if (!uid || !email || !name || !department || !classLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find or create group for this department + classLevel
    group = await prisma.group.upsert({
      where: {
        department_classLevel: {
          department: department as string,
          classLevel: parseInt(classLevel as string),
        },
      },
      update: {},
      create: {
        department: department as string,
        classLevel: parseInt(classLevel as string),
      },
    });

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
  } catch (error: any) {
    console.error("Error syncing user:", error);

    // Handle Unique Constraint Violation (P2002)
    if (error.code === "P2002") {
      const target = error.meta?.target;

      // Case 1: Duplicate studentNo -> Retry with null
      if (Array.isArray(target) && target.includes("studentNo")) {
        console.warn("⚠️ Duplicate studentNo detected. Retrying with null...");
        try {
          if (!group) throw new Error("Group missing during retry");

          const user = await prisma.user.upsert({
            where: { uid: uid as string },
            update: {
              email: email as string,
              name: name as string,
              photoURL: (photoURL as string) || null,
              department: department as string,
              classLevel: parseInt(classLevel as string),
              studentNo: null, // Clear collision
              groupId: group.id,
            },
            create: {
              uid: uid as string,
              email: email as string,
              name: name as string,
              photoURL: (photoURL as string) || null,
              department: department as string,
              classLevel: parseInt(classLevel as string),
              studentNo: null, // Clear collision
              groupId: group.id,
            },
          });
          return res.status(200).json({ user, group });
        } catch (retryErr) {
          return res
            .status(500)
            .json({
              error: "Failed to resolve studentNo conflict",
              details: retryErr,
            });
        }
      }

      // Case 2: Duplicate email -> User exists with different UID (Legacy/Re-register)
      // Solution: "Overwrite" / Claim the account by updating UID
      if (Array.isArray(target) && target.includes("email")) {
        console.warn("⚠️ Duplicate email detected. Claiming account...");
        try {
          // Find existing user by email
          const existingUser = await prisma.user.findUnique({
            where: { email: email as string },
          });

          if (existingUser) {
            // Update the existing user's UID to the new one
            const user = await prisma.user.update({
              where: { id: existingUser.id }, // Use internal ID to update
              data: {
                uid: uid as string, // Claim with new UID
                name: name as string,
                photoURL: (photoURL as string) || null,
                department: department as string,
                classLevel: parseInt(classLevel as string),
                // Keep existing studentNo if valid, or update if provided?
                // Let's defer to input but be careful of its own conflicts.
                // Safest to keep existing or ignore if null.
                // For now, let's try to update standard fields.
                groupId: group?.id,
              },
            });
            return res.status(200).json({ user, group });
          }
        } catch (claimErr) {
          console.error("Failed to claim account:", claimErr);
          return res
            .status(500)
            .json({ error: "Failed to claim account", details: claimErr });
        }
      }
    }

    return res
      .status(500)
      .json({ error: "Failed to sync user", details: error.message });
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
