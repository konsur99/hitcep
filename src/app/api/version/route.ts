import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const revalidate = 60; // Cache on Edge for 60 seconds

export async function GET() {
  try {
    const cacheSnap = await getDoc(doc(db, 'public_cache', 'v1'));
    const data = cacheSnap.data();
    return NextResponse.json({ version: data?.lastUpdatedAt || 0 });
  } catch (error) {
    return NextResponse.json({ version: 0 }, { status: 500 });
  }
}
