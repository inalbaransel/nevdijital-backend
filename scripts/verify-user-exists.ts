// Quick script to verify user data in backend
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUser() {
  const uid = "AR9faToGRYNxQih89LDIIZnrx13"; // From screenshot

  const user = await prisma.user.findUnique({
    where: { uid },
    include: { group: true },
  });

  if (user) {
    console.log("✅ USER FOUND IN BACKEND:");
    console.log(JSON.stringify(user, null, 2));
  } else {
    console.log("❌ User NOT found in backend");
  }

  await prisma.$disconnect();
}

checkUser();
