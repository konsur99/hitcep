"use client";

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [systemFrozen, setSystemFrozen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let unsubscribeSession: () => void;
    let unsubscribeUser: () => void;
    let unsubscribeSystem: () => void;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Dapatkan role pengguna saat ini
        const userRef = doc(db, "users", user.uid);
        unsubscribeUser = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            setCurrentUserRole(userSnap.data().role);
          }
        }, (error) => {
          if (error.code !== "permission-denied") console.error("SessionGuard user snapshot error:", error);
        });

        // 2. Dengarkan status Freeze & Force Refresh dari sistem
        const systemRef = doc(db, "settings", "system");
        unsubscribeSystem = onSnapshot(systemRef, (sysSnap) => {
          if (sysSnap.exists()) {
            const sysData = sysSnap.data();
            // Handle Freeze
            if (sysData.isFrozen) {
              setSystemFrozen(true);
            } else {
              setSystemFrozen(false);
            }
            
            // Handle Force Refresh
            if (sysData.forceRefresh) {
              const lastRefresh = localStorage.getItem('lastForceRefresh');
              if (!lastRefresh || parseInt(lastRefresh) < sysData.forceRefresh) {
                localStorage.setItem('lastForceRefresh', sysData.forceRefresh.toString());
                window.location.reload();
              }
            }
          }
        }, (error) => {
          if (error.code !== "permission-denied") console.error("SessionGuard system snapshot error:", error);
        });

        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
          const sessionRef = doc(db, "users", user.uid, "sessions", sessionId);
          
          // Listen to this specific session document for remote kills
          unsubscribeSession = onSnapshot(sessionRef, (docSnap) => {
            if (!docSnap.exists()) {
              // Session was deleted (e.g. killed from developer dashboard)
              localStorage.removeItem('sessionId');
              signOut(auth);
              window.location.reload();
            }
          }, (error) => {
            if (error.code !== "permission-denied") console.error("SessionGuard session snapshot error:", error);
          });
        }
      } else {
        if (unsubscribeSystem) unsubscribeSystem();
        if (unsubscribeSession) unsubscribeSession();
        if (unsubscribeUser) unsubscribeUser();
      }
      setIsReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSystem) unsubscribeSystem();
      if (unsubscribeSession) unsubscribeSession();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);


  // Role-Based Route Protection
  useEffect(() => {
    if (!isReady) return;
    
    // Public routes that anyone can access without logging in
    const publicRoutes = ['/', '/medali', '/cabor', '/riwayat', '/statistik', '/bantuan', '/profil'];
    const isPublic = publicRoutes.includes(pathname) || pathname.startsWith('/cabor/');

    if (!currentUserRole) {
      if (!isPublic) {
        router.replace('/profil');
      }
      return;
    }

    if (currentUserRole === 'Developer') {
      return; // God mode, can access everything
    }

    if (currentUserRole === 'Admin') {
      const adminRoutes = ['/validasi', '/validasi-pelaporan', '/pengaturan', '/input-medali', '/input-pelaporan', '/developer'];
      // Note: We might want to block /developer for Admin. Let's block it.
      const allowedForAdmin = ['/validasi', '/validasi-pelaporan', '/pengaturan', '/input-medali', '/input-pelaporan', '/pelaporan'];
      if (!isPublic && !allowedForAdmin.includes(pathname)) {
        router.replace('/');
      }
      return;
    }

    if (currentUserRole === 'Cabor') {
      const allowedForCabor = ['/input-medali', '/input-pelaporan'];
      if (!isPublic && !allowedForCabor.includes(pathname)) {
        router.replace('/');
      }
      return;
    }
  }, [pathname, currentUserRole, isReady, router]);

  return (
    <>
      {/* Layar Kunci Freeze System */}
      {systemFrozen && currentUserRole !== 'Developer' && (
        <div className="fixed inset-0 z-[99999] bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 animate-[pulse_3s_ease-in-out_infinite]">
            <i className="fa-solid fa-snowflake text-5xl text-blue-400"></i>
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">SISTEM DIBEKUKAN</h2>
          <p className="text-blue-200 mb-8 max-w-sm text-sm font-medium leading-relaxed bg-blue-900/30 p-4 rounded-xl border border-blue-500/30">
            Aplikasi sedang dalam tahap <strong>Pemeliharaan Darurat</strong> oleh Tim Pengembang. <br/><br/>
            Harap tunggu beberapa saat hingga sistem kembali beroperasi normal.
          </p>
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>
            ))}
          </div>
        </div>
      )}


      {children}
    </>
  );
}
