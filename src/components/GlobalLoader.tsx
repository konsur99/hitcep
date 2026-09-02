"use client";

import React, { createContext, useContext, useState } from 'react';
import LoadingUI from './LoadingUI';

interface GlobalLoaderContextType {
  showLoading: (text?: string) => void;
  hideLoading: () => void;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextType>({
  showLoading: () => {},
  hideLoading: () => {},
});

export const useGlobalLoader = () => useContext(GlobalLoaderContext);

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Memproses...");

  const showLoading = (text?: string) => {
    setLoadingText(text || "Memproses...");
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <GlobalLoaderContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      
      {isLoading && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white/95 p-8 rounded-3xl shadow-2xl border border-gray-100 transform transition-all">
            <LoadingUI text={loadingText} />
          </div>
        </div>
      )}
    </GlobalLoaderContext.Provider>
  );
}
