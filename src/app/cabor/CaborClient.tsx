"use client";

import { useState } from 'react';
import Link from 'next/link';

type SortDirection = 'tertinggi' | 'terendah';
type SortMetric = 'alfabet' | 'total' | 'emas' | 'perak' | 'perunggu';

export default function CaborClient({ initialCabors, initialMedals = [] }: { initialCabors: any[], initialMedals?: any[] }) {
  const [cabors] = useState<any[]>(initialCabors);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Applied State
  const [sortDirection, setSortDirection] = useState<SortDirection>('tertinggi');
  const [sortMetric, setSortMetric] = useState<SortMetric>('alfabet');

  // Draft State (for the menu)
  const [tempSortDirection, setTempSortDirection] = useState<SortDirection>('tertinggi');
  const [tempSortMetric, setTempSortMetric] = useState<SortMetric>('alfabet');

  // Filter cabor based on search
  let filteredCabor = cabors.filter((cabor) => {
    const query = searchTerm.toLowerCase();
    const matchName = cabor.name.toLowerCase().includes(query);
    const relatedMedals = initialMedals.filter(m => m.caborId === cabor.id);
    const matchAthlete = relatedMedals.some(m => m.athleteName?.toLowerCase().includes(query));
    const matchCategory = relatedMedals.some(m => m.category?.toLowerCase().includes(query));
    return matchName || matchAthlete || matchCategory;
  });

  // Sort logic (using APPLIED state)
  filteredCabor = filteredCabor.sort((a, b) => {
    if (sortMetric === 'alfabet') {
      return a.name.localeCompare(b.name);
    }

    let valA = 0;
    let valB = 0;

    if (sortMetric === 'total') {
      valA = (a.gold || 0) + (a.silver || 0) + (a.bronze || 0);
      valB = (b.gold || 0) + (b.silver || 0) + (b.bronze || 0);
    } else if (sortMetric === 'emas') {
      valA = a.gold || 0;
      valB = b.gold || 0;
    } else if (sortMetric === 'perak') {
      valA = a.silver || 0;
      valB = b.silver || 0;
    } else if (sortMetric === 'perunggu') {
      valA = a.bronze || 0;
      valB = b.bronze || 0;
    }

    if (sortDirection === 'tertinggi') {
      return valB - valA;
    } else {
      return valA - valB;
    }
  });

  const getMetricLabel = (metric: SortMetric) => {
    switch (metric) {
      case 'alfabet': return 'Alfabet (A-Z)';
      case 'total': return 'Total Medali';
      case 'emas': return 'Emas';
      case 'perak': return 'Perak';
      case 'perunggu': return 'Perunggu';
    }
  };

  const handleOpenSort = () => {
    setTempSortDirection(sortDirection);
    setTempSortMetric(sortMetric);
    setIsSortOpen(!isSortOpen);
  };

  const handleApplySort = () => {
    if (tempSortMetric === 'alfabet') {
        setSortMetric('total');
        setTempSortMetric('total');
    } else {
        setSortMetric(tempSortMetric);
    }
    setSortDirection(tempSortDirection);
    setIsSortOpen(false);
  };

  const normalizeCaborId = (id: string) => {
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
      'soft-ball': 'softball-dan-baseball',
      'shorinji-kempo': 'kempo',
      'tinju-amatir': 'tinju'
    };
    return map[id] || id;
  };

  const getMicroThumbnail = (url: string, id: string) => {
    if (!url) return `/cabor/${normalizeCaborId(id)}.webp`;
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/c_fill,w_100,q_auto,f_webp/');
    }
    return url;
  };

  return (
    <>
      {/* Header Banner */}
      <section 
        className="relative overflow-hidden pt-6 md:pt-12 lg:pt-16 pb-12 md:pb-20 lg:pb-24 text-white rounded-b-3xl md:rounded-b-[4rem] shadow-md bg-gradient-to-r from-[#960309] via-[#520111] to-[#67030B]"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 xl:px-12 flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-8">
          <div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-2 md:mb-4 tracking-tight">Daftar <span className="text-solo-gold">Cabor</span></h2>
            <p className="text-sm md:text-base lg:text-lg text-gray-200 leading-relaxed max-w-[280px] md:max-w-md">Informasi komprehensif mengenai klasemen dan distribusi perolehan medali dari setiap cabang olahraga.</p>
          </div>
        </div>
      </section>

      <main className="px-5 md:px-12 -mt-5 md:-mt-8 relative z-20 space-y-5 md:space-y-8 max-w-7xl mx-auto pb-12">
        {/* Toolbar: Search, Sort, Badges */}
        <div className="flex flex-col-reverse md:flex-row justify-between items-start md:items-center gap-4 relative z-30">
          
          {/* LEFT SIDE: Active Sort Badge */}
          <div className="flex items-center w-full md:w-auto justify-start">
            {sortMetric !== 'alfabet' && (
              <div className={`border rounded-xl px-3 py-1.5 md:py-2 flex items-center gap-2 shadow-sm shrink-0 transition-all ${
                sortMetric === 'emas' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                sortMetric === 'perak' ? 'bg-slate-50 border-slate-200 text-slate-700' :
                sortMetric === 'perunggu' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                <i className={`fa-solid fa-arrow-${sortDirection === 'tertinggi' ? 'down' : 'up'}-9-1 text-[10px] md:text-sm ${
                  sortMetric === 'emas' ? 'text-yellow-500' :
                  sortMetric === 'perak' ? 'text-slate-400' :
                  sortMetric === 'perunggu' ? 'text-orange-500' :
                  'text-blue-500'
                }`}></i>
                <span className="text-[10px] md:text-sm font-bold tracking-tight capitalize">
                  {sortMetric === 'total' ? 'Total Medali' : `Medali ${sortMetric}`} ({sortDirection})
                </span>
                <button 
                  onClick={() => { setSortMetric('alfabet'); setSortDirection('tertinggi'); }}
                  className={`w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full transition-all hover:scale-110 ${
                    sortMetric === 'emas' ? 'bg-yellow-200/50 text-yellow-600 hover:bg-yellow-300' :
                    sortMetric === 'perak' ? 'bg-slate-200/70 text-slate-600 hover:bg-slate-300' :
                    sortMetric === 'perunggu' ? 'bg-orange-200/50 text-orange-600 hover:bg-orange-300' :
                    'bg-blue-200/50 text-blue-600 hover:bg-blue-300'
                  }`}
                >
                  <i className="fa-solid fa-xmark text-[8px] md:text-[10px]"></i>
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Search & Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            
            {/* Search Bar */}
            <div className="relative w-[180px] sm:w-[220px] md:w-[280px] lg:w-[320px] shrink-0 group">
              <i className="fa-solid fa-magnifying-glass absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-solo-red transition-colors text-[10px] md:text-sm"></i>
              <input 
                type="text" 
                placeholder="Cari..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 md:pl-9 pr-7 py-2 bg-white border border-gray-200 rounded-xl text-[10px] md:text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-solo-red/20 focus:border-solo-red shadow-sm transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-solo-red bg-gray-50 hover:bg-red-50 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                >
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative">
              <button 
                onClick={handleOpenSort}
                className="w-[38px] h-[34px] md:w-12 md:h-10 flex items-center justify-center rounded-xl border transition-colors shrink-0 shadow-sm bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                <i className="fa-solid fa-sliders text-sm md:text-base"></i>
              </button>

              {/* Dropdown Menu */}
              {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-52 md:w-64 bg-gray-300/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-400/30 p-2.5 md:p-4 z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
                  <div className="mb-3 md:mb-4">
                    <div className="text-[9px] md:text-[10px] font-extrabold text-gray-600 uppercase tracking-widest mb-1.5 md:mb-2">Urutan</div>
                    <div className="flex gap-1 p-1 rounded-xl border border-gray-400/20 bg-gray-200/50">
                      <button
                        onClick={() => { setTempSortDirection('tertinggi'); if (tempSortMetric === 'alfabet') setTempSortMetric('total'); }}
                        className={`flex-1 py-1.5 text-[10px] md:text-xs rounded-lg font-bold transition-all ${tempSortDirection === 'tertinggi' ? 'bg-solo-red text-white' : 'text-gray-700'}`}
                      >Tertinggi</button>
                      <button
                        onClick={() => { setTempSortDirection('terendah'); if (tempSortMetric === 'alfabet') setTempSortMetric('total'); }}
                        className={`flex-1 py-1.5 text-[10px] md:text-xs rounded-lg font-bold transition-all ${tempSortDirection === 'terendah' ? 'bg-solo-red text-white' : 'text-gray-700'}`}
                      >Terendah</button>
                    </div>
                  </div>
                  <div className="mb-3 md:mb-4">
                    <div className="text-[9px] md:text-[10px] font-extrabold text-gray-600 uppercase tracking-widest mb-1.5 md:mb-2">Kategori Medali</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['total', 'emas', 'perak', 'perunggu'] as SortMetric[]).map((metric) => (
                        <button
                          key={metric}
                          onClick={() => setTempSortMetric(metric)}
                          className={`py-1.5 md:py-2 px-1.5 text-[10px] md:text-xs rounded-xl font-bold border transition-all ${tempSortMetric === metric ? (metric === 'emas' ? 'bg-yellow-500 border-transparent text-white' : metric === 'perak' ? 'bg-slate-400 border-transparent text-white' : metric === 'perunggu' ? 'bg-orange-600 border-transparent text-white' : 'bg-blue-500 border-transparent text-white') : 'bg-gray-200/50 border-gray-400/20 text-gray-700 hover:bg-gray-300/50'}`}
                        >
                          {metric === 'total' ? 'Total' : metric.charAt(0).toUpperCase() + metric.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={handleApplySort}
                    className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                  >
                    Terapkan
                  </button>
                </div>
              </>
              )}
            </div>
          </div>
        </div>

        {/* Cabor Grid */}
        <div className="space-y-4">
          {filteredCabor.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
              {filteredCabor.map((cabor) => (
                <Link 
                  key={cabor.id}
                  href={`/cabor/${cabor.id}`} 
                  target="_self"
                  className="block h-full bg-gradient-to-b from-white to-gray-50/50 rounded-[1.5rem] p-4 md:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-gray-100 hover:border-red-100 group transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-solo-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-t-[1.5rem]"></div>
                  
                  <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-solo-red/20 rounded-full blur-xl scale-50 group-hover:scale-125 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                      <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.25rem] flex items-center justify-center bg-white p-3 md:p-4 border border-gray-100 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 group-hover:-rotate-3">
                        <img src={getMicroThumbnail(cabor.image, cabor.id)} alt={cabor.name} className="w-full h-full object-contain drop-shadow-sm group-hover:drop-shadow-md transition-all duration-300" />
                      </div>
                    </div>
                    
                    <div className="text-center w-full mt-1">
                      <h3 className="font-extrabold text-gray-800 text-xs md:text-sm mb-3 truncate px-1 group-hover:text-solo-red transition-colors duration-300">{cabor.name}</h3>
                      
                      <div className="flex items-center justify-center gap-1.5 md:gap-2">
                        <div className={`flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-full border transition-all duration-300 ${cabor.gold > 0 ? 'bg-yellow-50/80 border-yellow-200/50' : 'bg-gray-50 border-gray-100 opacity-50 grayscale-[50%]'}`}>
                          <img src="/medal-gold.webp" className={`w-3 h-3 md:w-3.5 md:h-3.5 object-contain ${cabor.gold > 0 ? 'drop-shadow-sm' : ''}`}/>
                          <span className={`text-[9px] md:text-[10px] font-black ${cabor.gold > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>{cabor.gold || 0}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-full border transition-all duration-300 ${cabor.silver > 0 ? 'bg-slate-50/80 border-slate-200/50' : 'bg-gray-50 border-gray-100 opacity-50 grayscale-[50%]'}`}>
                          <img src="/medal-silver.webp" className={`w-3 h-3 md:w-3.5 md:h-3.5 object-contain ${cabor.silver > 0 ? 'drop-shadow-sm' : ''}`}/>
                          <span className={`text-[9px] md:text-[10px] font-black ${cabor.silver > 0 ? 'text-slate-700' : 'text-gray-400'}`}>{cabor.silver || 0}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-full border transition-all duration-300 ${cabor.bronze > 0 ? 'bg-orange-50/80 border-orange-200/50' : 'bg-gray-50 border-gray-100 opacity-50 grayscale-[50%]'}`}>
                          <img src="/medal-bronze.webp" className={`w-3 h-3 md:w-3.5 md:h-3.5 object-contain ${cabor.bronze > 0 ? 'drop-shadow-sm' : ''}`}/>
                          <span className={`text-[9px] md:text-[10px] font-black ${cabor.bronze > 0 ? 'text-orange-800' : 'text-gray-400'}`}>{cabor.bronze || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-solo-red via-solo-red to-solo-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 md:py-20">
              <i className="fa-solid fa-search text-4xl md:text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 text-sm md:text-base font-medium">Cabang olahraga tidak ditemukan.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
