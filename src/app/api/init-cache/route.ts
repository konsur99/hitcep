import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  // Hanya bisa dipanggil secara lokal atau dengan rahasia untuk keamanan
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("Memulai Inisialisasi Public Cache v1...");
    
    // 1. Ambil Cabors
    const caborsSnap = await getAdminDb().collection("cabors").get();
    const cabors = caborsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // 2. Ambil Medals 
    const medalsSnap = await getAdminDb().collection("medals").get();
    const medals = medalsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString()) : null
      };
    });

    // 3. Ambil Reports 
    const reportsSnap = await getAdminDb().collection("reports").orderBy("createdAt", "desc").get();
    const reports = reportsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString()) : null
      };
    });

    // 4. Buat dokumen Super Cache
    const cacheData = {
      cabors,
      medals,
      reports,
      lastUpdated: new Date().toISOString()
    };

    await getAdminDb().collection("public_cache").doc("v1").set(cacheData);

    return NextResponse.json({
      success: true,
      message: "Berhasil inisialisasi public_cache/v1",
      stats: {
        cabors: cabors.length,
        medals: medals.length,
        reports: reports.length
      }
    });

  } catch (error: any) {
    console.error("Error init cache:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
