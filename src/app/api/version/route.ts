import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const revalidate = 60; // Cache on Edge for 60 seconds

export async function GET() {
  try {
    const cacheSnap = await getFirestore().collection('public_cache').doc('v1').get();
    const data = cacheSnap.data();
    return NextResponse.json({ version: data?.lastUpdatedAt || 0 });
  } catch (error) {
    console.error("API Version error:", error);
    return NextResponse.json({ version: 0 }, { status: 500 });
  }
}
