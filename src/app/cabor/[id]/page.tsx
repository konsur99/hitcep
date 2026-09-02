import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { notFound } from 'next/navigation';
import CaborDetailClient from './CaborDetailClient';

export const revalidate = 60; // ISR cache for 60 seconds

export async function generateStaticParams() {
  const cacheSnap = await getAdminDb().collection('public_cache').doc('v1').get();
  const cacheData = cacheSnap.data() || { cabors: [] };
  return cacheData.cabors.map((c: any) => ({
    id: c.id,
  }));
}

export default async function CaborDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Ambil dari Super Cache saja! HANYA 1 READ dari Firebase!
  const cacheSnap = await getAdminDb().collection('public_cache').doc('v1').get();
  const cacheData = cacheSnap.data() || { cabors: [], medals: [] };
  
  const caborData = cacheData.cabors.find((c: any) => c.id === id);
  if (!caborData) {
    notFound();
  }
  
  // Filter medals from cache (sudah termasuk timestamp yg di-serialize oleh update_batch)
  let athletes = cacheData.medals.filter((m: any) => m.caborId === id);
  
  athletes = athletes.filter((m: any) => m.status === 'approved' || !m.status);
  athletes.sort((a: any, b: any) => {
    const timeA = a.createdAt ? (a.createdAt._seconds ? a.createdAt._seconds * 1000 : (typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime())) : 0;
    const timeB = b.createdAt ? (b.createdAt._seconds ? b.createdAt._seconds * 1000 : (typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime())) : 0;
    return timeB - timeA;
  });
  
  return <CaborDetailClient id={id} initialCabor={caborData} initialAthletes={athletes} />;
}
