import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

export async function GET() {
  // Only allow in development mode for safety
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized - Development only' }, { status: 401 });
  }

  try {
    let count = 0;
    const snap = await getAdminDb().collection('reports').get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.imageUrl && data.imageUrl.includes('placeholder.com')) {
        await doc.ref.update({ imageUrl: 'https://picsum.photos/seed/koni/400/300' });
        count++;
      }
    }
    
    const cacheRef = getAdminDb().collection('public_cache').doc('v1');
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      let cacheData = cacheSnap.data();
      let cacheUpdated = false;
      if (cacheData && cacheData.reports) {
        cacheData.reports.forEach((r: any) => {
          if (r.imageUrl && r.imageUrl.includes('placeholder.com')) {
            r.imageUrl = 'https://picsum.photos/seed/koni/400/300';
            cacheUpdated = true;
          }
        });
        if (cacheUpdated) {
          await cacheRef.update({ reports: cacheData.reports });
        }
      }
    }
    
    return NextResponse.json({ message: `Fixed ${count} reports` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
