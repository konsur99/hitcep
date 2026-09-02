import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import CaborClient from './CaborClient';

export const revalidate = 10;

export default async function Cabor() {
  const cacheSnap = await getDoc(doc(db, 'public_cache', 'v1'));
    const rawData = cacheSnap.exists() ? cacheSnap.data() : { cabors: [], medals: [], reports: [] };
    
    // Normalize timestamps for Server Component serialization
    const cacheData: any = {
      ...rawData,
      medals: rawData.medals?.map((m: any) => ({
        ...m,
        createdAt: m.createdAt && typeof m.createdAt.toDate === 'function' 
          ? m.createdAt.toDate().getTime() 
          : (m.createdAt?.seconds ? m.createdAt.seconds * 1000 : null)
      })) || []
    };
  const cabors: any[] = cacheData.cabors || [];
  let medals: any[] = cacheData.medals || [];
  medals = medals.filter((m: any) => m.status === 'approved' || !m.status);

  // Use real data exclusively for sync

  return (
    <div className="pb-6">
      <CaborClient initialCabors={cabors} initialMedals={medals} />
    </div>
  );
}
