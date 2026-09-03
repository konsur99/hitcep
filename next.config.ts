import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
  serverExternalPackages: ['firebase-admin'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Mencegah clickjacking (aplikasi tidak bisa di-embed di iframe web lain)
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Mencegah MIME-sniffing
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Menjaga privasi URL referrer
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload', // Memaksa penggunaan HTTPS (HSTS)
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', // Membatasi akses hardware yang tidak perlu
          }
        ],
      },
    ];
  },
};

export default nextConfig;
