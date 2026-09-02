"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<(value: boolean) => void>();

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) resolver(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleCancel}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${options.danger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                <i className={`fa-solid ${options.danger ? 'fa-triangle-exclamation' : 'fa-circle-question'} text-xl`}></i>
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">{options.title || 'Konfirmasi'}</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">{options.message}</p>
            </div>
            <div className="bg-gray-50/80 px-6 py-4 flex gap-3 border-t border-gray-100">
              <button 
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {options.cancelText || 'Batal'}
              </button>
              <button 
                onClick={handleConfirm}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all ${
                  options.danger 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {options.confirmText || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmProvider');
  }
  return context;
}
