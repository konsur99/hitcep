
import StatistikClient from './StatistikClient';

export const revalidate = 10; // Cache 10 detik (ISR)

export default async function Statistik() {
  const res = await fetch('https://hitcep.vercel.app/api/public_cache', { next: { revalidate: 10 } });
  const cacheData = await res.json();
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
