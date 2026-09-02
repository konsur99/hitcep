'use client';

import { useState, useEffect } from 'react';

interface AnimatedBarChartProps {
  emas: number;
  perak: number;
  perunggu: number;
}

export default function AnimatedBarChart({ emas, perak, perunggu }: AnimatedBarChartProps) {
  const [mounted, setMounted] = useState(false);
  const [displayEmas, setDisplayEmas] = useState(0);
  const [displayPerak, setDisplayPerak] = useState(0);
  const [displayPerunggu, setDisplayPerunggu] = useState(0);

  const total = emas + perak + perunggu;
  
  // Percentages relative to total (like in Statistik page)
  const emasPct = emas / (total || 1);
  const perakPct = perak / (total || 1);
  const perungguPct = perunggu / (total || 1);

  useEffect(() => {
    setMounted(true);
    
    // Animate numbers
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      
      setDisplayEmas(Math.round(emas * ease));
      setDisplayPerak(Math.round(perak * ease));
      setDisplayPerunggu(Math.round(perunggu * ease));
      
      if (step >= steps) {
        clearInterval(timer);
        setDisplayEmas(emas);
        setDisplayPerak(perak);
        setDisplayPerunggu(perunggu);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [emas, perak, perunggu]);

  return (
    <section className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-card border border-gray-100 flex flex-col h-fit" data-purpose="beranda-bar-chart">
      <div className="flex justify-between items-center mb-3 md:mb-5">
        <h3 className="font-bold text-gray-800 text-sm md:text-base">PERBANDINGAN MEDALI</h3>
      </div>

      <div className="flex h-56 md:h-80 w-full items-end pb-0 mb-8 md:mb-12 mt-4 md:mt-8">
        
        {/* Y-Axis Column */}
        <div className="h-full w-10 md:w-14 relative flex-shrink-0 border-r border-gray-200 z-10">
          <span className="absolute top-0 right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">100%</span>
          <span className="absolute top-[25%] right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">75%</span>
          <span className="absolute top-[50%] right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">50%</span>
          <span className="absolute top-[75%] right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">25%</span>
          <span className="absolute top-[100%] right-2 transform -translate-y-1/2 text-[10px] md:text-xs text-gray-400">0%</span>
        </div>

        {/* Chart Area */}
        <div className="relative flex-1 h-full border-b border-gray-200 flex justify-around items-end ml-1 md:ml-2">
          
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
  );
}
