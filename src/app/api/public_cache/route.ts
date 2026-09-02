import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const revalidate = 60; // Cache on Edge for 60 seconds

export async function GET() {
  try {
    const cacheSnap = await adminDb.collection('public_cache').doc('v1').get();
    const data = cacheSnap.data() || { cabors: [], medals: [], reports: [] };
    
    // Konversi object Timestamp firebase-admin ke millisecond format agar mudah di-parse di client
    if (data.medals && Array.isArray(data.medals)) {
        data.medals = data.medals.map((m: any) => ({
            ...m,
            createdAt: m.createdAt && m.createdAt.toDate ? m.createdAt.toDate().getTime() : (m.createdAt?._seconds ? m.createdAt._seconds * 1000 : null)
        }));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API Cache error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
