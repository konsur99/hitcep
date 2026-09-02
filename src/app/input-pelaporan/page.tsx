"use client";

import { useState, useEffect, useRef } from 'react';
import { useGlobalLoader } from '@/components/GlobalLoader';
import LoadingUI from '@/components/LoadingUI';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { convertFileToWebP } from '@/utils/imageOptimization';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import DatePicker from '@/components/DatePicker';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ConfirmDialog';

const REPORT_CATEGORIES = [
  "Indikasi Kecurangan (Match Fixing)",
  "Kinerja Wasit / Juri",
  "Manipulasi Usia / Status Atlet",
  "Ketidaknetralan Panitia",
  "Protes Hasil Pertandingan",
  "Pelanggaran Tata Tertib",
  "Keterlambatan Jadwal Pertandingan",
  "Kualitas Lapangan / Peralatan",
  "Fasilitas Pertandingan",
  "Intimidasi / Kekerasan Fisik",
  "Keamanan / Keributan Suporter",
  "Pelayanan Medis / P3K",
  "Pelayanan LO / Pendamping",
  "Akomodasi / Penginapan",
  "Konsumsi / Makanan",
  "Kendala Transportasi",
  "Administrasi / Pendaftaran",
  "Masalah Tiket / Akses Masuk",
  "Force Majeure / Cuaca Buruk",
  "Lain-lain"
];

export default function InputPelaporan() {
  const router = useRouter();
    const { showLoading, hideLoading } = useGlobalLoader();
  const { confirm } = useConfirmDialog();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caborName, setCaborName] = useState<string>('');
  const [reporterRole, setReporterRole] = useState<string>('');
  const [reporterName, setReporterName] = useState('');
  const [location, setLocation] = useState('');
  const [specificLocation, setSpecificLocation] = useState('');
  const [incidentTime, setIncidentTime] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchCategory, setSearchCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const isOtherCategorySelected = selectedCategories.includes("Lain-lain");
  const categoryInputRef = useRef<HTMLDivElement>(null);

  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  useEffect(() => {
    fetch('/cities.json')
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(err => console.error("Failed to load cities", err));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthChecking(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'Admin Cabor' && userData.caborId) {
            const caborDoc = await getDoc(doc(db, "cabors", userData.caborId));
            if (caborDoc.exists()) {
              setCaborName(caborDoc.data().name);
            }
            setReporterRole('Admin Cabor');
          } else {
            setCaborName(userData.role);
            setReporterRole(userData.role);
          }
        }
      } catch (e) {
        console.error("Gagal memeriksa hak akses:", e);
      }
      
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const webpData = await convertFileToWebP(e.target.files[0], 0.8, 1024);
        setImagePreview(webpData);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) {
      toast.error("Harap pilih setidaknya satu Jenis Laporan!");
      return;
    }
    if (isOtherCategorySelected && !customCategory) {
      toast.error("Harap isi Jenis Laporan Lainnya!");
      return;
    }
    if (!title || !description) {
      toast.error("Harap lengkapi Judul dan Deskripsi laporan!");
      return;
    }
    if (!location || !specificLocation) {
      toast.error("Harap lengkapi Area Kabupaten/Kota dan Lokasi Spesifik kejadian!");
      return;
    }
    if (!incidentTime) {
      toast.error("Harap pilih Waktu Kejadian!");
      return;
    }
    if (!reporterName) {
      toast.error("Harap isi Nama Pelapor!");
      return;
    }
    if (!imagePreview) {
      toast.error("Harap unggah Foto Bukti Kondisi Lapangan!");
      return;
    }

    const isConfirmed = await confirm({
      title: 'Kirim Laporan',
      message: 'Kirim laporan ini sekarang?'
    });
    if (!isConfirmed) return;

    setIsSubmitting(true);
    showLoading("Mengunggah bukti laporan...");
    
    try {
      let finalImageUrl = null;
      let finalImagePublicId = null;

      if (imagePreview) {
        const uploadRes = await uploadImageToCloudinary(imagePreview);
        if (uploadRes) {
          finalImageUrl = uploadRes.secure_url;
          finalImagePublicId = uploadRes.public_id;
        } else {
          throw new Error("Gagal mengunggah foto bukti.");
        }
      }

      showLoading("Menyimpan laporan...");
      const reportData = {
        title,
        description,
        caborName,
        reporterRole,
        reporterName,
        location,
        specificLocation,
        categories: selectedCategories,
        customCategory: isOtherCategorySelected ? customCategory : null,
        imageUrl: finalImageUrl,
        imagePublicId: finalImagePublicId,
        status: 'approved',
        authorUid: auth.currentUser?.uid || 'unknown',
        createdAt: new Date().toISOString()
      };
      
      const colRef = collection(db, 'reports');
      const docRef = await addDoc(colRef, {
        ...reportData,
        incidentTime: incidentTime ? new Date(incidentTime) : null, // Store as Date/Timestamp in DB
        createdAt: serverTimestamp() // Store as serverTimestamp in DB
      });

      // Update public_cache directly on client (optimistic)
      const cacheRef = doc(db, 'public_cache', 'v1');
      const cacheDoc = await getDoc(cacheRef);
      if (cacheDoc.exists()) {
        const cacheData = cacheDoc.data();
        cacheData.reports = cacheData.reports || [];
        cacheData.reports.push({
          id: docRef.id,
          ...reportData
        });
        await updateDoc(cacheRef, { reports: cacheData.reports });
      }

      // Trigger revalidation immediately (non-blocking)
      try {
        fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
      } catch(e) {}

      toast.success("Berhasil! Laporan berhasil dikirim dan terpublikasi.");
      hideLoading();
      
      // Reset form
      setTitle('');
      setDescription('');
      setCaborName('');
      setReporterRole('');
      setReporterName('');
      setLocation('');
      setSpecificLocation('');
      setSelectedCategories([]);
      setCustomCategory('');
      setIncidentTime('');
      setImagePreview(null);
      router.push('/pelaporan');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal mengirim laporan.");
    } finally {
      setIsSubmitting(false);
      hideLoading();
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingUI text="Memeriksa Autentikasi..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans selection:bg-blue-200">
      {/* Custom Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 px-5 py-5 flex items-center shadow-md sticky top-0 z-50">
        <Link 
          href="/profil"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-blue-50 hover:bg-blue-400/30 transition-colors" 
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </Link>
        <div className="ml-2">
          <h1 className="font-extrabold text-white text-lg flex items-center gap-2">
            <i className="fa-solid fa-file-signature"></i> Buat Laporan
          </h1>
          <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wide">Aduan & Kejadian Lapangan</p>
        </div>
      </div>
      <div className="px-5 mt-4 relative z-20 max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 mb-4">
          <div className="mb-4 pb-3 border-b border-gray-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <i className="fa-solid fa-file-signature text-lg"></i>
            </div>
            <div>
              <h2 className="text-gray-900 font-extrabold text-base">Form Pelaporan</h2>
              <p className="text-[10px] text-gray-500">Kirim aduan kejadian di lapangan</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Pelapor</label>
                <div className="flex h-[34px] items-center">
                  <div className={`relative px-3 py-1.5 border rounded-lg text-xs font-bold whitespace-nowrap shadow-md overflow-hidden ${
                    reporterRole === 'Developer' ? 'bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 text-yellow-950 border-yellow-300 ring-2 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]' :
                    reporterRole === 'Admin' ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white border-orange-300 shadow-orange-500/30' :
                    'bg-gradient-to-r from-blue-600 to-blue-400 text-white border-blue-300 shadow-blue-500/30'
                  }`}>
                    {reporterRole === 'Developer' && (
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer"></div>
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <i className={`fa-solid text-[10px] ${
                        reporterRole === 'Developer' ? 'fa-crown text-yellow-800' :
                        reporterRole === 'Admin' ? 'fa-user-shield' : 'fa-medal'
                      }`}></i>
                      {caborName || 'Loading...'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Nama Pelapor</label>
                <input 
                  type="text" 
                  value={reporterName} 
                  onChange={e => setReporterName(e.target.value)} 
                  placeholder="Nama Lengkap"
                  className="w-full h-[34px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                  required
                />
              </div>
            </div>

            <div className="relative" ref={locationInputRef}>
              <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Lokasi (Kabupaten/Kota)</label>
              <div 
                className="relative cursor-pointer"
                onClick={() => setShowLocationDropdown(prev => !prev)}
              >
                <input 
                  type="text" 
                  value={location} 
                  onChange={e => { setLocation(e.target.value); setShowLocationDropdown(true); }}
                  placeholder="Cari Kota..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all cursor-text pointer-events-auto" 
                  required
                  onClick={(e) => {
                    e.stopPropagation(); // Allow typing when clicking the input text directly
                    setShowLocationDropdown(true);
                  }}
                />
                <div className="absolute right-0 inset-y-0 flex items-center px-3 cursor-pointer">
                  <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`}></i>
                </div>
              </div>
              
              {showLocationDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto overscroll-contain">
                  {cities.filter(c => c.toLowerCase().includes(location.toLowerCase())).map(city => (
                    <div 
                      key={city} 
                      onClick={() => { setLocation(city); setShowLocationDropdown(false); }}
                      className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                        location === city ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {city}
                    </div>
                  ))}
                  {cities.filter(c => c.toLowerCase().includes(location.toLowerCase())).length === 0 && (
                     <div className="px-3 py-3 text-xs font-semibold text-gray-400 text-center">Tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Waktu Kejadian</label>
              <DatePicker 
                date={incidentTime || null} 
                onChange={(dateStr) => setIncidentTime(dateStr || '')} 
                placeholder="Pilih Tanggal Kejadian"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Lokasi Detail</label>
              <input 
                type="text" 
                value={specificLocation} 
                onChange={e => setSpecificLocation(e.target.value)} 
                placeholder="Contoh: GOR Manahan"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                required
              />
            </div>

            <div className="relative" ref={categoryInputRef}>
              <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Jenis Laporan <span className="text-gray-400 font-medium">(Bisa pilih lebih dari satu)</span></label>
              
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedCategories.map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                      {cat}
                      <button type="button" onClick={() => toggleCategory(cat)} className="hover:text-red-500 transition-colors">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div 
                className="relative cursor-pointer"
                onClick={() => setShowCategoryDropdown(prev => !prev)}
              >
                <input 
                  type="text" 
                  value={searchCategory}
                  onChange={e => { setSearchCategory(e.target.value); setShowCategoryDropdown(true); }}
                  placeholder="Cari & Pilih Jenis Laporan..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all cursor-text pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCategoryDropdown(true);
                  }}
                />
                <div className="absolute right-0 inset-y-0 flex items-center px-3 cursor-pointer">
                  <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}></i>
                </div>
              </div>
              
              {showCategoryDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto overscroll-contain">
                  {REPORT_CATEGORIES.filter(c => c.toLowerCase().includes(searchCategory.toLowerCase())).map(cat => (
                    <div 
                      key={cat} 
                      onClick={() => { toggleCategory(cat); setSearchCategory(''); setShowCategoryDropdown(false); }}
                      className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors flex justify-between items-center border-b border-gray-50 last:border-0 ${
                        selectedCategories.includes(cat) ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                      {selectedCategories.includes(cat) && <i className="fa-solid fa-check text-blue-500"></i>}
                    </div>
                  ))}
                  {REPORT_CATEGORIES.filter(c => c.toLowerCase().includes(searchCategory.toLowerCase())).length === 0 && (
                     <div className="px-3 py-3 text-xs font-semibold text-gray-400 text-center">Tidak ditemukan</div>
                  )}
                </div>
              )}

              {isOtherCategorySelected && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-[10px] font-bold text-blue-800 mb-1">Tulis Jenis Laporan Lainnya</label>
                  <input 
                    type="text" 
                    value={customCategory} 
                    onChange={e => setCustomCategory(e.target.value)} 
                    placeholder="Ketik spesifik jenis laporannya..."
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                    required={isOtherCategorySelected}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Judul Laporan</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Contoh: Indikasi Kecurangan Wasit"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Deskripsi Kejadian</label>
              <textarea 
                value={description} 
                onChange={handleDescriptionChange} 
                placeholder="Ceritakan detail kejadian secara lengkap..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all resize-none overflow-hidden" 
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Foto Bukti <span className="text-gray-400 font-medium">(Opsional)</span></label>
              <div className="relative h-24 rounded-lg overflow-hidden bg-gray-50 border-2 border-dashed border-gray-300 hover:bg-gray-100 transition-colors">
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <i className="fa-solid fa-camera text-xl mb-1"></i>
                    <span className="text-[10px] font-semibold">Ketuk untuk foto</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full mt-1 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-extrabold text-sm rounded-xl shadow-[0_8px_15px_-3px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:shadow-none flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : <i className="fa-solid fa-paper-plane"></i>}
              Kirim Laporan
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
