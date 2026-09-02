"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import DateRangePicker from '@/components/DateRangePicker';

export default function MedaliClient({ initialMedals, cabors }: { initialMedals: any[], cabors: any[] }) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('semua'); // 'semua', 'emas', 'perak', 'perunggu'
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  let filteredMedals = initialMedals;
  if (activeFilter === 'emas') filteredMedals = initialMedals.filter(m => m.medalType === 'emas');
  if (activeFilter === 'perak') filteredMedals = initialMedals.filter(m => m.medalType === 'perak');
  if (activeFilter === 'perunggu') filteredMedals = initialMedals.filter(m => m.medalType === 'perunggu');

  const safeParseDate = (input: any) => {
    if (!input) return new Date();
    if (typeof input.toDate === 'function') return input.toDate();
    if (typeof input === 'object' && input._seconds !== undefined) return new Date(input._seconds * 1000);
    if (typeof input === 'object' && input.seconds !== undefined) return new Date(input.seconds * 1000);
    return new Date(input);
  };

  if (startDate) {
    const start = new Date(startDate);
    let end = new Date(startDate);
    if (endDate) {
      end = new Date(endDate);
    }
    end.setHours(23, 59, 59, 999);

    filteredMedals = filteredMedals.filter(m => {
      if (!m.createdAt) return false;
      const itemDate = safeParseDate(m.createdAt);
      return itemDate >= start && itemDate <= end;
    });
  }

  if (searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase();
    filteredMedals = filteredMedals.filter(m => {
      const caborName = cabors.find(c => c.id === m.caborId)?.name?.toLowerCase() || '';
      const matchAthlete = m.athleteName?.toLowerCase().includes(query) || false;
      const matchCategory = m.category?.toLowerCase().includes(query) || false;
      const matchCabor = caborName.includes(query);
      return matchAthlete || matchCategory || matchCabor;
    });
  }

  const filteredTally = {
    emas: filteredMedals.filter(m => m.medalType === 'emas').length,
    perak: filteredMedals.filter(m => m.medalType === 'perak').length,
    perunggu: filteredMedals.filter(m => m.medalType === 'perunggu').length,
    total: filteredMedals.length
  };

  const getMedalImage = (type: string) => {
    if (type === 'emas') return '/medal-gold.webp';
    if (type === 'perak') return '/medal-silver.webp';
    return '/medal-bronze.webp';
  };

  // Group medals by month and year
  const groupedMedals = filteredMedals.reduce((acc, item) => {
    let monthYear = 'Belum diketahui';
    if (item.createdAt) {
      const date = safeParseDate(item.createdAt);
      monthYear = format(date, "MMMM yyyy", { locale: idLocale });
    }
    
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(item);
    return acc;
  }, {} as Record<string, typeof filteredMedals>);

  return (
    <main className="px-5 md:px-12 pt-6 md:pt-12 relative z-20 space-y-6 md:space-y-10 pb-12 max-w-5xl mx-auto">
      {/* Summary Stats */}
      <section data-purpose="medal-tally">
        <h2 className="text-xl md:text-3xl font-extrabold text-gray-900 mb-4 md:mb-6">Total <span className="text-solo-red">Medali</span></h2>
        <div className="grid grid-cols-3 gap-3 md:gap-8 mb-3">
          <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
            <img alt="Emas" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" src="/medal-gold.webp" />
            <span className="text-xs md:text-sm font-bold text-solo-gold mb-1 md:mb-2">EMAS</span>
            <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{filteredTally.emas}</span>
          </div>
          <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
            <img alt="Perak" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" src="/medal-silver.webp" />
            <span className="text-xs md:text-sm font-bold text-gray-500 mb-1 md:mb-2">PERAK</span>
            <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{filteredTally.perak}</span>
          </div>
          <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
            <img alt="Perunggu" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" src="/medal-bronze.webp" />
            <span className="text-xs md:text-sm font-bold text-amber-700 mb-1 md:mb-2">PERUNGGU</span>
            <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{filteredTally.perunggu}</span>
          </div>
        </div>
      </section>

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-card border border-gray-100">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5 md:mb-8 relative z-30">
          <h3 className="font-bold text-gray-800 text-sm md:text-lg">RIWAYAT MEDALI</h3>
          
          <div className="flex flex-row gap-2 md:gap-3 items-center justify-end">
            {/* Search Bar */}
            <div className="relative w-32 md:w-48 shrink-0 group">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] md:text-sm group-focus-within:text-solo-red transition-colors"></i>
              <input 
                type="text" 
                placeholder="Cari..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 md:pl-9 pr-7 py-2 bg-white border border-gray-200 rounded-xl text-[10px] md:text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-solo-red/20 focus:border-solo-red shadow-sm transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-solo-red transition-all w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full bg-gray-50 hover:bg-red-50"
                >
                  <i className="fa-solid fa-xmark text-[8px] md:text-[10px]"></i>
                </button>
              )}
            </div>

            <DateRangePicker 
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />  

            {/* Filter Kategori */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                className={`w-[38px] h-[34px] md:w-12 md:h-10 flex items-center justify-center rounded-xl border transition-colors shrink-0 shadow-sm ${
                  isFilterOpen || activeFilter !== 'semua' ? 'bg-red-50 border-red-200 text-solo-red' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <i className="fa-solid fa-sliders text-sm md:text-base"></i>
              </button>
              
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-300/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-400/30 p-2 z-50">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => { setActiveFilter('semua'); setIsFilterOpen(false); }} className={`text-left px-3 py-2 text-xs font-bold rounded-xl transition-all ${activeFilter === 'semua' ? 'bg-solo-red text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200/50'}`}>Semua Kategori</button>
                    <button onClick={() => { setActiveFilter('emas'); setIsFilterOpen(false); }} className={`text-left px-3 py-2 text-xs font-bold rounded-xl transition-all ${activeFilter === 'emas' ? 'bg-solo-red text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200/50'}`}>Medali Emas</button>
                    <button onClick={() => { setActiveFilter('perak'); setIsFilterOpen(false); }} className={`text-left px-3 py-2 text-xs font-bold rounded-xl transition-all ${activeFilter === 'perak' ? 'bg-solo-red text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200/50'}`}>Medali Perak</button>
                    <button onClick={() => { setActiveFilter('perunggu'); setIsFilterOpen(false); }} className={`text-left px-3 py-2 text-xs font-bold rounded-xl transition-all ${activeFilter === 'perunggu' ? 'bg-solo-red text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200/50'}`}>Medali Perunggu</button>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Badges */}
        {(activeFilter !== 'semua' || startDate) && (
          <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
            {/* Date Range Badge */}
            {startDate && (
              <div className="bg-white border border-gray-200 rounded-full px-2.5 md:px-4 py-1 md:py-1.5 flex items-center gap-2 md:gap-3 shadow-sm w-max">
                <i className="fa-solid fa-calendar-check text-blue-500 text-[9px] md:text-xs"></i>
                <span className="text-[9px] md:text-xs font-bold text-gray-600 tracking-tight">
                  {endDate 
                    ? `${format(new Date(startDate), 'd MMM yy', {locale: idLocale})} - ${format(new Date(endDate), 'd MMM yy', {locale: idLocale})}`
                    : format(new Date(startDate), 'd MMM yy', {locale: idLocale})
                  }
                </span>
                <button 
                  onClick={() => { setStartDate(null); setEndDate(null); }}
                  className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-[8px] md:text-[10px]"></i>
                </button>
              </div>
            )}
            {/* Medal Category Badge */}
            {activeFilter !== 'semua' && (
              <div className={`border rounded-full px-2.5 md:px-4 py-1 md:py-1.5 flex items-center gap-2 md:gap-3 shadow-sm w-max ${
                activeFilter === 'emas' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                activeFilter === 'perak' ? 'bg-slate-50 border-slate-200 text-slate-700' :
                'bg-orange-50 border-orange-200 text-orange-700'
              }`}>
                <i className={`fa-solid fa-medal text-[9px] md:text-xs ${
                  activeFilter === 'emas' ? 'text-yellow-500' :
                  activeFilter === 'perak' ? 'text-slate-400' :
                  'text-orange-500'
                }`}></i>
                <span className="text-[9px] md:text-xs font-bold tracking-tight capitalize">
                  Medali {activeFilter}
                </span>
                <button 
                  onClick={() => setActiveFilter('semua')}
                  className={`w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full transition-colors ${
                    activeFilter === 'emas' ? 'bg-yellow-100/50 text-yellow-600 hover:bg-yellow-200' :
                    activeFilter === 'perak' ? 'bg-slate-200/50 text-slate-600 hover:bg-slate-300' :
                    'bg-orange-100/50 text-orange-600 hover:bg-orange-200'
                  }`}
                >
                  <i className="fa-solid fa-xmark text-[8px] md:text-[10px]"></i>
                </button>
              </div>
            )}
          </div>
        )}

        {/* List Riwayat */}
        <div className="space-y-6 md:space-y-8">
          {Object.entries(groupedMedals).map(([month, items]) => (
            <div key={month}>
              <div className="text-[10px] md:text-xs font-extrabold text-gray-500 tracking-widest uppercase mb-2 md:mb-4 ml-1">{month}</div>
              <div className="space-y-3 md:space-y-4">
                {(items as any[]).map((item) => {
                  const cabor = cabors.find(c => c.id === item.caborId);
                  return (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 md:p-4 rounded-lg md:rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 md:gap-5 overflow-hidden">
                        <div className="relative shrink-0">
                          <img alt="Medal" className="h-8 w-8 md:h-12 md:w-12 object-contain drop-shadow-sm" src={getMedalImage(item.medalType)} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm md:text-lg font-bold text-gray-800 truncate">{item.athleteName}</div>
                          <div className="text-xs md:text-sm text-gray-500 truncate">{cabor?.name} - {item.category}</div>
                        </div>
                      </div>
                      <div className="text-[10px] md:text-sm font-bold text-solo-red shrink-0 whitespace-nowrap pl-2">
                        {item.createdAt ? format(safeParseDate(item.createdAt), "dd MMM yyyy", { locale: idLocale }) : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {filteredMedals.length === 0 && (
            <div className="text-center py-10 md:py-16 text-gray-400 text-sm md:text-base font-medium">
              Belum ada medali
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
