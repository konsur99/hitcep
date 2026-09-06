import { notFound } from 'next/navigation';
import CaborDetailClient from './CaborDetailClient';
import { getPublicCache } from '@/lib/publicData';

export const revalidate = 3600; // Cache 1 hour

export async function generateStaticParams() {
  try {
    const cacheData = await getPublicCache();
    return (cacheData.cabors || []).map((c: any) => ({
      id: c.id,
    }));
  } catch (e) {
    return [];
  }
}

export default async function CaborDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const cacheData = await getPublicCache();
  
  const caborData = cacheData.cabors?.find((c: any) => c.id === id);
  if (!caborData) {
    notFound();
  }
  
  let athletes = cacheData.medals?.filter((m: any) => m.caborId === id) || [];
  athletes = athletes.filter((m: any) => m.status === 'approved' || !m.status);
  
  athletes.sort((a: any, b: any) => {
    const timeA = a.createdAt || 0;
    const timeB = b.createdAt || 0;
    return timeB - timeA;
  });
  
  return <CaborDetailClient id={id} initialCabor={caborData} initialAthletes={athletes} />;
}
