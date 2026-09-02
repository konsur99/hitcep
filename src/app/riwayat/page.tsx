"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useGlobalLoader } from '@/components/GlobalLoader';
import LoadingUI from '@/components/LoadingUI';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function RiwayatInput() {
  const router = useRouter();
    const { showLoading, hideLoading } = useGlobalLoader();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [medals, setMedals] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [cabors, setCabors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'medali' | 'pelaporan'>('medali');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/profil');
      } else {
        setUserId(user.uid);
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Cabors for reference
        const caborsSnap = await getDocs(collection(db, "cabors"));
        const caborsData = caborsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCabors(caborsData);

        // Fetch Medals by this user
        const medalsQ = query(
          collection(db, "medals"), 
          where("authorUid", "==", userId)
        );
        const medalsSnap = await getDocs(medalsQ);
        const medalsData = medalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort manually since we might not have a composite index for authorUid + createdAt desc
        medalsData.sort((a: any, b: any) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tB - tA;
        });
        setMedals(medalsData);

        // Fetch Reports by this user
        const reportsQ = query(
          collection(db, "reports"), 
          where("authorUid", "==", userId)
        );
        const reportsSnap = await getDocs(reportsQ);
        const reportsData = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        reportsData.sort((a: any, b: any) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tB - tA;
        });
        setReports(reportsData);

      } catch (e) {
        console.error("Gagal memuat riwayat:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const getCaborName = (caborId: string) => {
    const c = cabors.find((c: any) => c.id === caborId);
    return c ? c.name : 'Unknown Cabor';
  };

  const getMedalImage = (medalType: string) => {
    if (medalType === 'emas') return '/medal-gold.webp';
    if (medalType === 'perak') return '/medal-silver.webp';
    return '/medal-bronze.webp';
  };

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
      return formatDistanceToNow(date, { addSuffix: true, locale: id });
    } catch (e) {
      return '';
    }
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingUI text="Memeriksa Autentikasi..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans selection:bg-red-200">
      {/* Custom Header */}
      <div className="bg-gradient-to-r from-solo-red via-red-600 to-red-800 px-5 py-5 flex items-center shadow-md sticky top-0 z-50">
        <Link 
          href="/profil"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-red-50 hover:bg-red-500/30 transition-colors" 
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </Link>
        <div className="ml-2">
          <h1 className="font-extrabold text-white text-lg flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left"></i> Riwayat Input
          </h1>
          <p className="text-[10px] text-red-100 font-bold uppercase tracking-wide">Data yang pernah Anda inputkan</p>
        </div>
      </div>

      <div className="px-5 mt-4 relative z-20 max-w-4xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 mb-5 p-1">
          <button 
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'medali' ? 'bg-solo-red text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('medali')}
          >
            <i className="fa-solid fa-medal mr-1.5"></i> Medali ({medals.length})
          </button>
          <button 
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'pelaporan' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('pelaporan')}
          >
            <i className="fa-solid fa-bullhorn mr-1.5"></i> Laporan ({reports.length})
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <LoadingUI text="Memuat Riwayat..." />
            <p className="text-xs font-bold text-gray-500">Memuat riwayat...</p>
          </div>
        ) : activeTab === 'medali' ? (
          <div className="space-y-4">
            {medals.length > 0 ? medals.map((medal: any) => (
              <div key={medal.id} className="bg-white p-4 rounded-2xl shadow-card border border-gray-100 relative overflow-hidden">
                <div className="flex gap-4">
                  <div className="w-16 h-16 shrink-0 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 p-2">
                    <img src={getMedalImage(medal.medalType)} alt={medal.medalType} className="w-full h-full object-contain drop-shadow-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-solo-red tracking-wide uppercase">{getCaborName(medal.caborId)}</span>
                      <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{formatTime(medal.createdAt)}</span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm truncate">{medal.athleteName}</h3>
                    <p className="text-xs text-gray-500 font-medium truncate mb-2">{medal.category}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                       <span className="bg-green-50 text-green-600 border border-green-200 text-[9px] px-2 py-1 rounded-md font-bold flex items-center gap-1">
                         <i className="fa-solid fa-check-circle"></i> Terpublikasi
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-white p-8 rounded-2xl shadow-card border border-gray-100 text-center">
                <i className="fa-solid fa-medal text-4xl text-gray-200 mb-3 block"></i>
                <h3 className="text-sm font-bold text-gray-800 mb-1">Belum Ada Medali</h3>
                <p className="text-xs text-gray-500">Anda belum pernah menginput data medali.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reports.length > 0 ? reports.map((report: any) => (
              <div key={report.id} className="bg-white p-4 rounded-2xl shadow-card border border-gray-100">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight">{report.title}</h3>
                  <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 mt-0.5">{formatTime(report.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{report.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] px-2 py-1 rounded-md font-bold">
                      {report.caborName || 'Umum'}
                    </span>
                  </div>
                  <span className="bg-green-50 text-green-600 border border-green-200 text-[9px] px-2 py-1 rounded-md font-bold flex items-center gap-1">
                    <i className="fa-solid fa-check-circle"></i> Terpublikasi
                  </span>
                </div>
              </div>
            )) : (
              <div className="bg-white p-8 rounded-2xl shadow-card border border-gray-100 text-center">
                <i className="fa-solid fa-bullhorn text-4xl text-gray-200 mb-3 block"></i>
                <h3 className="text-sm font-bold text-gray-800 mb-1">Belum Ada Laporan</h3>
                <p className="text-xs text-gray-500">Anda belum pernah membuat pelaporan.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
