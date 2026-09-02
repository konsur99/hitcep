import Link from 'next/link';
import { adminDb } from '@/lib/firebase-admin';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import nextDynamic from 'next/dynamic';

const AnimatedBarChart = nextDynamic(() => import('@/components/AnimatedBarChart'), { 
  loading: () => <div className="h-[250px] md:h-[300px] w-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center"><span className="text-gray-400 font-medium">Memuat Grafik...</span></div>
});



const getMedalImage = (type: string) => {
  if (type === 'emas') return '/medal-gold.webp';
  if (type === 'perak') return '/medal-silver.webp';
  return '/medal-bronze.webp';
};

export const revalidate = 10; // ISR cache for 10 seconds

export default async function Home() {
  // 1. Fetch data dari Super Cache (Hanya 1 Read Firestore!)
  const cacheSnap = await adminDb.collection("public_cache").doc("v1").get();
  const rawCacheData = cacheSnap.data() || { cabors: [], medals: [], reports: [] };
  const cacheData = JSON.parse(JSON.stringify(rawCacheData));
  
  const cabors: any[] = cacheData.cabors || [];
  
  let emas = 0, perak = 0, perunggu = 0;
  cabors.forEach((cabor: any) => {
    emas += cabor.gold || 0;
    perak += cabor.silver || 0;
    perunggu += cabor.bronze || 0;
  });
  const totals = { emas, perak, perunggu, total: emas + perak + perunggu };

  const safeParseDate = (input: any) => {
    if (!input) return new Date(0);
    if (typeof input.toDate === 'function') return input.toDate();
    if (typeof input === 'object' && input._seconds !== undefined) return new Date(input._seconds * 1000);
    if (typeof input === 'object' && input.seconds !== undefined) return new Date(input.seconds * 1000);
    return new Date(input);
  };

  // 2. Ambil Recent Medals (5 terbaru) dari Cache array
  let allMedals: any[] = cacheData.medals || [];
  allMedals = allMedals.filter((m: any) => m.status === 'approved' || !m.status);
  // Sort descending by createdAt
  const sortedMedals = [...allMedals].sort((a, b) => safeParseDate(b.createdAt).getTime() - safeParseDate(a.createdAt).getTime());
  const recentMedals = sortedMedals.slice(0, 5);

  // 3. Ambil Recent Reports (3 terbaru) dari Cache array
  const allReports: any[] = cacheData.reports || [];
  const sortedReports = [...allReports].sort((a, b) => safeParseDate(b.createdAt).getTime() - safeParseDate(a.createdAt).getTime());
  const recentReports = sortedReports.slice(0, 3);

  // Process top cabors
  const topCabors = [...cabors]
    .sort((a: any, b: any) => {
      if (b.gold !== a.gold) return (b.gold || 0) - (a.gold || 0);
      if (b.silver !== a.silver) return (b.silver || 0) - (a.silver || 0);
      return (b.bronze || 0) - (a.bronze || 0);
    })
    .slice(0, 5);

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-solo-red';
    if (index === 1) return 'bg-gray-500';
    if (index === 2) return 'bg-amber-600';
    return 'bg-gray-400';
  };

  const formatTime = (input: any) => {
    if (!input) return '';
    try {
      let date;
      if (typeof input.toDate === 'function') {
        date = input.toDate();
      } else if (typeof input === 'object' && input._seconds !== undefined) {
        date = new Date(input._seconds * 1000);
      } else if (typeof input === 'object' && input.seconds !== undefined) {
        date = new Date(input.seconds * 1000);
      } else {
        date = new Date(input);
      }
      if (isNaN(date.getTime())) return '';
      return formatDistanceToNow(date, { addSuffix: true, locale: id });
    } catch (e) {
      return '';
    }
  };

  // Helper untuk mengubah URL gambar Cloudinary menjadi Micro-Thumbnail atau Fallback Lokal
  const getMicroThumbnail = (url: string | undefined, id: string) => {
    if (url && url.includes('cloudinary.com') && url.includes('/upload/')) {
      let optimized = url.replace('/upload/', '/upload/c_fill,w_100,q_auto:eco,f_auto/');
      optimized = optimized.replace(/\.[^/.]+$/, '.jpg');
      return optimized;
    }
    if (url) return url;
    
    const map: Record<string, string> = {
      'akuatik': 'renang',
      'balap-motor': 'bermotor',
      'billiar': 'biliar',
      'biliard': 'biliar',
      'bola-basket': 'basket',
      'bola-volly': 'bola-voli',
      'bulu-tangkis': 'badminton',
      'dansa': 'dansa-sport',
      'drum-band': 'drumband',
      'esport': 'esports',
      'gantole': 'gantolle',
      'kickboxing': 'kick-boxing',
      'pencaksilat': 'pencak-silat',
      'sepak-bola': 'sepakbola',
      'softball-baseball': 'softball-dan-baseball',
      'tinju-amatir': 'tinju'
    };
    const mappedId = map[id] || id;
    return `/cabor/${mappedId}.png`;
  };

  return (
    <div id="page-beranda" className="page-content block">
      <link rel="preload" href="/hero-bg-desktop.webp" as="image" />
      {/* BEGIN: Hero Section */}
      <section 
        className="relative overflow-hidden pt-6 md:pt-8 lg:pt-12 pb-16 md:pb-36 lg:pb-40 text-white rounded-b-3xl md:rounded-b-[4rem]"
      >
        {/* Mobile Background */}
        <div 
          className="absolute inset-0 md:hidden z-0"
          style={{ background: `url('/hero-bg.webp') center top / cover no-repeat, linear-gradient(135deg, #960309 0%, #520111 100%)` }}
        ></div>
        
        {/* Desktop Background */}
        <div 
          className="absolute inset-0 hidden md:block z-0"
          style={{ 
            backgroundImage: `url('/hero-bg-desktop.webp')`,
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat'
          }}
        ></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 xl:px-12">
          <div className="hero-content flex flex-col items-start text-left w-full md:w-2/3 lg:w-1/2">
            <div className="inline-flex items-center bg-solo-red-dark/80 backdrop-blur-sm text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full mb-4 md:mb-6 tracking-wide shadow-sm border border-white/10">
              <span className="relative flex h-2 md:h-3 w-2 md:w-3 mr-2 md:mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 md:h-3 w-2 md:w-3 bg-red-500"></span>
              </span> 
              LIVE DATA
            </div>
            <h1 className="text-3xl md:text-6xl font-extrabold leading-tight mb-2 md:mb-4 tracking-tight drop-shadow-sm">
              SOLO <span className="text-solo-gold">JUARA</span>
            </h1>
            <h2 className="text-lg md:text-2xl font-semibold mb-3 md:mb-5 text-white/90 drop-shadow-sm">Porprov 2026 QuikKONI</h2>
            <p className="text-xs md:text-base text-gray-200 max-w-[280px] md:max-w-md leading-relaxed font-medium">
              Pusat informasi resmi perolehan medali. Kawal dan saksikan kejayaan kontingen Kota Surakarta meraih prestasi gemilang!
            </p>
          </div>
        </div>
      </section>
      {/* END: Hero Section */}

      {/* BEGIN: Main Content Area */}
      <main className="px-4 md:px-8 xl:px-12 -mt-12 md:-mt-20 relative z-10 pb-12 md:pb-24 max-w-7xl mx-auto">
        
        {/* BEGIN: Medal Tally Cards */}
        <section data-purpose="medal-tally">
          <div className="grid grid-cols-3 gap-3 md:gap-6 mb-3 md:mb-6">
            {/* Gold */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
              <img src="/medal-gold.webp" alt="Emas" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" />
              <span className="text-xs md:text-sm font-bold text-solo-gold mb-1 md:mb-2">EMAS</span>
              <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{totals.emas}</span>
            </div>
            {/* Silver */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
              <img src="/medal-silver.webp" alt="Perak" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" />
              <span className="text-xs md:text-sm font-bold text-gray-500 mb-1 md:mb-2">PERAK</span>
              <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{totals.perak}</span>
            </div>
            {/* Bronze */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
              <img src="/medal-bronze.webp" alt="Perunggu" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" />
              <span className="text-xs md:text-sm font-bold text-amber-700 mb-1 md:mb-2">PERUNGGU</span>
              <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{totals.perunggu}</span>
            </div>
          </div>
          {/* Total Medals */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 flex items-center justify-between shadow-card border border-gray-100 relative overflow-hidden mb-6">
            <div className="flex-1 text-center">
              <div className="text-xs md:text-sm font-bold text-gray-800 tracking-widest mb-1 md:mb-2">TOTAL MEDALI</div>
              <div className="text-4xl md:text-6xl font-black text-gray-900">{totals.total}</div>
            </div>
            <img src="/daun.webp" alt="Daun" className="h-24 md:h-40 w-auto absolute -bottom-2 md:-bottom-4 right-0 opacity-40 object-contain drop-shadow-sm mix-blend-multiply" />
          </div>
        </section>
        {/* END: Medal Tally Cards */}

        {/* 2-Column Grid for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          
          {/* Column 1 (Left): Bar Chart */}
          <div className="flex flex-col gap-4 md:gap-8 h-fit">
            <AnimatedBarChart emas={totals.emas} perak={totals.perak} perunggu={totals.perunggu} />
          </div>

          {/* Column 2 (Right): Kontribusi Cabor & Medali Terbaru */}
          <div className="flex flex-col gap-4 md:gap-8">
            
            {/* Kontribusi Cabor */}
            <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-card border border-gray-100 h-fit" data-purpose="kontribusi-cabor">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="font-bold text-gray-800 text-sm md:text-base">KONTRIBUSI CABOR</h3>
                <Link href="/cabor" className="text-xs md:text-sm text-solo-red font-semibold hover:underline">
                  Lihat Semua
                </Link>
              </div>
              <ul className="space-y-3">
                {topCabors.map((cabor, index) => (
                  <li key={cabor.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                      <span className={`${getRankBg(index)} text-white text-[10px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 overflow-hidden shrink-0">
                        <img src={getMicroThumbnail(cabor.image, cabor.id)} alt={cabor.name} className="w-4 h-4 md:w-5 md:h-5 object-contain drop-shadow-sm" />
                      </div>
                      <span className="text-sm md:text-base font-semibold text-gray-800 truncate max-w-[120px] md:max-w-[180px]">{cabor.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm font-bold justify-end shrink-0">
                      <span className="flex items-center justify-between w-7 md:w-9"><img src="/medal-gold.webp" alt="Emas" className="h-4 w-4 md:h-5 md:w-5 object-contain" /> <span>{cabor.gold || 0}</span></span>
                      <span className="flex items-center justify-between w-7 md:w-9"><img src="/medal-silver.webp" alt="Perak" className="h-4 w-4 md:h-5 md:w-5 object-contain" /> <span>{cabor.silver || 0}</span></span>
                      <span className="flex items-center justify-between w-7 md:w-9"><img src="/medal-bronze.webp" alt="Perunggu" className="h-4 w-4 md:h-5 md:w-5 object-contain" /> <span>{cabor.bronze || 0}</span></span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Medali Terbaru */}
            <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-card border border-gray-100 flex-1" data-purpose="medali-terbaru">
              <div className="flex justify-between items-center mb-3 md:mb-5">
                <h3 className="font-bold text-gray-800 text-sm md:text-base">MEDALI TERBARU</h3>
                <Link href="/medali" className="text-xs md:text-sm text-solo-red font-semibold hover:underline">
                  Lihat Semua
                </Link>
              </div>
              <div className="space-y-3">
                {recentMedals.length > 0 ? recentMedals.map((item: any) => {
                  const cabor = cabors.find(c => c.id === item.caborId);
                  return (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 md:p-3 rounded-lg md:rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <div className="relative shrink-0">
                          <img alt="Medal" className="h-8 w-8 md:h-10 md:w-10 object-contain drop-shadow-sm" src={getMedalImage(item.medalType)} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm md:text-base font-bold text-gray-800 truncate">{item.athleteName}</div>
                          <div className="text-xs md:text-sm text-gray-500 truncate">{cabor?.name} - {item.category}</div>
                        </div>
                      </div>
                      <div className="text-[10px] md:text-xs font-bold text-solo-red shrink-0 whitespace-nowrap pl-2">
                        {formatTime(item.createdAt)}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-4 text-xs font-medium text-gray-400">Belum ada medali</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
