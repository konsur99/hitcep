import { MetadataRoute } from 'next';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';

export const revalidate = 3600; // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://quikkoni.com';

  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${baseUrl}/medali`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/statistik`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cabor`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pelaporan`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.7,
    }
  ];

  try {
    // Fetch cabors dynamically from cache to generate specific sport pages
    const cacheSnap = await getAdminDb().collection('public_cache').doc('v1').get();
    const data = cacheSnap.data();
    
    if (data && data.cabors) {
      data.cabors.forEach((cabor: any) => {
        if (cabor.id) {
          routes.push({
            url: `${baseUrl}/cabor/${cabor.id}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.6,
          });
        }
      });
    }
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);
  }

  // Note: Private pages (profil, validasi, pengaturan) are intentionally omitted for SEO safety.
  return routes;
}

