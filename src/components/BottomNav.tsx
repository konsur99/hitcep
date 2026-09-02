'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) setRole(savedRole);

    const unsub = onAuthStateChanged(auth, async (user) => {
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

  const navItems = [
    { name: 'Beranda', path: '/', icon: 'fa-house' },
    { name: 'Cabor', path: '/cabor', icon: 'fa-dharmachakra' },
    { name: 'Medali', path: '/medali', icon: 'fa-medal' },
    { name: 'Statistik', path: '/statistik', icon: 'fa-chart-pie' },
    ...(role === 'Developer' || role === 'Admin' ? [{ name: 'Pelaporan', path: '/pelaporan', icon: 'fa-bullhorn' }] : []),
    { name: 'Profil', path: '/profil', icon: 'fa-user' },
  ];

  if (pathname === '/developer') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex xl:hidden justify-around py-3 px-2 pb-5 z-50 rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.name}
            href={item.path}
            className={`flex flex-col items-center transition-colors ${
              isActive ? 'text-solo-red' : 'text-gray-500 hover:text-solo-red'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-xl mb-1`}></i>
            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
