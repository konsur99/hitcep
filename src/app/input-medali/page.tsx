"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useGlobalLoader } from '@/components/GlobalLoader';
import LoadingUI from '@/components/LoadingUI';
import { useRouter } from 'next/navigation';
import { convertFileToWebP } from '@/utils/imageOptimization';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import DatePicker from '@/components/DatePicker';
import { collection, getDocs, doc, getDoc, serverTimestamp, runTransaction, query, where } from 'firebase/firestore';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';

export default function InputMedali() {
  const router = useRouter();
    const { showLoading, hideLoading } = useGlobalLoader();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserPermissions, setCurrentUserPermissions] = useState<any>({});

  // Authentication Protection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Redirect to profil (login) if not authenticated
        // router.replace('/profil'); // Handled by SessionGuard
      } else {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUserRole(userData.role || '');
            setCurrentUserPermissions(userData.permissions || {});
          }
        } catch (e) {
          console.error("Gagal mengambil data user:", e);
        }
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const [selectedMedal, setSelectedMedal] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [ceremonyPreview, setCeremonyPreview] = useState<string | null>(null);
  
  // Custom Dropdown State
  const [selectedCabor, setSelectedCabor] = useState<string | null>(null);
  const [isCaborDropdownOpen, setIsCaborDropdownOpen] = useState(false);
  const [caborSearchQuery, setCaborSearchQuery] = useState('');
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  const [isAthleteDropdownOpen, setIsAthleteDropdownOpen] = useState(false);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState('');

  const [cabors, setCabors] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Cabors for dropdown
  useEffect(() => {
    getDocs(collection(db, "cabors")).then((snapshot) => {
      const caborsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      caborsData.sort((a, b) => a.name.localeCompare(b.name));
      setCabors(caborsData);
    }).catch(error => console.error(error));
  }, []);

  const filteredCabors = cabors.filter(c => c.name.toLowerCase().includes(caborSearchQuery.toLowerCase()));

  const [athletes, setAthletes] = useState<any[]>([]);

  // Fetch Athletes when Cabor is selected
  useEffect(() => {
    if (!selectedCabor) {
      setAthletes([]);
      return;
    }
    const q = query(collection(db, "athletes"), where("caborId", "==", selectedCabor));
    getDocs(q).then((snapshot) => {
      const athletesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setAthletes(athletesData);
    }).catch(error => console.error(error));
  }, [selectedCabor]);

  const availableCategories = Array.from(new Set(athletes.map(a => a.matchCategory).filter(Boolean))) as string[];
  const filteredCategories = availableCategories.filter(c => c.toLowerCase().includes(categorySearchQuery.toLowerCase()));
  
  const filteredAthletes = athletes
    .filter(a => !category || a.matchCategory === category)
    .filter(a => a.name.toLowerCase().includes(athleteSearchQuery.toLowerCase()));

  const handlePortraitChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        // Kompres otomatis potret (max dimensi 512px)
        const webpData = await convertFileToWebP(file, 0.8, 512);
        setPortraitPreview(webpData);
      } catch (err) {
        console.error("Gagal mengompres gambar:", err);
      }
    }
  };

  const handleCeremonyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        // Kompres otomatis dokumentasi (max dimensi 1024px)
        const webpData = await convertFileToWebP(file, 0.8, 1024);
        setCeremonyPreview(webpData);
      } catch (err) {
        console.error("Gagal mengompres gambar:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCabor || !athleteName || !category || !selectedMedal || !date) {
      toast.error("Harap lengkapi semua data teks (Cabor, Nama, Kategori, Tanggal, Medali)!");
      return;
    }

    if (!portraitPreview) {
      toast.error("Harap unggah Foto Potret Atlet!");
      return;
    }

    if (!ceremonyPreview) {
      toast.error("Harap unggah Foto Dokumentasi Penyerahan Medali!");
      return;
    }

    setIsSubmitting(true);
    showLoading("Mengunggah foto...");

    let finalPortraitUrl = "";
    let finalPortraitPublicId = "";
    let finalCeremonyUrl = "";
    let finalCeremonyPublicId = "";

    try {
      // Upload portrait image if exists
      if (portraitPreview) {
        showLoading("Mengunggah foto atlet...");
        const uploadRes = await uploadImageToCloudinary(portraitPreview);
        finalPortraitUrl = uploadRes.secure_url;
        finalPortraitPublicId = uploadRes.public_id;
      }
      
      // Upload ceremony image if exists
      if (ceremonyPreview) {
        showLoading("Mengunggah foto UPP...");
        const uploadRes = await uploadImageToCloudinary(ceremonyPreview);
        finalCeremonyUrl = uploadRes.secure_url;
        finalCeremonyPublicId = uploadRes.public_id;
      }
    } catch (err: any) {
      console.error("Cloudinary upload failed:", err);
      toast.error("Gagal mengunggah foto ke server (Cloudinary): " + err.message);
      setIsSubmitting(false);
      hideLoading();
      return;
    }

    try {
      showLoading("Menyimpan medali...");
      // 1. Simpan history medali
      const isAutoApprove = true;
      const finalStatus = 'approved';

      const medalData = {
        caborId: selectedCabor,
        athleteName,
        category,
        date,
        medalType: selectedMedal,
        portraitUrl: finalPortraitUrl,
        portraitPublicId: finalPortraitPublicId,
        ceremonyUrl: finalCeremonyUrl,
        ceremonyPublicId: finalCeremonyPublicId,
        status: finalStatus,
        authorUid: auth.currentUser?.uid || 'unknown',
        createdAt: new Date().toISOString()
      };

      await runTransaction(db, async (transaction) => {
        // 1. EXECUTE ALL READS FIRST
        const medalField = selectedMedal === 'emas' ? 'gold' : selectedMedal === 'perak' ? 'silver' : 'bronze';
        
        let caborDoc = null;
        let caborRef = null;
        if (isAutoApprove) {
          caborRef = doc(db, "cabors", selectedCabor);
          caborDoc = await transaction.get(caborRef);
        }
        
        const cacheRef = doc(db, "public_cache", "v1");
        const cacheDoc = await transaction.get(cacheRef);

        // 2. EXECUTE ALL WRITES AFTERWARDS
        const newMedalRef = doc(collection(db, "medals"));
        transaction.set(newMedalRef, {
          ...medalData,
          createdAt: serverTimestamp() // real timestamp for db
        });

        if (isAutoApprove && caborDoc?.exists() && caborRef) {
           const cData = caborDoc.data();
           transaction.update(caborRef, { [medalField]: (cData[medalField] || 0) + 1 });
        }
        
        if (cacheDoc.exists()) {
          const cacheData = cacheDoc.data();
          
          if (isAutoApprove) {
            cacheData.medals = cacheData.medals || [];
            cacheData.medals.push({ id: newMedalRef.id, ...medalData });
            
            cacheData.cabors = cacheData.cabors || [];
            const cacheCabor = cacheData.cabors.find((c: any) => c.id === selectedCabor);
            if (cacheCabor) {
              cacheCabor[medalField] = (cacheCabor[medalField] || 0) + 1;
            }
            transaction.update(cacheRef, { 
              medals: cacheData.medals,
              cabors: cacheData.cabors
            });
          }
        }
      });

      // Purge public Vercel cache immediately
      await fetch('/api/revalidate', { method: 'POST' }).catch(e => console.error("Cache purge failed:", e));
      toast.success("Sukses! Medali berhasil ditambahkan ke klasemen publik.");
      
      // Reset form
      setSelectedCabor(null);
      setAthleteName('');
      setCategory('');
      setSelectedMedal(null);
      setPortraitPreview(null);
      setCeremonyPreview(null);
      
    } catch (err) {
      console.error("Gagal menyimpan medali:", err);
      toast.error("Terjadi kesalahan sistem saat menyimpan medali.");
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-center items-center pb-24 relative z-10">
        <div className="w-10 h-10 border-4 border-solo-red border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 text-sm font-bold animate-pulse">Memeriksa Akses Keamanan...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[100vh] bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center shadow-sm sticky top-0 z-50">
        <Link href="/profil" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </Link>
        <div>
          <h1 className="font-extrabold text-gray-800 text-lg ml-2">Form Input Cepat</h1>
          <p className="text-[10px] text-gray-400 font-medium ml-2 -mt-0.5">Tambah data perolehan medali</p>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-6 max-w-3xl mx-auto w-full">
        
        {/* Form Container */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-medal text-solo-gold"></i> Detail Medali
          </h2>

          <div className="space-y-4">
            
            {/* Cabang Olahraga */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Cabang Olahraga</label>
              <div className="relative">
                <div 
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 cursor-pointer flex justify-between items-center transition-colors hover:bg-gray-100"
                  onClick={() => setIsCaborDropdownOpen(!isCaborDropdownOpen)}
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-dharmachakra"></i>
                  </div>
                  <span className={`truncate ${selectedCabor ? 'text-gray-800' : 'text-gray-400 font-medium'}`}>
                    {selectedCabor ? cabors.find(c => c.id === selectedCabor)?.name : 'Pilih Cabor...'}
                  </span>
                  <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${isCaborDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>

                {/* Dropdown Menu */}
                {isCaborDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCaborDropdownOpen(false)}></div>
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden">
                      <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                        <div className="relative">
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input 
                            type="text" 
                            placeholder="Cari Cabor..." 
                            className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-solo-red focus:ring-1 focus:ring-solo-red transition-all"
                            value={caborSearchQuery}
                            onChange={(e) => setCaborSearchQuery(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                      <ul className="max-h-[220px] overflow-y-auto">
                        {filteredCabors.length > 0 ? (
                          filteredCabors.map(c => (
                            <li 
                              key={c.id} 
                              className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${selectedCabor === c.id ? 'font-bold text-solo-red bg-red-50' : 'font-medium text-gray-700'}`}
                              onClick={() => {
                                setSelectedCabor(c.id);
                                setIsCaborDropdownOpen(false);
                                setCaborSearchQuery('');
                              }}
                            >
                              {c.name}
                            </li>
                          ))
                        ) : (
                          <li className="px-4 py-6 text-xs text-center text-gray-400 font-medium">
                            <i className="fa-regular fa-face-frown mb-2 text-lg block"></i>
                            Cabor tidak ditemukan
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>


            {/* Kategori Lomba */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Kategori / Nomor Lomba</label>
              <div className="relative">
                <div 
                  className={`w-full pl-9 pr-4 py-3 bg-gray-50 border ${!selectedCabor ? 'border-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-200 cursor-pointer hover:bg-gray-100'} rounded-xl text-sm font-semibold text-gray-800 flex justify-between items-center transition-colors`}
                  onClick={() => selectedCabor && setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-list-ol"></i>
                  </div>
                  <span className={`truncate ${category ? 'text-gray-800' : 'text-gray-400 font-medium'}`}>
                    {!selectedCabor ? 'Pilih Cabor dulu...' : category ? category : 'Pilih Kategori...'}
                  </span>
                  <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>

                {/* Dropdown Menu */}
                {isCategoryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)}></div>
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden">
                      <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                        <div className="relative">
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input 
                            type="text" 
                            placeholder="Cari atau ketik baru..." 
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-solo-red transition-all"
                            value={categorySearchQuery}
                            onChange={(e) => {
                              setCategorySearchQuery(e.target.value);
                              setCategory(e.target.value);
                            }}
                            autoFocus
                          />
                        </div>
                      </div>
                      <ul className="max-h-[200px] overflow-y-auto">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((c, idx) => (
                            <li 
                              key={idx} 
                              className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${category === c ? 'font-bold text-solo-red bg-red-50' : 'font-medium text-gray-700'}`}
                              onClick={() => {
                                setCategory(c);
                                setIsCategoryDropdownOpen(false);
                                setCategorySearchQuery('');
                              }}
                            >
                              {c}
                            </li>
                          ))
                        ) : (
                          <li className="px-4 py-6 text-xs text-center text-gray-400 font-medium flex flex-col items-center">
                            {categorySearchQuery ? (
                               <>
                                <i className="fa-solid fa-check mb-2 text-lg text-emerald-500"></i>
                                <span className="text-gray-600 mb-1">Gunakan kategori baru:</span>
                                <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded mt-1">{categorySearchQuery}</span>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCategory(categorySearchQuery);
                                    setIsCategoryDropdownOpen(false);
                                    setCategorySearchQuery('');
                                  }}
                                  className="mt-3 px-4 py-1.5 bg-solo-red hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                  Pilih Kategori Ini
                                </button>
                               </>
                            ) : (
                               <>
                                <i className="fa-regular fa-face-frown mb-2 text-lg"></i>
                                Tidak ada kategori. Ketik untuk buat baru.
                               </>
                            )}
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Nama Atlet */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Nama Atlet / Tim</label>
              <div className="relative">
                <div 
                  className={`w-full pl-9 pr-4 py-3 bg-gray-50 border ${!selectedCabor ? 'border-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-200 cursor-pointer hover:bg-gray-100'} rounded-xl text-sm font-semibold text-gray-800 flex justify-between items-center transition-colors`}
                  onClick={() => selectedCabor && setIsAthleteDropdownOpen(!isAthleteDropdownOpen)}
                >
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <span className={`truncate ${athleteName ? 'text-gray-800' : 'text-gray-400 font-medium'}`}>
                    {!selectedCabor ? 'Pilih Cabor dulu...' : athleteName ? athleteName : 'Pilih Atlet/Tim...'}
                  </span>
                  <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${isAthleteDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>

                {/* Dropdown Menu */}
                {isAthleteDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAthleteDropdownOpen(false)}></div>
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden">
                      <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                        <div className="relative">
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input 
                            type="text" 
                            placeholder="Cari atau ketik baru..." 
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-solo-red transition-all"
                            value={athleteSearchQuery}
                            onChange={(e) => {
                              setAthleteSearchQuery(e.target.value);
                              setAthleteName(e.target.value);
                            }}
                            autoFocus
                          />
                        </div>
                      </div>
                      <ul className="max-h-[200px] overflow-y-auto">
                        {filteredAthletes.length > 0 ? (
                          filteredAthletes.map((a) => (
                            <li 
                              key={a.id} 
                              className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${athleteName === a.name ? 'font-bold text-solo-red bg-red-50' : 'font-medium text-gray-700'}`}
                              onClick={() => {
                                setAthleteName(a.name);
                                setIsAthleteDropdownOpen(false);
                                setAthleteSearchQuery('');
                                if (a.matchCategory && !category) {
                                  setCategory(a.matchCategory);
                                }
                              }}
                            >
                              <div>
                                {a.name}
                                {a.matchCategory && (
                                  <p className="text-[10px] text-gray-400 mt-0.5 font-normal">Kategori: {a.matchCategory}</p>
                                )}
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="px-4 py-6 text-xs text-center text-gray-400 font-medium flex flex-col items-center">
                            {athleteSearchQuery ? (
                               <>
                                <i className="fa-solid fa-check mb-2 text-lg text-emerald-500"></i>
                                <span className="text-gray-600 mb-1">Gunakan nama baru:</span>
                                <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded mt-1">{athleteSearchQuery}</span>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setAthleteName(athleteSearchQuery);
                                    setIsAthleteDropdownOpen(false);
                                    setAthleteSearchQuery('');
                                  }}
                                  className="mt-3 px-4 py-1.5 bg-solo-red hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                  Pilih Nama Ini
                                </button>
                               </>
                            ) : (
                               <>
                                <i className="fa-regular fa-face-frown mb-2 text-lg"></i>
                                Tidak ada atlet. Ketik untuk buat baru.
                               </>
                            )}
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tanggal Perolehan */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Tanggal Perolehan</label>
              <DatePicker 
                date={date || null}
                onChange={(dateStr) => setDate(dateStr || '')}
                placeholder="Pilih Tanggal Perolehan"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-solo-red cursor-pointer transition-all"
              />
            </div>

            {/* Pilihan Medali (Radio/Buttons) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">Jenis Medali</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setSelectedMedal('emas')}
                  className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedMedal === 'emas' ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                >
                  <img src="/medal-gold.webp" alt="Emas" className="w-8 h-8 object-contain" />
                  <span className={`text-[10px] font-bold ${selectedMedal === 'emas' ? 'text-yellow-700' : 'text-gray-500'}`}>EMAS</span>
                </button>
                <button 
                  onClick={() => setSelectedMedal('perak')}
                  className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedMedal === 'perak' ? 'bg-slate-100 border-slate-400 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                >
                  <img src="/medal-silver.webp" alt="Perak" className="w-8 h-8 object-contain" />
                  <span className={`text-[10px] font-bold ${selectedMedal === 'perak' ? 'text-slate-700' : 'text-gray-500'}`}>PERAK</span>
                </button>
                <button 
                  onClick={() => setSelectedMedal('perunggu')}
                  className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedMedal === 'perunggu' ? 'bg-orange-50 border-orange-400 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                >
                  <img src="/medal-bronze.webp" alt="Perunggu" className="w-8 h-8 object-contain" />
                  <span className={`text-[10px] font-bold ${selectedMedal === 'perunggu' ? 'text-orange-700' : 'text-gray-500'}`}>PERUNGGU</span>
                </button>
              </div>
            </div>

          </div>

          <hr className="my-6 border-gray-100" />

          {/* Upload Foto Section */}
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-camera text-solo-red"></i> Dokumentasi Foto
          </h2>

          <div className="space-y-4">
            
            {/* Foto Potret Atlet */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Foto Potret Atlet</label>
              <label className={`flex items-center gap-3 w-full px-4 py-3 ${portraitPreview ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border border-dashed rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group relative`}>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 overflow-hidden border border-gray-100 shrink-0">
                  {portraitPreview ? (
                    <img src={portraitPreview} alt="Preview Portrait" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-regular fa-image"></i>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${portraitPreview ? 'text-solo-red' : 'text-gray-800'}`}>
                    {portraitPreview ? 'Foto Terpilih' : 'Upload Foto Atlet'}
                  </p>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePortraitChange} />
                </div>
                {portraitPreview && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPortraitPreview(null);
                    }}
                    className="w-8 h-8 rounded-full bg-red-100 text-solo-red flex items-center justify-center hover:bg-red-200 transition-colors shrink-0 z-10 relative"
                    title="Hapus Foto"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                )}
              </label>
            </div>

            {/* Foto Dokumentasi/Penyerahan Medali */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Foto Upacara Penyerahan Medali</label>
              <label className={`flex items-center gap-3 w-full px-4 py-3 ${ceremonyPreview ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border border-dashed rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group relative`}>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 overflow-hidden border border-gray-100 shrink-0">
                  {ceremonyPreview ? (
                    <img src={ceremonyPreview} alt="Preview Ceremony" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-camera-retro"></i>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${ceremonyPreview ? 'text-solo-red' : 'text-gray-800'}`}>
                    {ceremonyPreview ? 'Foto Terpilih' : 'Upload Foto Dokumentasi Penyerahan Medali'}
                  </p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCeremonyChange} />
                </div>
                {ceremonyPreview && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCeremonyPreview(null);
                    }}
                    className="w-8 h-8 rounded-full bg-red-100 text-solo-red flex items-center justify-center hover:bg-red-200 transition-colors shrink-0 z-10 relative"
                    title="Hapus Foto"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                )}
              </label>
            </div>

          </div>

        </div>

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full mt-8 bg-solo-red text-white font-bold py-4 rounded-xl shadow-[0_8px_20px_rgba(200,0,0,0.25)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? 'Memproses Data & Mengunggah Foto...' : 'Simpan Data Medali'}
            {!isSubmitting && <i className="fa-solid fa-floppy-disk text-sm"></i>}
          </button>
        
      </div>
    </main>
  );
}
