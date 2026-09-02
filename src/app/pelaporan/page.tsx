import { adminDb } from '@/lib/firebase-admin';
import PelaporanClient from './PelaporanClient';

 // Cache 30 detik (ISR) dengan Aggregated Document
export const revalidate = 30;

export default async function Pelaporan() {
  const cacheSnap = await adminDb.collection("public_cache").doc("v1").get();
  const rawCacheData = cacheSnap.data() || { cabors: [], reports: [] };
  const cacheData = JSON.parse(JSON.stringify(rawCacheData));

  const cabors: any[] = cacheData.cabors || [];
  cabors.sort((a: any, b: any) => a.name.localeCompare(b.name));

  const safeParseDate = (input: any) => {
    if (!input) return new Date(0);
    if (typeof input.toDate === 'function') return input.toDate();
    if (typeof input === 'object' && input._seconds !== undefined) return new Date(input._seconds * 1000);
    if (typeof input === 'object' && input.seconds !== undefined) return new Date(input.seconds * 1000);
    return new Date(input);
  };

  let allReports: any[] = cacheData.reports || [];
  // Sort descending by createdAt
  allReports.sort((a, b) => safeParseDate(b.createdAt).getTime() - safeParseDate(a.createdAt).getTime());
  
  const reports = allReports.filter((r: any) => r.status !== 'pending');

  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans selection:bg-blue-200">
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white rounded-b-3xl shadow-[0_10px_25px_-5px_rgba(29,78,216,0.4)] relative overflow-hidden px-5 pt-6 pb-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 text-center mt-2">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner border border-white/20">
            <i className="fa-solid fa-bullhorn text-2xl text-blue-200"></i>
          </div>
          <h2 className="text-xl font-extrabold mb-1">Papan Pelaporan Cabor</h2>
          <p className="text-xs text-blue-200 font-medium">Informasi dan aduan langsung dari lapangan.</p>
        </div>
      </div>

      <PelaporanClient initialReports={reports} cabors={cabors} />
    </main>
  );
}
