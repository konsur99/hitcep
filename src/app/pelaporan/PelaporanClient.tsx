"use client";

import { useState, useEffect } from 'react';
import LoadingUI from '@/components/LoadingUI';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import DateRangePicker from '@/components/DateRangePicker';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function PelaporanClient({ initialReports, cabors }: { initialReports: any[], cabors: any[] }) {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [reports, setReports] = useState<any[]>(initialReports);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthChecking(false);
  }, []);
  // Filtering & Sorting State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCabor, setFilterCabor] = useState('');
  const [filterStartDate, setFilterStartDate] = useState<string | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [isCaborDropdownOpen, setIsCaborDropdownOpen] = useState(false);
  const [caborSearchQuery, setCaborSearchQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const REPORT_CATEGORIES = [
    "Indikasi Kecurangan (Match Fixing)",
    "Kinerja Wasit / Juri",
    "Manipulasi Usia / Status Atlet",
    "Ketidaknetralan Panitia",
    "Protes Hasil Pertandingan",
    "Pelanggaran Tata Tertib",
    "Keterlambatan Jadwal Pertandingan",
    "Kualitas Lapangan / Peralatan",
    "Fasilitas Pertandingan",
    "Intimidasi / Kekerasan Fisik",
    "Keamanan / Keributan Suporter",
    "Pelayanan Medis / P3K",
    "Pelayanan LO / Pendamping",
    "Akomodasi / Penginapan",
    "Konsumsi / Makanan",
    "Kendala Transportasi",
    "Administrasi / Pendaftaran",
    "Masalah Tiket / Akses Masuk",
    "Force Majeure / Cuaca Buruk",
    "Lain-lain"
  ];

  const safeParseDate = (input: any) => {
    if (!input) return new Date();
    if (typeof input.toDate === 'function') return input.toDate();
    if (typeof input === 'object' && input._seconds !== undefined) return new Date(input._seconds * 1000);
    if (typeof input === 'object' && input.seconds !== undefined) return new Date(input.seconds * 1000);
    return new Date(input);
  };

  // Filter & Sort Logic
  const filteredReports = reports.filter(report => {
    let matchCat = true;
    let matchCabor = true;
    let matchSearch = true;
    let matchDate = true;
    
    if (filterCategory) {
      const hasCategory = report.categories?.includes(filterCategory);
      const isCustom = report.customCategory?.toLowerCase().includes(filterCategory.toLowerCase());
      matchCat = hasCategory || isCustom;
    }
    
    if (filterCabor) {
      matchCabor = report.caborName === filterCabor;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchSearch = (
        report.title?.toLowerCase().includes(q) ||
        report.description?.toLowerCase().includes(q) ||
        report.reporterName?.toLowerCase().includes(q) ||
        report.caborName?.toLowerCase().includes(q)
      );
    }

    if (filterStartDate) {
      if (report.createdAt) {
        const d = safeParseDate(report.createdAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const reportDateStr = `${yyyy}-${mm}-${dd}`;
        
        if (filterEndDate) {
          matchDate = reportDateStr >= filterStartDate && reportDateStr <= filterEndDate;
        } else {
          matchDate = reportDateStr === filterStartDate;
        }
      } else {
        matchDate = false;
      }
    }
    
    return matchCat && matchCabor && matchSearch && matchDate;
  }).sort((a, b) => {
    const timeA = a.createdAt ? safeParseDate(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? safeParseDate(b.createdAt).getTime() : 0;
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const filteredCaborsList = cabors.filter(c => c.name.toLowerCase().includes(caborSearchQuery.toLowerCase()));

  const getMicroThumbnail = (url: string) => {
    if (!url) return "";
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      let optimized = url.replace('/upload/', '/upload/c_fill,w_300,q_auto:eco,f_auto/');
      optimized = optimized.replace(/\.[^/.]+$/, '.jpg');
      return optimized;
    }
    return url;
  };

  const getFullImageOptimized = (url: string) => {
    if (!url) return "";
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/c_limit,w_1080,q_auto:good,f_auto/');
    }
    return url;
  };

  return (
    <>
      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full text-white flex items-center justify-center backdrop-blur-md"
            onClick={() => setLightboxImage(null)}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img src={getFullImageOptimized(lightboxImage)} alt="Fullscreen" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      <div className="px-5 mt-6 relative z-20 space-y-4 max-w-4xl mx-auto pb-12">
        {/* Search & Filter Bar */}
        {reports.length > 0 && (
          <div className="relative mb-4 z-30">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari laporan, cabor, pelapor..." 
                  className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 shadow-sm transition-all"
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`w-[38px] h-[34px] flex items-center justify-center rounded-xl border transition-colors shrink-0 shadow-sm ${
                  showFilters || filterCabor || filterCategory ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <i className="fa-solid fa-sliders text-sm"></i>
              </button>
              
              <div className="relative">
                <DateRangePicker 
                  startDate={filterStartDate}
                  endDate={filterEndDate}
                  onStartDateChange={setFilterStartDate}
                  onEndDateChange={setFilterEndDate}
                />
              </div>
            </div>

            {/* Active Filters Badges */}
            {(filterStartDate || filterCabor || filterCategory) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {/* Date Range Badge */}
                {filterStartDate && (
                  <div className="bg-white border border-gray-200 rounded-full px-2.5 py-1 flex items-center gap-2 shadow-sm w-max">
                    <i className="fa-solid fa-calendar-check text-blue-500 text-[9px]"></i>
                    <span className="text-[9px] font-bold text-gray-600 tracking-tight">
                      {filterEndDate 
                        ? `${format(new Date(filterStartDate), 'd MMM yy', {locale: localeId})} - ${format(new Date(filterEndDate), 'd MMM yy', {locale: localeId})}`
                        : format(new Date(filterStartDate), 'd MMM yy', {locale: localeId})
                      }
                    </span>
                    <button 
                      onClick={() => { setFilterStartDate(null); setFilterEndDate(null); }}
                      className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-[8px]"></i>
                    </button>
                  </div>
                )}
                {/* Cabor Badge */}
                {filterCabor && (
                  <div className="bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1 flex items-center gap-2 shadow-sm w-max">
                    <i className="fa-solid fa-dharmachakra text-orange-500 text-[9px]"></i>
                    <span className="text-[9px] font-bold text-orange-700 tracking-tight">
                      {cabors.find(c => c.id === filterCabor)?.name || filterCabor}
                    </span>
                    <button 
                      onClick={() => setFilterCabor('')}
                      className="w-4 h-4 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 hover:text-orange-700 transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-[8px]"></i>
                    </button>
                  </div>
                )}
                {/* Category Badge */}
                {filterCategory && (
                  <div className="bg-purple-50 border border-purple-200 rounded-full px-2.5 py-1 flex items-center gap-2 shadow-sm w-max">
                    <i className="fa-solid fa-tag text-purple-500 text-[9px]"></i>
                    <span className="text-[9px] font-bold text-purple-700 tracking-tight">
                      {filterCategory}
                    </span>
                    <button 
                      onClick={() => setFilterCategory('')}
                      className="w-4 h-4 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 hover:text-purple-700 transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-[8px]"></i>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Filter Dropdown */}
            {showFilters && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-[180px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
                  <h3 className="text-[9px] font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                    Filter
                    {(filterCabor || filterCategory) && (
                      <button onClick={() => { setFilterCabor(''); setFilterCategory(''); setSortOrder('desc'); }} className="text-blue-500 hover:underline capitalize normal-case text-[9px]">Reset</button>
                    )}
                  </h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-700 mb-0.5 ml-1">Cabang Olahraga</label>
                      <div className="relative">
                        <div 
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-semibold text-gray-700 cursor-pointer flex justify-between items-center"
                          onClick={() => { setIsCaborDropdownOpen(!isCaborDropdownOpen); setIsCategoryDropdownOpen(false); }}
                        >
                          <span className="truncate flex-1 text-left">{filterCabor || 'Semua Cabor'}</span>
                          <i className="fa-solid fa-chevron-down text-[8px] text-gray-400 ml-1 shrink-0"></i>
                        </div>
                        {isCaborDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg z-[60] overflow-hidden">
                            <div className="p-1 border-b border-gray-100 bg-gray-50 sticky top-0">
                              <input 
                                type="text" 
                                placeholder="Cari Cabor..." 
                                className="w-full px-1.5 py-1 bg-white border border-gray-200 rounded text-[9px] font-medium outline-none focus:border-blue-500"
                                value={caborSearchQuery}
                                onChange={(e) => setCaborSearchQuery(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <ul className="max-h-[120px] overflow-y-auto">
                              <li 
                                className="px-2 py-1.5 text-[9px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer border-b border-gray-50 truncate"
                                onClick={() => { setFilterCabor(''); setIsCaborDropdownOpen(false); }}
                              >
                                Semua Cabor
                              </li>
                              {filteredCaborsList.map((c: any) => (
                                <li 
                                  key={c.id}
                                  className="px-2 py-1.5 text-[9px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer truncate"
                                  onClick={() => { setFilterCabor(c.name); setIsCaborDropdownOpen(false); }}
                                >
                                  {c.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-700 mb-0.5 ml-1">Kategori Laporan</label>
                      <div className="relative">
                        <div 
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-semibold text-gray-700 cursor-pointer flex justify-between items-center"
                          onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsCaborDropdownOpen(false); }}
                        >
                          <span className="truncate flex-1 text-left">{filterCategory || 'Semua Kategori'}</span>
                          <i className="fa-solid fa-chevron-down text-[8px] text-gray-400 ml-1 shrink-0"></i>
                        </div>
                        {isCategoryDropdownOpen && (
                          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            <button 
                              onClick={() => { setFilterCategory(''); setIsCategoryDropdownOpen(false); }}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                            >
                              Semua Kategori
                            </button>
                            {REPORT_CATEGORIES.map(cat => (
                              <button 
                                key={cat}
                                onClick={() => { setFilterCategory(cat); setIsCategoryDropdownOpen(false); }}
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-blue-50 transition-colors"
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-700 mb-0.5 ml-1">Urutan Waktu</label>
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                          onClick={() => setSortOrder('desc')}
                          className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${sortOrder === 'desc' ? 'bg-white text-blue-600 shadow-sm scale-[1.02]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Terbaru
                        </button>
                        <button 
                          onClick={() => setSortOrder('asc')}
                          className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${sortOrder === 'asc' ? 'bg-white text-blue-600 shadow-sm scale-[1.02]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Terlama
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {isAuthChecking ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingUI text="Memeriksa Akses Keamanan..." />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <i className="fa-regular fa-comment-dots text-2xl text-gray-300"></i>
            </div>
            <h3 className="text-gray-900 font-bold mb-1">Belum Ada Laporan</h3>
            <p className="text-[11px] text-gray-500">Tidak ada data yang sesuai filter saat ini.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-200 ml-3 mt-4 space-y-4 pb-4">
            {filteredReports.map((report, index, array) => {
              const reportDate = report.createdAt ? safeParseDate(report.createdAt) : null;
              const monthYear = reportDate ? reportDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Tidak Diketahui';
              
              const prevReportDate = index > 0 && array[index - 1].createdAt ? safeParseDate(array[index - 1].createdAt) : null;
              const prevMonthYear = prevReportDate ? prevReportDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Tidak Diketahui';
              
              const showMonthDivider = monthYear !== prevMonthYear;

              return (
                <div key={report.id}>
                  {showMonthDivider && (
                    <div className={`relative flex items-center mb-5 ${index === 0 ? 'mt-0' : 'mt-8'}`}>
                      <div className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-gray-300 ring-4 ring-[#F9FAFB]"></div>
                      <div className="ml-4 bg-white border border-gray-200 text-gray-500 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest shadow-sm">
                        {monthYear}
                      </div>
                    </div>
                  )}
                  <div className="relative pl-5">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[9px] top-3 w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center ring-4 ring-[#F9FAFB]">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gray-200">
                  <div 
                    className="p-3 cursor-pointer hover:bg-gray-50/80 transition-colors"
                    onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                  >
                    <div className="flex items-stretch justify-between gap-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1">
                          <h3 className="font-extrabold text-gray-900 text-xs line-clamp-1">{report.title}</h3>
                        </div>
                        <p className="text-gray-600 text-[10px] font-medium line-clamp-2 leading-relaxed">
                          {report.description}
                        </p>
                        <div className="flex flex-wrap items-center mt-2 gap-1.5">
                          <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-100 flex items-center gap-1">
                            <i className="fa-solid fa-tag text-[8px]"></i>
                            {report.caborName || 'Umum'}
                          </span>
                          {report.reporterRole && (
                            <span className="bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-200">
                              {report.reporterRole}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] font-bold text-gray-400 mb-2">
                          {report.createdAt ? safeParseDate(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                        <div className={`w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center transition-transform duration-300 my-auto ${expandedId === report.id ? 'rotate-180 bg-blue-50 text-blue-500 border-blue-100' : 'text-gray-400'}`}>
                          <i className="fa-solid fa-chevron-down text-[10px]"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expandable Details */}
                  <div className={`transition-all duration-300 ease-in-out origin-top ${expandedId === report.id ? 'max-h-[1000px] opacity-100 border-t border-gray-50' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-4 bg-gray-50/30 space-y-4">
                  {/* Detailed Info Grid */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[10px] bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                    <div>
                      <span className="flex items-center gap-1.5 text-gray-400 font-bold mb-0.5"><i className="fa-regular fa-user"></i> Pelapor</span>
                      <span className="text-gray-900 font-semibold">{report.reporterName || '-'}</span>
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 text-gray-400 font-bold mb-0.5"><i className="fa-solid fa-trophy"></i> Cabang Olahraga</span>
                      <span className="text-gray-900 font-semibold">{report.caborName || 'Umum'}</span>
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 text-gray-400 font-bold mb-0.5"><i className="fa-solid fa-map-pin"></i> Lokasi</span>
                      <span className="text-gray-900 font-semibold">{report.location || '-'}</span>
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 text-gray-400 font-bold mb-0.5"><i className="fa-regular fa-clock"></i> Waktu Kejadian</span>
                      <span className="text-gray-900 font-semibold">
                        {report.incidentTime 
                          ? new Date(report.incidentTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : (report.createdAt ? new Date(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
                        }
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-gray-50 mt-1">
                      <span className="flex items-center gap-1.5 text-gray-400 font-bold mb-0.5"><i className="fa-solid fa-location-crosshairs"></i> Detail Lokasi</span>
                      <span className="text-gray-900 font-semibold leading-relaxed block">{report.specificLocation || '-'}</span>
                    </div>
                  </div>

                  {/* Categories */}
                  {report.categories && report.categories.length > 0 && (
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                      <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mb-2"><i className="fa-solid fa-tags"></i> Kategori Pelanggaran</span>
                      <div className="flex flex-wrap gap-1.5">
                        {report.categories.map((cat: string) => (
                          <span key={cat} className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-[9px] font-bold border border-red-100/50">
                            {cat === 'Lain-lain' && report.customCategory ? `Lainnya: ${report.customCategory}` : cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Description */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                    <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mb-2"><i className="fa-solid fa-align-left"></i> Deskripsi Lengkap</span>
                    <div className="text-gray-800 text-[10px] leading-relaxed font-medium">
                      {report.description}
                    </div>
                  </div>

                  {report.imageUrl && (
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                      <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold mb-2"><i className="fa-regular fa-image"></i> Lampiran Bukti</span>
                      <div 
                        className="rounded-lg overflow-hidden border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform group relative bg-gray-50/50"
                        onClick={(e) => { e.stopPropagation(); setLightboxImage(report.imageUrl); }}
                      >
                        <img src={getMicroThumbnail(report.imageUrl)} alt="Lampiran Bukti" loading="lazy" className="w-full h-40 object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                          <i className="fa-solid fa-expand text-white opacity-0 group-hover:opacity-100 drop-shadow-md text-xl"></i>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
            </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
