import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  try {
    // Debug Firebase Admin initialization
    console.log("Initializing Firebase Admin with provided credentials");
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    const config = {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    };

    console.log("Admin config created with projectId:", process.env.FIREBASE_PROJECT_ID);
    
    initializeApp(config);
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    throw error; // Re-throw to see the error in the API route
  }
}

const adminDb = getFirestore();
console.log("Firestore instance created");

export { adminDb };