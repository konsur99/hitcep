import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const revalidate = 60; // Cache on Edge for 60 seconds

export async function GET() {
  try {
    const cacheSnap = await adminDb.collection('public_cache').doc('v1').get();
    const data = cacheSnap.data();
    return NextResponse.json({ version: data?.lastUpdatedAt || 0 });
  } catch (error) {
    return NextResponse.json({ version: 0 }, { status: 500 });
  }
}
