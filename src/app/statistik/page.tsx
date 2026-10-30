import StatistikClient from './StatistikClient';
import { getPublicCache } from '@/lib/publicData';

// Vercel Edge caching config: Cache this page for 1 hour.
export const revalidate = 3600; 

export default async function Statistik() {
  const cacheData = await getPublicCache();
  let allMedals: any[] = cacheData.medals || [];
  allMedals = allMedals.filter((m: any) => m.status === 'approved' || !m.status);

  // Hitung total keseluruhan medali Surakarta langsung dari daftar medali approved agar sinkron 100%
  const totalEmas = allMedals.filter((m: any) => (m.medalType || '').toLowerCase() === 'emas').length;
  const totalPerak = allMedals.filter((m: any) => (m.medalType || '').toLowerCase() === 'perak').length;
  const totalPerunggu = allMedals.filter((m: any) => (m.medalType || '').toLowerCase() === 'perunggu').length;

  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans">
      <StatistikClient 
        emas={totalEmas} 
        perak={totalPerak} 
        perunggu={totalPerunggu} 
      />
    </main>
  );
}
