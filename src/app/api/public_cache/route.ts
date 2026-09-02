import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const revalidate = 60; // Cache on Edge for 60 seconds

export async function GET() {
  try {
    const cacheSnap = await getDoc(doc(db, 'public_cache', 'v1'));
    const data = cacheSnap.data() || { cabors: [], medals: [], reports: [] };
    
    // Konversi object Timestamp firebase-admin/web ke millisecond format agar mudah di-parse di client
    if (data.medals && Array.isArray(data.medals)) {
        data.medals = data.medals.map((m: any) => ({
            ...m,
            createdAt: m.createdAt && typeof m.createdAt.toDate === 'function' 
              ? m.createdAt.toDate().getTime() 
              : (m.createdAt?._seconds ? m.createdAt._seconds * 1000 : (m.createdAt?.seconds ? m.createdAt.seconds * 1000 : null))
        }));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API Cache error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
