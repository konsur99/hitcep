"use client";

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import LoadingUI from '@/components/LoadingUI';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getOptimizedUrl } from '@/lib/cloudinary';

export default function CaborDetailClient({ id, initialCabor, initialAthletes }: { id: string, initialCabor: any, initialAthletes: any[] }) {
  const [cabor, setCabor] = useState<any>(initialCabor);
  const [athletes, setAthletes] = useState<any[]>(initialAthletes);


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
      return formatDistanceToNow(date, { addSuffix: true, locale: idLocale });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="pb-6">
       {/* Header */}
       <section className="relative overflow-hidden pt-8 pb-20 px-5 md:px-8 text-white rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-lg bg-gradient-to-r from-[#960309] via-[#520111] to-[#67030B] mx-auto">
          <div className="absolute inset-0 bg-black/10"></div>
          
          <div className="relative z-10 flex flex-col gap-6 w-full">
            {/* Top Navigation Row */}
            <div className="flex items-center gap-3">
              <Link href="/cabor" className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all border border-white/10">
                <i className="fa-solid fa-arrow-left text-sm"></i>
              </Link>
              <h2 className="text-sm md:text-base font-bold tracking-widest uppercase text-white/80">Profil Olahraga</h2>
            </div>
            
            {/* Cabor Identity */}
            <div className="flex items-center gap-5 md:gap-8">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl scale-150"></div>
                <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center p-4 md:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)] shrink-0 border-[3px] border-white/40">
                 <img src={(cabor.image || `/cabor/${({'akuatik':'renang','balap-motor':'bermotor','billiar':'biliar','biliard':'biliar','bola-basket':'basket','bola-volly':'bola-voli','bulu-tangkis':'badminton','dansa':'dansa-sport','dance-sport':'dansa-sport','drum-band':'drumband','esport':'esports','gantole':'gantolle','gimnastik':'senam','kickboxing':'kick-boxing','pencaksilat':'pencak-silat','sepak-bola':'sepakbola','softball-baseball':'softball-dan-baseball','soft-ball':'softball-dan-baseball','shorinji-kempo':'kempo','tinju-amatir':'tinju'} as Record<string, string>)[cabor.id as string] || cabor.id}.webp`).replace('.png', '.webp')} alt={cabor.name} className="w-full h-full object-contain drop-shadow-md" />
                </div>
              </div>
              <div>
                 <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-3 md:mb-4 leading-none tracking-tight drop-shadow-sm">{cabor.name}</h1>
                 <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold text-solo-gold border border-white/20 shadow-inner">
                    <i className="fa-solid fa-trophy"></i> {(cabor.gold || 0) + (cabor.silver || 0) + (cabor.bronze || 0)} Total Medali Diperoleh
                 </div>
              </div>
            </div>
          </div>
       </section>

       <main className="px-5 md:px-8 -mt-10 relative z-20 space-y-10">
          {/* Tally */}
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
              <img src="/medal-gold.webp" alt="Emas" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" />
              <span className="text-xs md:text-sm font-bold text-solo-gold mb-1 md:mb-2">EMAS</span>
              <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{cabor.gold || 0}</span>
            </div>
            <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
              <img src="/medal-silver.webp" alt="Perak" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" />
              <span className="text-xs md:text-sm font-bold text-gray-500 mb-1 md:mb-2">PERAK</span>
              <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{cabor.silver || 0}</span>
            </div>
            <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center justify-start shadow-card border border-gray-100">
              <img src="/medal-bronze.webp" alt="Perunggu" className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md" />
              <span className="text-xs md:text-sm font-bold text-amber-700 mb-1 md:mb-2">PERUNGGU</span>
              <span className="text-3xl md:text-5xl font-extrabold text-gray-800">{cabor.bronze || 0}</span>
            </div>
          </div>

          {/* Athletes List */}
          <section className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-sm">ATLET PERAIH MEDALI</h3>
              <span className="text-xs font-bold text-solo-red bg-red-50 px-2 py-0.5 rounded border border-red-100">{athletes.length} Atlet</span>
            </div>
            
            {athletes.length > 0 ? (
               <div className="space-y-3">
                 {athletes.map(atlet => (
                   <div key={atlet.id} className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100 shadow-sm">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-[3px] border-white shadow-sm flex-shrink-0">
                           <img src={getOptimizedUrl(atlet.portraitUrl, 100) || "/portrait-dummy.webp"} alt={atlet.athleteName} loading="lazy" className="w-full h-full object-cover bg-gray-200" />
                        </div>
                        <div className="min-w-0">
                           <div className="font-extrabold text-gray-800 text-sm truncate">{atlet.athleteName}</div>
                           <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5 truncate">{atlet.category}</div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-1 shrink-0">
                        {atlet.medalType === 'emas' && <img src="/medal-gold.webp" alt="Emas" className="w-6 h-6 object-contain drop-shadow-sm" />}
                        {atlet.medalType === 'perak' && <img src="/medal-silver.webp" alt="Perak" className="w-6 h-6 object-contain drop-shadow-sm" />}
                        {atlet.medalType === 'perunggu' && <img src="/medal-bronze.webp" alt="Perunggu" className="w-6 h-6 object-contain drop-shadow-sm" />}
                        <span className="text-[9px] font-bold text-gray-400 mt-1"><i className="fa-regular fa-calendar-check mr-0.5"></i> {atlet.date}</span>
                     </div>
                   </div>
                 ))}
               </div>
            ) : (
               <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm text-gray-300 text-xl border border-gray-100">
                    <i className="fa-solid fa-users-slash"></i>
                  </div>
                  <p className="text-gray-500 text-xs font-semibold">Belum ada data atlet untuk cabang olahraga ini.</p>
               </div>
            )}
          </section>

          {/* Gallery */}
          <section className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm mb-4">GALERI PENYERAHAN MEDALI</h3>
            {athletes.filter(a => a.ceremonyUrl).length > 0 ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                 {athletes.filter(a => a.ceremonyUrl).map((atlet, idx) => (
                    <div key={idx} className="aspect-[4/3] rounded-xl overflow-hidden relative group shadow-sm border border-gray-200 bg-gray-100 flex items-center justify-center">
                       <img src={getOptimizedUrl(atlet.ceremonyUrl, 400)} alt={`Galeri ${atlet.athleteName}`} loading="lazy" className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-90 transition-opacity flex flex-col justify-end p-2 md:p-3 pointer-events-none">
                          <span className="text-white text-[10px] md:text-xs font-bold leading-tight line-clamp-2">{atlet.athleteName}</span>
                          <span className="text-solo-gold text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest mt-0.5 line-clamp-1">{atlet.category}</span>
                       </div>
                    </div>
                 ))}
               </div>
            ) : (
               <div className="text-center py-6 text-gray-400 text-xs font-medium">
                  Belum ada galeri foto yang diunggah.
               </div>
            )}
          </section>
       </main>
    </div>
  );
}
