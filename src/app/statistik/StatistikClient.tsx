"use client";

import { useEffect, useState } from 'react';

export default function StatistikClient({ emas, perak, perunggu }: { emas: number, perak: number, perunggu: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { 
    // Small delay ensures the browser paints initial 0% state before applying the final height
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const total = emas + perak + perunggu;
  
  // Use real data, no dummy fallback
  const displayTotal = total;
  const displayEmas = emas;
  const displayPerak = perak;
  const displayPerunggu = perunggu;

  const emasPct = total > 0 ? displayEmas / displayTotal : 0;
  const perakPct = total > 0 ? displayPerak / displayTotal : 0;
  const perungguPct = total > 0 ? displayPerunggu / displayTotal : 0;

  // SVG Pie Chart calculations (Circle circumference = 2 * Math.PI * r = ~314)
  const circumference = 314.159;
  const emasDash = emasPct * circumference;
  const perakDash = perakPct * circumference;
  const perungguDash = perungguPct * circumference;

  const perakOffset = -emasDash;
  const perungguOffset = -(emasDash + perakDash);

  // Colors
  const GOLD = "#FFD700";
  const SILVER = "#C0C0C0";
  const BRONZE = "#CD7F32";

  return (
    <div className="bg-gray-50 text-gray-800 font-sans min-h-screen overflow-x-hidden pb-32">
      
      {/* Header Banner */}
      <section 
        className="relative overflow-hidden pt-6 md:pt-12 lg:pt-16 pb-12 md:pb-20 lg:pb-24 text-white rounded-b-3xl md:rounded-b-[4rem] shadow-md bg-gradient-to-r from-[#960309] via-[#520111] to-[#67030B]"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 xl:px-12 flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-8">
          <div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-2 md:mb-4 tracking-tight">Statistik <span className="text-solo-gold">Quik</span>KONI</h2>
            <p className="text-sm md:text-base lg:text-lg text-gray-200 leading-relaxed max-w-[280px] md:max-w-md">Analisis persebaran perolehan medali secara detail dengan representasi grafik proporsional.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col items-center py-8 md:py-16 px-4 md:px-12 xl:px-24 gap-12 md:gap-20 w-full max-w-7xl mx-auto">

      {/* BEGIN: PIE CHART */}
      <section className="w-full max-w-5xl bg-white rounded-2xl md:rounded-3xl p-5 md:p-12 shadow-card relative overflow-hidden border border-gray-100">
        <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-6 md:mb-8 flex items-center gap-3">
          <div className="w-2 md:w-3 h-6 md:h-8 bg-blue-500 rounded-full"></div>
          Persebaran Medali (Pie Chart)
        </h2>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-8 lg:gap-12 w-full">
          
          {/* Chart Graphic */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 shrink-0 mx-auto md:mx-0">
            {/* Base Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="15" />
              
              {/* Emas */}
              <circle cx="60" cy="60" r="50" fill="none" stroke={GOLD} strokeWidth="15" 
                strokeDasharray={`${mounted ? emasDash : 0} ${circumference}`} strokeDashoffset="0" className="transition-all duration-1000 ease-out" />
              
              {/* Perak */}
              <circle cx="60" cy="60" r="50" fill="none" stroke={SILVER} strokeWidth="15" 
                strokeDasharray={`${mounted ? perakDash : 0} ${circumference}`} strokeDashoffset={perakOffset} className="transition-all duration-1000 ease-out" />
              
              {/* Perunggu */}
              <circle cx="60" cy="60" r="50" fill="none" stroke={BRONZE} strokeWidth="15" 
                strokeDasharray={`${mounted ? perungguDash : 0} ${circumference}`} strokeDashoffset={perungguOffset} className="transition-all duration-1000 ease-out" />
            </svg>

            {/* Inner Total text */}
            <div className="absolute inset-0 flex flex-col justify-center items-center">
              <span className="text-3xl md:text-5xl font-black text-gray-800">{displayTotal}</span>
              <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-0 md:mt-1 font-bold">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-3 md:gap-6 w-full md:max-w-[20rem] lg:max-w-sm">
            <div className="flex items-center justify-between bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.5)]"></div>
                <div>
                  <h3 className="font-bold text-[#FFD700] uppercase text-xs md:text-base">Emas</h3>
                  <p className="text-[10px] md:text-xs text-gray-500">Juara Pertama</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg md:text-2xl font-bold text-gray-800">{displayEmas}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-semibold">{Math.round(emasPct * 100)}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#C0C0C0] shadow-[0_0_15px_rgba(192,192,192,0.5)]"></div>
                <div>
                  <h3 className="font-bold text-[#C0C0C0] uppercase text-xs md:text-base">Perak</h3>
                  <p className="text-[10px] md:text-xs text-gray-500">Juara Kedua</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg md:text-2xl font-bold text-gray-800">{displayPerak}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-semibold">{Math.round(perakPct * 100)}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#CD7F32] shadow-[0_0_15px_rgba(205,127,50,0.5)]"></div>
                <div>
                  <h3 className="font-bold text-[#CD7F32] uppercase text-xs md:text-base">Perunggu</h3>
                  <p className="text-[10px] md:text-xs text-gray-500">Juara Ketiga</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg md:text-2xl font-bold text-gray-800">{displayPerunggu}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-semibold">{Math.round(perungguPct * 100)}%</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* BEGIN: BAR CHART */}
      <section className="w-full max-w-5xl bg-white rounded-2xl md:rounded-3xl p-5 md:p-12 shadow-card relative overflow-hidden border border-gray-100">
        <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-8 md:mb-12 flex items-center gap-3">
          <div className="w-2 md:w-3 h-6 md:h-8 bg-green-500 rounded-full"></div>
          Perbandingan Medali (Bar Chart)
        </h2>

        <div className="flex h-56 md:h-80 w-full items-end pb-0 mb-8 md:mb-12">
          
          {/* Y-Axis Column */}
          <div className="h-full w-8 md:w-10 relative flex-shrink-0 border-r border-gray-200 z-10">
            <span className="absolute top-0 right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">100%</span>
            <span className="absolute top-[25%] right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">75%</span>
            <span className="absolute top-[50%] right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">50%</span>
            <span className="absolute top-[75%] right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">25%</span>
            <span className="absolute top-[100%] right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">0%</span>
          </div>

          {/* Chart Area */}
          <div className="relative flex-1 h-full border-b border-gray-200 flex justify-around items-end">
            
            {/* Dashed lines background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
              <div className="absolute top-0 left-0 w-full border-t border-dashed border-gray-200"></div>
              <div className="absolute top-[25%] left-0 w-full border-t border-dashed border-gray-200"></div>
              <div className="absolute top-[50%] left-0 w-full border-t border-dashed border-gray-200"></div>
              <div className="absolute top-[75%] left-0 w-full border-t border-dashed border-gray-200"></div>
            </div>

            {/* Bar Emas */}
            <div className="relative z-10 flex flex-col items-center justify-end w-10 md:w-24 h-full">
              <div 
                className="w-full relative bg-gradient-to-t from-[#B8860B] to-[#FFD700] rounded-t-sm md:rounded-t-lg transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(255,215,0,0.4)]" 
                style={{ height: mounted ? `${emasPct * 100}%` : '0%' }}>
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-[10px] md:text-sm font-bold text-[#FFD700] whitespace-nowrap transition-opacity duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                  {displayEmas} <span className="hidden md:inline">Medali</span>
                </div>
              </div>
              <div className="absolute -bottom-6 md:-bottom-8 font-semibold text-[#FFD700] text-[10px] md:text-sm uppercase tracking-wider">Emas</div>
            </div>

            {/* Bar Perak */}
            <div className="relative z-10 flex flex-col items-center justify-end w-10 md:w-24 h-full">
              <div 
                className="w-full relative bg-gradient-to-t from-[#808080] to-[#C0C0C0] rounded-t-sm md:rounded-t-lg transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(192,192,192,0.4)]" 
                style={{ height: mounted ? `${perakPct * 100}%` : '0%' }}>
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-[10px] md:text-sm font-bold text-[#C0C0C0] whitespace-nowrap transition-opacity duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                  {displayPerak} <span className="hidden md:inline">Medali</span>
                </div>
              </div>
              <div className="absolute -bottom-6 md:-bottom-8 font-semibold text-[#C0C0C0] text-[10px] md:text-sm uppercase tracking-wider">Perak</div>
            </div>

            {/* Bar Perunggu */}
            <div className="relative z-10 flex flex-col items-center justify-end w-10 md:w-24 h-full">
              <div 
                className="w-full relative bg-gradient-to-t from-[#8B4513] to-[#CD7F32] rounded-t-sm md:rounded-t-lg transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(205,127,50,0.4)]" 
                style={{ height: mounted ? `${perungguPct * 100}%` : '0%' }}>
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-[10px] md:text-sm font-bold text-[#CD7F32] whitespace-nowrap transition-opacity duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                  {displayPerunggu} <span className="hidden md:inline">Medali</span>
                </div>
              </div>
              <div className="absolute -bottom-6 md:-bottom-8 font-semibold text-[#CD7F32] text-[10px] md:text-sm uppercase tracking-wider">Perunggu</div>
            </div>
          </div>
        </div>
      </section>

      </div>
    </div>
  );
}
