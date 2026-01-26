import * as admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Parse private key (handle escaped newlines and potential quotes/prefix)
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

    // Clean up key (remove prefix if accidentally added, remove quotes, fix newlines)
    if (privateKey.startsWith("FIREBASE_PRIVATE_KEY=")) {
      privateKey = privateKey.replace("FIREBASE_PRIVATE_KEY=", "");
    }

    privateKey = privateKey
      .replace(/^"|"$/g, "") // Baştaki ve sondaki tırnakları sil
      .replace(/\\n/g, "\n") // \\n'leri gerçek alt satıra çevir
      .trim(); // Gereksiz boşlukları temizle

    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !privateKey
    ) {
      throw new Error(
        "Missing Firebase Admin SDK credentials in environment variables",
      );
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    console.log("✅ Firebase Admin SDK initialized");
    return firebaseApp;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

/**
 * Get Firebase Admin instance
 */
export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseApp) {
    return initializeFirebaseAdmin();
  }
  return firebaseApp;
}

export default admin;
