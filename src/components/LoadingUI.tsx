import React from 'react';

export default function LoadingUI({ text = "Memproses..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Cool Dual-Ring Animation with KONI Colors */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6">
        {/* Outer Ring - Red */}
        <div className="absolute inset-0 rounded-full border-[4px] sm:border-[6px] border-solo-red/20 border-t-solo-red animate-[spin_1.5s_linear_infinite]"></div>
        
        {/* Inner Ring - Blue */}
        <div className="absolute inset-3 sm:inset-4 rounded-full border-[4px] sm:border-[6px] border-blue-500/20 border-b-blue-500 animate-[spin_2s_linear_infinite_reverse]"></div>
        
        {/* Center Pulse */}
        <div className="absolute inset-7 sm:inset-9 bg-gradient-to-tr from-solo-red to-blue-500 rounded-full animate-pulse shadow-lg shadow-solo-red/30"></div>
      </div>
      
      {/* Loading Text */}
      <div className="flex flex-col items-center text-center">
        <h3 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-solo-red to-blue-600 animate-pulse">
          {text}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium tracking-wide">
          Mohon tunggu sebentar...
        </p>
      </div>
    </div>
  );
}
