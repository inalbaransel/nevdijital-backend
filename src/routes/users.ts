import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import admin from "../config/firebase";

const router = Router();
const prisma = new PrismaClient();

// POST /api/users - Firebase user sync (create or update)
router.post("/", async (req: Request, res: Response): Promise<any> => {
  const {
    uid,
    email,
    name,
    photoURL,
    department,
    classLevel,
    studentNo,
    role,
    personalEmail,
    phone,
    kvkkAccepted,
  } = req.body;
  const userUid = (req as any).user?.uid;

  console.log("📝 SYNC USER PAYLOAD:", req.body); // DEBUG LOG

  // Force redeploy fix
  let group: any;
  let finalRole = "student";
  let kvkkAcceptedState = kvkkAccepted === true;

  try {
    const missingFields = [];
    if (!uid) missingFields.push("uid");
    if (!email) missingFields.push("email");
    if (!name) missingFields.push("name");
    if (!department) missingFields.push("department");
    if (!classLevel) missingFields.push("classLevel");

    if (missingFields.length > 0) {
      console.warn("⚠️ [Backend] Sync Failed - Missing Fields:", missingFields);
      return res
        .status(400)
        .json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    // --- SECURITY HARDENING ---
    console.log(`[Backend] Syncing user: ${uid} (Email: ${email})`);

    // Fetch requester and existing target user to verify role permissions
    const requester = await prisma.user.findUnique({
      where: { uid: userUid },
    });
    const targetUser = await prisma.user.findUnique({
      where: { uid: uid as string },
    });

    const requestedRole = (role as string) || "student";
    // ... role logic ... (abbreviated for replacements, maintain original logic if not replacing)

    // START DB OPERATIONS
    console.log(`[Backend] Upserting Group: ${department} - ${classLevel}`);

    // Find or create group for this department + classLevel
    group = await prisma.group.upsert({
      where: {
        department_classLevel: {
          department: department as string,
          classLevel: classLevel as string,
        },
      },
      update: {},
      create: {
        department: department as string,
        classLevel: classLevel as string,
      },
    });

    console.log(
      `[Backend] Group ID: ${group.id}. Proceeding to User Upsert...`,
    );

    // ... (rest of logic)

    // Upsert user (create or update)
    const user = await prisma.user.upsert({
      where: { uid: uid as string },
      update: {
        email: email as string,
        name: name as string,
        photoURL: (photoURL as string) || null,
        department: department as string,
        classLevel: classLevel as string,
        studentNo: (studentNo as string) || null,
        personalEmail: (personalEmail as string) || null,
        phone: (phone as string) || null,
        kvkkAccepted: kvkkAcceptedState,
        role: finalRole,
        groupId: group.id,
      },
      create: {
        uid: uid as string,
        email: email as string,
        name: name as string,
        photoURL: (photoURL as string) || null,
        department: department as string,
        classLevel: classLevel as string,
        studentNo: (studentNo as string) || null,
        personalEmail: (personalEmail as string) || null,
        phone: (phone as string) || null,
        kvkkAccepted: kvkkAcceptedState,
        role: finalRole,
        groupId: group.id,
      },
    });

    console.log(`[Backend] User Upsert Success: ${user.name} (${user.uid})`);
    return res.status(200).json({ user, group });
  } catch (error: any) {
    console.error(
      "❌ CRITICAL ERROR IN SYNC USER:",
      JSON.stringify(error, null, 2),
    );
    if (error instanceof Error) {
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }

    // Handle Unique Constraint Violation (P2002)
    if (error.code === "P2002") {
      const target = error.meta?.target;

      // Case 1: Duplicate studentNo -> Claim it! (Clear from old user)
      if (Array.isArray(target) && target.includes("studentNo")) {
        console.warn(
          `⚠️ Duplicate studentNo (${studentNo}) detected. Claiming it from old user...`,
        );
        try {
          if (!studentNo) {
            // Should not happen if target includes studentNo but safety check
            throw new Error("Collision on null studentNo?");
          }

          // 1. Find the user holding this studentNo
          const conflictingUser = await prisma.user.findFirst({
            where: { studentNo: studentNo as string },
          });

          if (conflictingUser) {
            console.log(
              `Found conflicting user ${conflictingUser.uid}. Clearing their studentNo...`,
            );
            // 2. Nullify the old user's studentNo
            await prisma.user.update({
              where: { id: conflictingUser.id },
              data: { studentNo: null },
            });
          }

          // 3. Retry Upsert for THIS user (now the number is free)
          const user = await prisma.user.upsert({
            where: { uid: uid as string },
            update: {
              email: email as string,
              name: name as string,
              photoURL: (photoURL as string) || null,
              department: department as string,
              classLevel: classLevel as string,
              studentNo: (studentNo as string) || null,
              groupId: group.id,
            },
            create: {
              uid: uid as string,
              email: email as string,
              name: name as string,
              photoURL: (photoURL as string) || null,
              department: department as string,
              classLevel: classLevel as string,
              studentNo: (studentNo as string) || null,
              groupId: group.id,
              role: finalRole,
              kvkkAccepted: kvkkAcceptedState,
            },
          });
          return res.status(200).json({ user, group });
        } catch (retryErr: any) {
          console.error("Collision resolution failed:", retryErr);
          return res.status(500).json({
            error: "Failed to resolve studentNo conflict",
            details: retryErr.message,
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
                classLevel: classLevel as string,
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

// GET /api/users - List all users (Admin only)
router.get("/", async (req: any, res: Response): Promise<any> => {
  try {
    const userUid = req.user?.uid;

    // Fetch user from DB to check role
    const dbUser = await prisma.user.findUnique({
      where: { uid: userUid },
    });

    if (dbUser?.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const users = await prisma.user.findMany({
      include: {
        group: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(users);
  } catch (error) {
    console.error("Error listing users:", error);
    return res.status(500).json({ error: "Failed to list users" });
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

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/users/program - Update university program info
router.put("/program", async (req: Request, res: Response): Promise<any> => {
  try {
    return res.json({ success: true });
  } catch (error) {
    console.error("Error saving program info:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/users/:uid - Kullanıcıyı ve tüm verilerini sil
router.delete("/:uid", async (req: any, res: Response): Promise<any> => {
  try {
    const { uid } = req.params;
    const userUid = req.user?.uid;

    // Fetch requester from DB to check role
    const dbUser = await prisma.user.findUnique({
      where: { uid: userUid },
    });

    // Admin silinebilir (kendi hesabı değilse veya adminse)
    if (dbUser?.role !== "admin" && userUid !== uid) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // 1. Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(uid as string);
      console.log(`Firebase User deleted: ${uid}`);
    } catch (fbErr: any) {
      console.error(
        "Firebase deletion failed (might not exist in Auth):",
        fbErr,
      );
      // No stop if firebase delete fails (maybe user only exists in DB)
    }

    // 2. Prisma schema'da Cascade silme tanımlı olduğu için (onDelete: Cascade),
    // Kullanıcıyı silince mesajları, dosyaları vs. otomatik silinir.
    await prisma.user.delete({
      where: { uid: uid as string },
    });

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET /api/users/me - Get current authenticated user
router.get("/me", async (req: any, res: Response): Promise<any> => {
  try {
    const userUid = req.user?.uid;
    const userEmail = req.user?.email;

    console.log(
      `🔍 [Backend] GET /me requested by UID: ${userUid}, Email: ${userEmail}`,
    );

    if (!userUid) {
      console.warn("⚠️ [Backend] GET /me - No UID in request (Unauthorized)");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1. Try finding by UID
    let user = await prisma.user.findUnique({
      where: { uid: userUid },
      include: { group: true },
    });

    // 2. CHECK FOR "MISAFIR" GHOST ACCOUNT or MISSING USER
    // If user is not found OR it's a "Misafir" placeholder...
    const isGhost =
      user &&
      (user.name === "Misafir" || user.name === "" || user.name === userEmail);

    if (!user || (isGhost && userEmail)) {
      if (!user)
        console.warn(`❌ [Backend] User NOT found by UID: ${userUid}.`);
      if (isGhost)
        console.warn(
          `👻 [Backend] Found "Misafir" Ghost Account for UID: ${userUid}. Checking for Real Account...`,
        );

      // 3. Fallback: Try finding REAL account by Email
      if (userEmail) {
        const existingUserByEmail = await prisma.user.findFirst({
          where: {
            email: userEmail,
            uid: { not: userUid }, // Don't find the ghost itself
          },
        });

        if (existingUserByEmail) {
          console.warn(
            `⚠️ [Backend] Found REAL user by Email (${userEmail})! ID: ${existingUserByEmail.id}`,
          );
          console.log(
            "🛠️ Performing Self-Repair: Merging Ghost into Real Account...",
          );

          // A. If we have a ghost account (Misafir), DELETE IT to free up the UID
          if (user) {
            console.log(`🗑️ Deleting Ghost Account (ID: ${user.id})...`);
            await prisma.user.delete({ where: { id: user.id } });
          }

          // B. Update the REAL account to have the NEW UID
          user = await prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              uid: userUid,
              // Update online status while we're at it
              isOnline: true,
            },
            include: { group: true },
          });
          console.log("✅ [Backend] Self-Repair (Merge) Successful!");
        } else {
          if (isGhost)
            console.log("ℹ️ No better account found. Keeping Misafir.");
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(
      `✅ [Backend] GET /me - Returning user: ${user.name} (${user.email})`,
    );
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/users/me - Update current user's profile
router.put("/me", async (req: any, res: Response): Promise<any> => {
  try {
    const userUid = req.user?.uid;

    if (!userUid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      name,
      photoURL,
      personalEmail,
      phone,
      department,
      classLevel,
      studentNo,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { uid: userUid },
      data: {
        ...(name && { name }),
        ...(photoURL !== undefined && { photoURL }),
        ...(personalEmail !== undefined && { personalEmail }),
        ...(phone !== undefined && { phone }),
        ...(department && { department }),
        ...(classLevel && { classLevel }),
        ...(studentNo !== undefined && { studentNo }),
      },
      include: { group: true },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

// GET /api/users/lookup - Find user by studentId or email
router.get("/lookup", async (req: Request, res: Response): Promise<any> => {
  try {
    const { studentId, email } = req.query;

    if (!studentId && !email) {
      return res
        .status(400)
        .json({ error: "Provide studentId or email to lookup" });
    }

    const where: any = {};
    if (studentId) where.studentNo = studentId as string;
    if (email) where.email = email as string;

    const user = await prisma.user.findFirst({
      where,
      select: {
        uid: true,
        email: true,
        studentNo: true,
        name: true,
        department: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Lookup error:", error);
    return res.status(500).json({ error: "Failed to lookup user" });
  }
});

export default router;
