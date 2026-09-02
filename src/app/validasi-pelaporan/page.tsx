"use client";

import { useState, useEffect, useRef } from 'react';
import { useGlobalLoader } from '@/components/GlobalLoader';
import LoadingUI from '@/components/LoadingUI';
import { createPortal } from 'react-dom';
import DatePicker from '@/components/DatePicker';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, writeBatch, query, where, orderBy, runTransaction } from 'firebase/firestore';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { getOptimizedUrl, uploadImageToCloudinary } from '@/lib/cloudinary';
import { convertFileToWebP } from '@/utils/imageOptimization';

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
  "Pelecehan / Tindakan Tidak Senonoh",
  "Lainnya"
];
export default function ValidasiPelaporan() {
  const router = useRouter();
    const { showLoading, hideLoading } = useGlobalLoader();
  const { confirm } = useConfirmDialog();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [reports, setReports] = useState<any[]>([]);
  const [cabors, setCabors] = useState<any>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  
  // Edit State
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReporterName, setEditReporterName] = useState('');
  const [editCaborName, setEditCaborName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSpecificLocation, setEditSpecificLocation] = useState('');
  const [editIncidentTime, setEditIncidentTime] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryInputRef = useRef<HTMLDivElement>(null);
  const isOtherCategorySelected = editCategories.includes("Lainnya") || editCategories.includes("Lain-lain");

  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [cities, setCities] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationInputRef = useRef<HTMLDivElement>(null);
  
  // Load cities once
  useEffect(() => {
    fetch('/cities.json')
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(err => console.error("Failed to load cities", err));
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          // We don't need to manually redirect here, SessionGuard handles it.
        }
      } catch (e) {
        console.error("Gagal memeriksa hak akses:", e);
      }
      
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (isAuthChecking) return;

    const fetchData = async () => {
      try {
        const [caborsSnap, reportsSnap] = await Promise.all([
          getDocs(collection(db, "cabors")),
          getDocs(query(collection(db, "reports")))
        ]);
        
        const cDict: any = {};
        caborsSnap.forEach(doc => { cDict[doc.id] = doc.data().name; });
        setCabors(cDict);
        
        const rData: any[] = [];
        reportsSnap.forEach(doc => {
          rData.push({ id: doc.id, ...(doc.data() as any) });
        });
        
        rData.sort((a, b) => {
          const tA = a.createdAt ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        
        setReports(rData);
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();

    let currentVersion = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/version', { next: { revalidate: 30 } });
        if (res.ok) {
          const { version } = await res.json();
          if (currentVersion === 0) {
            currentVersion = version;
          } else if (version > currentVersion) {
            currentVersion = version;
            fetchData();
          }
        }
      } catch (e) {}
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthChecking, refreshTrigger]);

  useEffect(() => {
    if (editingReport || lightboxImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [editingReport, lightboxImage]);

  const toggleCategory = (cat: string) => {
    setEditCategories(prev => {
      if (prev.includes(cat)) {
        const next = prev.filter(c => c !== cat);
        if (cat === "Lain-lain" || cat === "Lainnya") setEditCustomCategory('');
        return next;
      } else {
        return [...prev, cat];
      }
    });
  };

  const openEditModal = (report: any) => {
    setEditingReport(report);
    setEditTitle(report.title || '');
    setEditDescription(report.description || '');
    setEditReporterName(report.reporterName || '');
    setEditCaborName(report.caborName || '');
    setEditLocation(report.location || '');
    setEditSpecificLocation(report.specificLocation || '');
    
    if (report.incidentTime) {
      const dateStr = typeof report.incidentTime === 'string' 
        ? report.incidentTime 
        : report.incidentTime.toDate().toISOString();
      setEditIncidentTime(dateStr.substring(0, 16)); // Format for datetime-local input
    } else {
      setEditIncidentTime('');
    }
    
    setEditCategories(report.categories || []);
    setEditCustomCategory(report.customCategory || '');
    setEditImagePreview(null);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const webpData = await convertFileToWebP(e.target.files[0], 0.8, 1024);
        setEditImagePreview(webpData);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCategoryChange = (category: string) => {
    setEditCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const saveEdit = async () => {
    if (!editingReport) return;
    if (!editTitle.trim() || !editDescription.trim() || !editLocation.trim() || !editSpecificLocation.trim() || !editIncidentTime) {
      toast.error("Harap lengkapi semua field yang wajib!");
      return;
    }
    if (editCategories.length === 0) {
      toast.error("Pilih setidaknya satu jenis laporan!");
      return;
    }
    
    setIsSavingEdit(true);
      showLoading("Menyimpan...");
    try {
      let finalImageUrl = editingReport.imageUrl;
      let finalImagePublicId = editingReport.imagePublicId;

      if (editImagePreview) {
        const uploadRes = await uploadImageToCloudinary(editImagePreview);
        if (uploadRes) {
          finalImageUrl = uploadRes.secure_url;
          finalImagePublicId = uploadRes.public_id;
          if (editingReport.imagePublicId) {
            const token = await auth.currentUser?.getIdToken();
            await fetch('/api/delete-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: editingReport.imagePublicId }) }).catch(console.error);
          }
        }
      }

      await runTransaction(db, async (transaction) => {
        // 1. READS
        const cacheRef = doc(db, "public_cache", "v1");
        const cacheDoc = await transaction.get(cacheRef);

        // 2. WRITES
        const reportRef = doc(db, "reports", editingReport.id);
        transaction.update(reportRef, { 
          title: editTitle,
          description: editDescription,
          reporterName: editReporterName,
          caborName: editCaborName,
          location: editLocation,
          specificLocation: editSpecificLocation,
          incidentTime: new Date(editIncidentTime),
          categories: editCategories,
          customCategory: editCategories.includes('Lainnya') ? editCustomCategory : null,
          imageUrl: finalImageUrl,
          imagePublicId: finalImagePublicId
        });
        
        if (cacheDoc.exists()) {
          const cacheData = cacheDoc.data();
          cacheData.reports = cacheData.reports || [];
          
          const cacheReport = cacheData.reports.find((r: any) => r.id === editingReport.id);
          if (cacheReport) {
            cacheReport.title = editTitle;
            cacheReport.description = editDescription;
            cacheReport.reporterName = editReporterName;
            cacheReport.caborName = editCaborName;
            cacheReport.location = editLocation;
            cacheReport.specificLocation = editSpecificLocation;
            cacheReport.incidentTime = new Date(editIncidentTime).toISOString();
            cacheReport.categories = editCategories;
            cacheReport.customCategory = editCategories.includes('Lainnya') ? editCustomCategory : null;
            cacheReport.imageUrl = finalImageUrl;
            cacheReport.imagePublicId = finalImagePublicId;
            transaction.update(cacheRef, { reports: cacheData.reports });
          }
        }
      });
      
      toast.success("Laporan berhasil diperbarui");
      setEditingReport(null);
    } catch (e: any) {
      toast.error("Gagal menyimpan perubahan: " + e.message);
    } finally {
      fetch('/api/revalidate', { method: 'POST' }).then(() => setRefreshTrigger(prev => prev + 1)).catch(e => console.error(e));
      setIsSavingEdit(false);
      hideLoading();
    }
  };

  const handleDeleteApproved = async (report: any) => {
    if (isProcessingId) return;
    const isConfirmed = await confirm({
      title: 'Hapus Laporan',
      message: `Hapus permanen laporan "${report.title}" yang sudah disetujui?`,
      danger: true
    });
    if (!isConfirmed) return;
    
    setIsProcessingId(report.id);
      showLoading("Memproses...");
    try {
      if (report.imagePublicId) {
        const token = await auth.currentUser?.getIdToken();
        await fetch('/api/delete-image', { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ publicId: report.imagePublicId }) 
        }).catch(console.error);
      }
      
      await runTransaction(db, async (transaction) => {
        // 1. READS
        const cacheRef = doc(db, "public_cache", "v1");
        const cacheDoc = await transaction.get(cacheRef);

        // 2. WRITES
        const reportRef = doc(db, "reports", report.id);
        transaction.delete(reportRef);
        
        if (cacheDoc.exists()) {
          const cacheData = cacheDoc.data();
          cacheData.reports = (cacheData.reports || []).filter((r: any) => r.id !== report.id);
          transaction.update(cacheRef, { reports: cacheData.reports });
        }
      });
    } catch (e: any) {
      toast.error("Gagal menghapus laporan: " + e.message);
    } finally {
      fetch('/api/revalidate', { method: 'POST' }).then(() => setRefreshTrigger(prev => prev + 1)).catch(e => console.error(e));
      setIsProcessingId(null);
      hideLoading();
      showLoading("Memproses...");
    }
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-center items-center pb-24 relative z-10">
        <LoadingUI text="Memeriksa Autentikasi..." />
        <p className="text-gray-500 text-sm font-bold animate-pulse">Memeriksa Akses Keamanan...</p>
      </main>
    );
  }



  return (
    <main className="min-h-[100vh] bg-gray-50 pb-6">
      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full text-white flex items-center justify-center backdrop-blur-md"
            onClick={() => setLightboxImage(null)}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img src={getOptimizedUrl(lightboxImage)} alt="Fullscreen" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center shadow-sm sticky top-0 z-50">
        <Link href="/profil" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </Link>
        <div>
          <h1 className="font-extrabold text-gray-800 text-lg ml-2">Kelola Data Pelaporan</h1>
          <p className="text-[10px] text-gray-400 font-medium ml-2 -mt-0.5">Pengelolaan aduan lapangan</p>
        </div>
      </div>

      <div className="px-5 mt-6 relative z-20 space-y-6 pb-20 max-w-4xl mx-auto w-full">

        {reports.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fa-solid fa-folder-open text-2xl text-gray-400"></i>
            </div>
            <p className="text-sm font-bold text-gray-500">Tidak ada data</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const isExpanded = expandedId === report.id;
              
              return (
              <div key={report.id} className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden relative group transition-all">
                
                {/* Summary Box (Click to expand) */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                >
                  <div className="flex justify-between gap-3 h-full">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="mb-1.5 pr-2">
                          <h3 className="font-extrabold text-gray-900 text-xs leading-snug">{report.title}</h3>
                        </div>
                        <p className="text-gray-600 text-[11px] font-medium line-clamp-2 leading-relaxed">
                          {report.description}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center mt-3 gap-1.5">
                        {/* Status Label */}
                        {report.status === 'pending' ? (
                          <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-100 flex items-center gap-1">
                            <i className="fa-regular fa-clock text-[9px]"></i>Pending
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-[9px]"></i>Approved
                          </span>
                        )}
                        <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">
                          {report.caborName || 'Umum'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between shrink-0 gap-3">
                      <div className="flex flex-col items-end gap-2 mt-0.5">
                        {report.createdAt && (
                          <span className="text-[10px] font-bold text-gray-400">
                            {format(report.createdAt.toDate(), 'd MMM yyyy', {locale: localeId})}
                          </span>
                        )}
                        <div className={`transition-transform duration-300 text-gray-400 mr-1 ${isExpanded ? 'rotate-180 text-gray-600' : ''}`}>
                          <i className="fa-solid fa-chevron-down text-sm"></i>
                        </div>
                      </div>
                      

                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30">
                    <div className="p-4 space-y-4">
                      
                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <span className="block text-gray-400 font-bold mb-0.5">Waktu Kejadian</span>
                          <span className="text-gray-900 font-semibold">{report.incidentTime ? format(report.incidentTime.toDate ? report.incidentTime.toDate() : new Date(report.incidentTime), 'd MMM yyyy', {locale: localeId}) : '-'}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <span className="block text-gray-400 font-bold mb-0.5">Pelapor</span>
                          <span className="text-gray-900 font-semibold">{report.reporterName}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <span className="block text-gray-400 font-bold mb-0.5">Peran Pelapor</span>
                          <span className="text-gray-900 font-semibold">{report.reporterRole || '-'}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <span className="block text-gray-400 font-bold mb-0.5">Cabor</span>
                          <span className="text-gray-900 font-semibold line-clamp-1">{report.caborName || '-'}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100 col-span-2">
                          <span className="block text-gray-400 font-bold mb-0.5">Lokasi Umum</span>
                          <span className="text-gray-900 font-semibold">{report.location}</span>
                        </div>
                        {report.specificLocation && (
                          <div className="bg-white p-2.5 rounded-lg border border-gray-100 col-span-2">
                            <span className="block text-gray-400 font-bold mb-0.5">Detail Lokasi</span>
                            <span className="text-gray-900 font-semibold leading-relaxed">{report.specificLocation}</span>
                          </div>
                        )}
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100 col-span-2">
                          <span className="block text-gray-400 font-bold mb-1">Kategori Pelaporan</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {report.categories?.map((cat: string, i: number) => (
                              <span key={i} className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-[9px] font-bold">
                                {cat}
                              </span>
                            ))}
                            {report.customCategory && (
                              <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-[9px] font-bold">
                                {report.customCategory}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {report.imageUrl && (
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <span className="block text-gray-400 font-bold text-[10px] mb-2">Foto Bukti</span>
                          <div 
                            className="rounded-lg overflow-hidden border border-gray-100 cursor-pointer relative group/img aspect-video bg-black"
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(getOptimizedUrl(report.imageUrl)); }}
                          >
                            <img src={getOptimizedUrl(report.imageUrl)} alt="Bukti laporan" className="w-full h-full object-contain opacity-90 group-hover/img:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                              <i className="fa-solid fa-expand text-white text-xl"></i>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-3 bg-white border-t border-gray-100 flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteApproved(report); }}
                        disabled={isProcessingId === report.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-trash-can"></i> {isProcessingId === report.id ? 'Menghapus...' : 'Hapus'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(report); }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-pen-to-square"></i> Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Modal Edit Laporan */}
      {editingReport && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4" onClick={() => setEditingReport(null)}>
          <div className="bg-white w-full max-w-md md:max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
              <h3 className="font-extrabold text-gray-800 text-sm">Edit Laporan</h3>
              <button onClick={() => setEditingReport(null)} className="w-8 h-8 bg-red-50 hover:bg-red-100 rounded-full text-red-500 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            
                        <div className="p-5 space-y-3 overflow-y-auto flex-1">
              
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Cabor / Pelapor</label>
                  <div className="flex h-[34px] items-center">
                    <div className="relative px-3 py-1.5 border rounded-lg text-xs font-bold whitespace-nowrap shadow-md overflow-hidden bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 text-yellow-950 border-yellow-300 ring-2 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer"></div>
                      <span className="relative z-10 flex items-center gap-1.5"><i className="fa-solid text-[10px] fa-crown text-yellow-800"></i>
                        {editCaborName || 'Tanpa Cabor'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Nama Pelapor</label>
                  <input 
                    type="text" 
                    value={editReporterName} 
                    onChange={e => setEditReporterName(e.target.value)} 
                    placeholder="Nama Lengkap"
                    className="w-full h-[34px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
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
                    value={editLocation} 
                    onChange={e => { setEditLocation(e.target.value); setShowLocationDropdown(true); }}
                    placeholder="Cari Kota..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all cursor-text pointer-events-auto" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLocationDropdown(true);
                    }}
                  />
                  <div className="absolute right-0 inset-y-0 flex items-center px-3 cursor-pointer">
                    <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`}></i>
                  </div>
                </div>
                
                {showLocationDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto overscroll-contain">
                    {cities.filter(c => c.toLowerCase().includes(editLocation.toLowerCase())).map(city => (
                      <div 
                        key={city} 
                        onClick={() => { setEditLocation(city); setShowLocationDropdown(false); }}
                        className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                          editLocation === city ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {city}
                      </div>
                    ))}
                    {cities.filter(c => c.toLowerCase().includes(editLocation.toLowerCase())).length === 0 && (
                       <div className="px-3 py-3 text-xs font-semibold text-gray-400 text-center">Tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Waktu Kejadian</label>
                <DatePicker 
                  date={editIncidentTime || null} 
                  onChange={(dateStr) => setEditIncidentTime(dateStr || '')} 
                  placeholder="Pilih Tanggal Kejadian"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Lokasi Detail</label>
                <input 
                  type="text" 
                  value={editSpecificLocation} 
                  onChange={e => setEditSpecificLocation(e.target.value)} 
                  placeholder="Contoh: GOR Manahan"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                />
              </div>

              <div className="relative" ref={categoryInputRef}>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Jenis Laporan <span className="text-gray-400 font-medium">(Bisa pilih lebih dari satu)</span></label>
                
                {editCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editCategories.map(cat => (
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
                          editCategories.includes(cat) ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {cat}
                        {editCategories.includes(cat) && <i className="fa-solid fa-check text-blue-500"></i>}
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
                      value={editCustomCategory} 
                      onChange={e => setEditCustomCategory(e.target.value)} 
                      placeholder="Ketik spesifik jenis laporannya..."
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Judul Laporan</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                  placeholder="Contoh: Indikasi Kecurangan Wasit"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Deskripsi Kejadian</label>
                <textarea 
                  value={editDescription} 
                  onChange={e => setEditDescription(e.target.value)} 
                  placeholder="Ceritakan detail kejadian secara lengkap..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all resize-none overflow-hidden" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1 ml-1">Foto Bukti <span className="text-gray-400 font-medium">(Opsional)</span></label>
                <div className="relative h-32 rounded-lg overflow-hidden bg-gray-50 border-2 border-dashed border-gray-300 hover:bg-gray-100 transition-colors flex items-center justify-center group cursor-pointer">
                  {(editImagePreview || editingReport.imageUrl) ? (
                    <img src={editImagePreview || getOptimizedUrl(editingReport.imageUrl, 400)} className="w-full h-full object-contain" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className="fa-solid fa-camera text-2xl mb-2"></i>
                      <span className="text-[10px] font-semibold">Ketuk untuk foto</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={saveEdit} 
                disabled={isSavingEdit}
                className="w-full py-3 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSavingEdit ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : <i className="fa-solid fa-save"></i>}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
        , document.body)
      }
    </main>
  );
}
