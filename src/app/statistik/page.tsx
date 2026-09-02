import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

import StatistikClient from './StatistikClient';

export const revalidate = 10; // Cache 10 detik (ISR)

export default async function Statistik() {
  const cacheSnap = await getDoc(doc(db, 'public_cache', 'v1'));
    const rawData = cacheSnap.exists() ? cacheSnap.data() : { cabors: [], medals: [], reports: [] };
    
    // Normalize timestamps for Server Component serialization
    const cacheData: any = {
      ...rawData,
      medals: rawData.medals?.map((m: any) => ({
        ...m,
        createdAt: m.createdAt ? (typeof m.createdAt.toDate === 'function' ? m.createdAt.toDate().getTime() : (m.createdAt.seconds ? m.createdAt.seconds * 1000 : (typeof m.createdAt === 'string' ? new Date(m.createdAt).getTime() : (typeof m.createdAt === 'number' ? m.createdAt : null)))) : null
      })) || []
    };
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
