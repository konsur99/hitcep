import { adminDb } from '@/lib/firebase-admin';
import CaborClient from './CaborClient';

 // Cache 60 detik (ISR) dengan Aggregated Document

export default async function Cabor() {
  const cacheSnap = await adminDb.collection("public_cache").doc("v1").get();
  const rawCacheData = cacheSnap.data() || { cabors: [] };
  const cacheData = JSON.parse(JSON.stringify(rawCacheData));
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
