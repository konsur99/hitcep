import { adminDb } from '@/lib/firebase-admin';
import MedaliClient from './MedaliClient';

export const dynamic = 'force-dynamic';

export default async function Medali() {
  const cacheSnap = await adminDb.collection("public_cache").doc("v1").get();
  const rawCacheData = cacheSnap.data() || { cabors: [], medals: [] };
  const cacheData = JSON.parse(JSON.stringify(rawCacheData));

  const cabors: any[] = cacheData.cabors || [];
  let medals: any[] = cacheData.medals || [];
  
  const safeParseDate = (input: any) => {
    if (!input) return new Date(0);
    if (typeof input.toDate === 'function') return input.toDate();
    if (typeof input === 'object' && input._seconds !== undefined) return new Date(input._seconds * 1000);
    if (typeof input === 'object' && input.seconds !== undefined) return new Date(input.seconds * 1000);
    return new Date(input);
  };

  // Sort descending by createdAt since the cache might not be perfectly sorted
  medals.sort((a, b) => safeParseDate(b.createdAt).getTime() - safeParseDate(a.createdAt).getTime());
  
  // Filter approved medals
  medals = medals.filter((m: any) => m.status === 'approved' || !m.status);

  return (
    <div className="pb-6">
      {/* Header Banner */}
      <section 
        className="relative overflow-hidden pt-6 md:pt-12 lg:pt-16 pb-12 md:pb-20 lg:pb-24 text-white rounded-b-3xl md:rounded-b-[4rem] shadow-md bg-gradient-to-r from-[#960309] via-[#520111] to-[#67030B]"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 xl:px-12 flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-8">
          <div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-2 md:mb-4 tracking-tight">Detail <span className="text-solo-gold">Medali</span></h2>
            <p className="text-sm md:text-base lg:text-lg text-gray-200 leading-relaxed max-w-[280px] md:max-w-md">Rincian perolehan medali kontingen Surakarta.</p>
          </div>
        </div>
      </section>

      <MedaliClient initialMedals={medals} cabors={cabors} />
    </div>
  );
}
