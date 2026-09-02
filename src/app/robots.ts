import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://quikkoni.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/validasi',
        '/validasi-pelaporan',
        '/input-medali',
        '/input-pelaporan',
        '/pengaturan',
        '/developer',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
