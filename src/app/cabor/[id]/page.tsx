import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import CaborDetailClient from './CaborDetailClient';

export const revalidate = 10; // Match other pages

export async function generateStaticParams() {
  // Web SDK tidak direkomendasikan di dalam generateStaticParams jika build berjalan secara independen.
  // Tapi di Vercel, kita bisa mengambil dari public_cache
  try {
    const cacheSnap = await getDoc(doc(db, 'public_cache', 'v1'));
    const cacheData = cacheSnap.exists() ? cacheSnap.data() : { cabors: [] };
    return (cacheData.cabors || []).map((c: any) => ({
      id: c.id,
    }));
  } catch (e) {
    return [];
  }
}

export default async function CaborDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Ambil dari Super Cache saja! HANYA 1 READ dari Firebase!
  const cacheSnap = await getDoc(doc(db, 'public_cache', 'v1'));
  const rawData = cacheSnap.exists() ? cacheSnap.data() : { cabors: [], medals: [] };
  
  const caborData = rawData.cabors?.find((c: any) => c.id === id);
  if (!caborData) {
    notFound();
  }
  
  // Filter medals from cache (sudah termasuk timestamp yg di-serialize oleh update_batch)
  let athletes = rawData.medals?.filter((m: any) => m.caborId === id) || [];
  
  athletes = athletes.filter((m: any) => m.status === 'approved' || !m.status);
  
  // Normalize date for serialization
  athletes = athletes.map((m: any) => ({
    ...m,
    createdAt: m.createdAt ? (typeof m.createdAt.toDate === 'function' ? m.createdAt.toDate().getTime() : (m.createdAt.seconds ? m.createdAt.seconds * 1000 : (typeof m.createdAt === 'string' ? new Date(m.createdAt).getTime() : (typeof m.createdAt === 'number' ? m.createdAt : null)))) : null
  }));
  
  athletes.sort((a: any, b: any) => {
    const timeA = a.createdAt || 0;
    const timeB = b.createdAt || 0;
    return timeB - timeA;
  });
  
  return <CaborDetailClient id={id} initialCabor={caborData} initialAthletes={athletes} />;
}
