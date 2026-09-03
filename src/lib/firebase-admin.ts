import * as admin from 'firebase-admin';

function initFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle Next.js Vercel env var formatting
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
      throw error;
    }
  }
}

export function getAdminDb() {
  initFirebaseAdmin();
  return admin.firestore();
}

export function getAdminAuth() {
  initFirebaseAdmin();
  return admin.auth();
}
