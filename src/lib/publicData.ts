import { unstable_cache } from 'next/cache';
import { getAdminDb } from '@/lib/firebase-admin';

export const getPublicCache = unstable_cache(
  async () => {
    try {
      const db = getAdminDb();
      const snap = await db.collection('public_cache').doc('v1').get();
      
      const rawData = snap.exists ? snap.data() : { cabors: [], medals: [], reports: [] };

      // Normalize timestamps to numbers (Unix MS) for safe Next.js Server-to-Client serialization
      const cacheData = {
        cabors: rawData?.cabors || [],
        reports: rawData?.reports || [],
        medals: rawData?.medals?.map((m: any) => ({
          ...m,
          createdAt: m.createdAt ? 
            (typeof m.createdAt.toDate === 'function' ? m.createdAt.toDate().getTime() : 
            (m.createdAt._seconds ? m.createdAt._seconds * 1000 : 
            (typeof m.createdAt === 'string' ? new Date(m.createdAt).getTime() : 
            (typeof m.createdAt === 'number' ? m.createdAt : null)))) : null
        })) || []
      };

      return cacheData as { cabors: any[], medals: any[], reports: any[] };
    } catch (error) {
      console.error('Error fetching public_cache:', error);
      return { cabors: [], medals: [], reports: [] }; // Fallback
    }
  },
  ['public-cache-v1'], // Cache key
  {
    tags: ['public-data'], // Tag for revalidateTag
    revalidate: 3600 // Revalidate every 1 hour (3600 seconds)
  }
);
