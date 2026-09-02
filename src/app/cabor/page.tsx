import CaborClient from './CaborClient';

export const revalidate = 10;

export default async function Cabor() {
  const res = await fetch('https://hitcep.vercel.app/api/public_cache', { next: { revalidate: 10 } });
    const cacheData = await res.json();
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
