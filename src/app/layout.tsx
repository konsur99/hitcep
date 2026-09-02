import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import NextTopLoader from 'nextjs-toploader';
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import SessionGuard from "@/components/SessionGuard";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { GlobalLoaderProvider } from "@/components/GlobalLoader";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://quikkoni.com"),
  alternates: {
    canonical: "/",
  },
  title: "QuikKONI - Live Klasemen Medali & Hasil Porprov Jawa Tengah (Jateng) 2026",
  description: "Pantau hasil lomba, perolehan medali kontingen, dan klasemen olahraga secara real-time pada Pekan Olahraga Provinsi (Porprov) Jawa Tengah (Jateng) 2026. Berita, statistik, dan jadwal cabang olahraga (cabor) terupdate langsung dari KONI.",
  keywords: [
    // Brand & Main Event
    "quikkoni", "QuikKONI", "porprov", "porprov jateng", "porprov jawa tengah", 
    "porprov 2026", "porprov jateng 2026", "porprov jawa tengah 2026", "koni", "koni surakarta", "koni solo",
    "pekan olahraga provinsi", "pekan olahraga", 
    // Typos & Exact User Variations
    "poprov", "poprov 2026", "poprov jateng 2026", "poprov jawa tengah 2026", "proprov",
    // Keywords from user request
    "lomba", "olahraga", "kompetisi", "kejuaraan", "pertandingan", "atlet",
    "hasil lomba porprov", "jadwal lomba porprov", "berita olahraga",
    // Leaderboard / Medals
    "klasemen porprov jateng 2026", "klasemen porprov 2026", "klasemen porprov",
    "kalsemen porprov jawa tengah 2026",
    "perolehan medali", "perolehan medali porprov", "perolehan medali porprov jateng",
    "hasil porprov", "hasil pertandingan", "medali emas", "medali perak", "medali perunggu",
    // Sports (Cabang Olahraga)
    "cabor porprov", "cabor", "cabang olahraga", "atletik", "renang", "sepakbola", "badminton", "basket"
  ],
  authors: [{ name: "KONI Surakarta" }],
  creator: "KONI Surakarta",
  publisher: "KONI Surakarta",
  openGraph: {
    title: "QuikKONI - Live Hasil & Klasemen Medali Porprov Jateng 2026",
    description: "Pantau klasemen medali, hasil pertandingan olahraga, dan berita terbaru Pekan Olahraga Provinsi (Porprov) Jawa Tengah 2026 secara real-time.",
    url: "https://quikkoni.com",
    siteName: "QuikKONI Porprov Jateng",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuikKONI - Live Klasemen Medali Porprov Jateng 2026",
    description: "Pantau hasil lomba, perolehan medali, dan statistik cabor pada Pekan Olahraga Provinsi (Porprov) Jawa Tengah (Jateng) 2026.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "SportsEvent",
                "name": "Pekan Olahraga Provinsi Jawa Tengah 2026",
                "alternateName": [
                  "Porprov Jateng 2026",
                  "Porprov 2026",
                  "Porprov Jawa Tengah 2026",
                  "Poprov Jateng 2026"
                ],
                "description": "Klasemen medali, hasil lomba, dan berita resmi Pekan Olahraga Provinsi Jawa Tengah 2026.",
                "startDate": "2026-08-01",
                "endDate": "2026-08-15",
                "eventStatus": "https://schema.org/EventScheduled",
                "eventAttendanceMode": "https://schema.org/MixedEventAttendanceMode",
                "location": {
                  "@type": "Place",
                  "name": "Jawa Tengah, Indonesia",
                  "address": {
                    "@type": "PostalAddress",
                    "addressRegion": "Jawa Tengah",
                    "addressCountry": "ID"
                  }
                },
                "organizer": {
                  "@type": "SportsOrganization",
                  "name": "KONI Surakarta",
                  "url": "https://quikkoni.com",
                  "logo": "https://quikkoni.com/icon.png"
                }
              }
            ])
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        <NextTopLoader
          color="#3b82f6"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
          zIndex={9999999}
        />
        <GlobalLoaderProvider>
          <SessionGuard>
            <ConfirmProvider>
              {/* App Container */}
              <div className="w-full min-h-screen relative pb-20 xl:pb-0 overflow-x-hidden" data-purpose="app-container">
                <Header />
                {children}
                <BottomNav />
                <Toaster position="top-center" richColors theme="light" />
              </div>
            </ConfirmProvider>
          </SessionGuard>
        </GlobalLoaderProvider>
      </body>
    </html>
  );
}
