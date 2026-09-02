"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [cabors, setCabors] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTime, setLastReadTime] = useState<number>(0);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) setRole(savedRole);
    
    const unsub = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        const d = await getDoc(doc(db, 'users', user.uid));
        if (d.exists()) {
          const fetchedRole = d.data().role;
          setRole(fetchedRole);
          localStorage.setItem('userRole', fetchedRole);
        }
      } else {
        setRole(null);
        localStorage.removeItem('userRole');
      }
    });
    return () => unsub();
  }, []);

  // Load last read time from local storage on mount
  useEffect(() => {
    const savedTime = localStorage.getItem('lastNotifReadTime');
    if (savedTime) {
      setLastReadTime(parseInt(savedTime, 10));
    } else {
      // If no saved time, just set to now so old medals don't show as unread
      const now = Date.now();
      setLastReadTime(now);
      localStorage.setItem('lastNotifReadTime', now.toString());
    }
  }, []);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const res = await fetch('/api/public_cache', { next: { revalidate: 60 } });
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.cabors) setCabors(data.cabors);
        
        if (data.medals) {
          // Sort descending by createdAt
          const sortedMedals = data.medals.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 20);
          setNotifications(sortedMedals);
          
          const savedTime = localStorage.getItem('lastNotifReadTime');
          const timeToCompare = savedTime ? parseInt(savedTime, 10) : 0;
          
          let unread = 0;
          sortedMedals.forEach((notif: any) => {
            const notifTime = notif.createdAt || 0;
            if (notifTime > timeToCompare) {
              unread++;
            }
          });
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    let currentVersion = 0;

    fetchPublicData();
    
    // Poll version every 30 seconds to check for updates
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/version', { next: { revalidate: 30 } });
        if (res.ok) {
          const { version } = await res.json();
          if (currentVersion === 0) {
            currentVersion = version;
          } else if (version > currentVersion) {
            // Data has changed! Refresh the page payload.
            currentVersion = version;
            fetchPublicData();
            router.refresh();
          }
        }
      } catch (e) {
        // Ignore network errors
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const handleOpenNotif = () => {
    const newState = !isNotifOpen;
    setIsNotifOpen(newState);
    
    if (newState) {
      // When opening, reset unread count and update last read time
      setUnreadCount(0);
      const now = Date.now();
      setLastReadTime(now);
      localStorage.setItem('lastNotifReadTime', now.toString());
    }
  };

  const markAllRead = () => {
    setUnreadCount(0);
    const now = Date.now();
    setLastReadTime(now);
    localStorage.setItem('lastNotifReadTime', now.toString());
  };

  const formatTime = (input: any) => {
    if (!input) return 'Baru saja';
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
      if (isNaN(date.getTime())) return 'Baru saja';
      return formatDistanceToNow(date, { addSuffix: true, locale: idLocale });
    } catch (e) {
      return 'Baru saja';
    }
  };

  const navItems = [
    { name: 'Beranda', path: '/' },
    { name: 'Cabor', path: '/cabor' },
    { name: 'Medali', path: '/medali' },
    { name: 'Statistik', path: '/statistik' },
    ...(role === 'Developer' || role === 'Admin' ? [{ name: 'Pelaporan', path: '/pelaporan' }] : []),
    { name: 'Profil', path: '/profil' },
  ];

  return (
    <>
      <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div className="relative w-full max-w-[1920px] mx-auto flex justify-between items-center px-4 md:px-8 xl:px-12 py-3 md:py-4">
        {/* Left Side: Logo */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-2 lg:gap-3 shrink-0 z-10">
          <Image 
            src="/logo-koni.webp" 
            alt="KONI Logo" 
            width={48} 
            height={50} 
            className="h-8 sm:h-9 md:h-7 lg:h-9 xl:h-10 w-auto object-contain mix-blend-multiply" 
          />
          <div className="w-px h-6 sm:h-7 md:h-6 lg:h-8 bg-gray-200"></div>
          <Image 
            src="/logo-porprov.webp" 
            alt="Porprov Logo" 
            width={120} 
            height={42} 
            className="h-7 sm:h-8 md:h-6 lg:h-8 xl:h-9 w-auto object-contain mix-blend-multiply hidden md:block" 
          />
          <div className="w-px h-6 sm:h-7 md:h-6 lg:h-8 bg-gray-200 hidden md:block"></div>
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 text-sm sm:text-base md:text-sm lg:text-lg xl:text-xl tracking-tight shrink-0" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>QuikKONI</span>
        </div>

        {/* Center: Desktop Navigation */}
        <div className="hidden xl:flex items-center justify-center gap-1 xl:gap-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-max z-0">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path));
              return (
                <Link 
                  key={item.name} 
                  href={item.path}
                  className={`group relative font-bold text-sm md:text-base xl:text-lg transition-all duration-300 px-4 py-2 rounded-xl ${
                    isActive ? 'text-solo-red bg-red-50/80 shadow-sm' : 'text-gray-600 hover:text-solo-red hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                  {/* Underline Animasi Khusus Desktop */}
                  <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 ${
                    isActive ? 'w-1/2 bg-solo-red' : 'w-0 bg-red-300 group-hover:w-1/2'
                  }`}></span>
                </Link>
              );
            })}
        </div>
        
        {/* Right Side: Notification */}
        <div className="flex items-center gap-4 shrink-0 z-10">
          <button 
            onClick={handleOpenNotif}
            className={`relative p-2 text-xl md:text-2xl xl:text-3xl focus:outline-none transition-colors ${isNotifOpen ? 'text-solo-red' : 'text-gray-700 hover:text-solo-red'}`}
          >
            <i className="fa-regular fa-bell"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-solo-red text-white text-[10px] font-extrabold rounded-full shadow-sm border-[2px] border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification Dropdown */}
        {isNotifOpen && (
          <div className="absolute right-4 top-[50px] w-[260px] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-[70] animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[350px] pointer-events-auto">
            <div className="p-3 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-xs font-bold text-gray-800">Notifikasi</h3>
              <button onClick={markAllRead} className="text-[10px] text-solo-red font-semibold hover:underline">Tandai dibaca</button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-1 overscroll-contain touch-pan-y">
              {notifications.length > 0 ? notifications.map(notif => {
                const cabor = cabors.find(c => c.id === notif.caborId);
                const title = `Medali ${notif.medalType.charAt(0).toUpperCase() + notif.medalType.slice(1)}`;
                const isUnread = notif.createdAt && notif.createdAt.toMillis() > lastReadTime;
                
                return (
                  <div key={notif.id} className={`p-2 rounded-xl transition-colors cursor-pointer flex gap-3 items-start ${isUnread ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.medalType === 'emas' ? 'bg-yellow-50 text-yellow-500' :
                      notif.medalType === 'perak' ? 'bg-gray-100 text-gray-500' :
                      notif.medalType === 'perunggu' ? 'bg-orange-50 text-amber-600' :
                      'bg-blue-50 text-blue-500'
                    }`}>
                      <i className="fa-solid fa-medal text-xs"></i>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-800 leading-tight mb-0.5">{title}</h4>
                      <p className="text-[10px] text-gray-500 leading-tight mb-1">{notif.athleteName} dari Cabor {cabor?.name}.</p>
                      <span className="text-[9px] text-gray-400 font-medium">{formatTime(notif.createdAt)}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-4 text-center text-xs text-gray-400 font-medium">Belum ada notifikasi</div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>

      {/* Backdrop for closing dropdown */}
      {isNotifOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsNotifOpen(false)}
        ></div>
      )}
    </>
  );
}
