
import StatistikClient from './StatistikClient';

 // Cache 60 detik (ISR)

export default async function Statistik() {
  const cacheSnap = await getAdminDb().collection("public_cache").doc("v1").get();
  const cacheData = cacheSnap.data() || { cabors: [] };
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
