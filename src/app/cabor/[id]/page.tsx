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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cacheData = await getPublicCache();
  const caborData = cacheData.cabors?.find((c: any) => c.id === id);
  
  if (!caborData) {
    return {
      title: "Cabor Tidak Ditemukan - QuikKONI",
    };
  }

  return {
    title: `Klasemen Medali ${caborData.name} - PORPROV Jateng 2026 | QuikKONI`,
    description: `Pantau perolehan medali, hasil pertandingan, dan daftar atlet ${caborData.name} kontingen KONI Surakarta pada ajang PORPROV Jawa Tengah 2026.`,
    keywords: [`${caborData.name}`, `medali ${caborData.name}`, `atlet ${caborData.name}`, `hasil ${caborData.name} porprov 2026`, `klasemen ${caborData.name}`],
  };
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
