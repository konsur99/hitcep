import { getPublicCache } from '@/lib/publicData';
import CaborClient from './CaborClient';

export const revalidate = 3600;

export default async function CaborPage() {
  const cacheData = await getPublicCache();
  const cabors: any[] = cacheData.cabors || [];
  let medals: any[] = cacheData.medals || [];
  medals = medals.filter((m: any) => m.status === 'approved' || !m.status);

  return (
    <div className="pb-6">
      <CaborClient initialCabors={cabors} initialMedals={medals} />
    </div>
  );
}
