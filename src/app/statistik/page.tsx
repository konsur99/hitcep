import StatistikClient from './StatistikClient';
import { getPublicCache } from '@/lib/publicData';

// Vercel Edge caching config: Cache this page for 1 hour.
export const revalidate = 3600; 

export default async function Statistik() {
  const cacheData = await getPublicCache();
  const cabors: any[] = cacheData.cabors || [];

  // Hitung total keseluruhan medali Surakarta
  let totalEmas = 0;
  let totalPerak = 0;
  let totalPerunggu = 0;

  cabors.forEach(cabor => {
    totalEmas += (cabor.gold || 0);
    totalPerak += (cabor.silver || 0);
    totalPerunggu += (cabor.bronze || 0);
  });

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
