"use client";

import { useState, useEffect } from 'react';
import { useGlobalLoader } from '@/components/GlobalLoader';
import LoadingUI from '@/components/LoadingUI';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, writeBatch, increment, query, where, runTransaction } from 'firebase/firestore';
import { convertFileToWebP } from '@/utils/imageOptimization';
import { uploadImageToCloudinary, getOptimizedUrl } from '@/lib/cloudinary';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ConfirmDialog';

export default function ValidasiMedali() {
  const router = useRouter();
    const { showLoading, hideLoading } = useGlobalLoader();
  const { confirm } = useConfirmDialog();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [medals, setMedals] = useState<any[]>([]);
  const [cabors, setCabors] = useState<any>({});
  const [athletes, setAthletes] = useState<any[]>([]);
  
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Edit State
  const [editingMedal, setEditingMedal] = useState<any | null>(null);
  const [editAthleteName, setEditAthleteName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMedalType, setEditMedalType] = useState('emas');
  const [editCaborId, setEditCaborId] = useState('');
  const [editDate, setEditDate] = useState('');
  
  const [isCaborDropdownOpen, setIsCaborDropdownOpen] = useState(false);
  const [caborSearchQuery, setCaborSearchQuery] = useState('');
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  const [isAthleteDropdownOpen, setIsAthleteDropdownOpen] = useState(false);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState('');
  const [editPortraitPreview, setEditPortraitPreview] = useState<string | null>(null);
  const [editCeremonyPreview, setEditCeremonyPreview] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
          // Just fetch data if needed, but we do that in the next useEffect anyway.
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
        const [caborsSnap, medalsSnap] = await Promise.all([
          getDocs(collection(db, "cabors")),
          getDocs(collection(db, "medals"))
        ]);
        
        const cDict: any = {};
        caborsSnap.forEach(doc => { cDict[doc.id] = doc.data().name; });
        setCabors(cDict);
        
        const mData: any[] = [];
        medalsSnap.forEach(doc => {
          mData.push({ id: doc.id, ...(doc.data() as any) });
        });
        
        mData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });
        
        setMedals(mData);
      } catch (error) {
        console.error(error);
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
    if (!editCaborId) {
      setAthletes([]);
      return;
    }
    const q = query(collection(db, "athletes"), where("caborId", "==", editCaborId));
    getDocs(q).then((snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }).catch(error => console.error(error));
  }, [editCaborId]);

  useEffect(() => {
    if (editingMedal || lightboxImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [editingMedal, lightboxImage]);

  const handleDeleteApproved = async (medal: any) => {
    if (isProcessingId) return;
    const isConfirmed = await confirm({
      title: 'Hapus Medali',
      message: 'PERHATIAN: Menghapus medali ini akan MENGURANGI poin klasemen Cabor. Lanjutkan?',
      danger: true
    });
    if (!isConfirmed) return;
    
    setIsProcessingId(medal.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (medal.portraitPublicId) {
        await fetch('/api/delete-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: medal.portraitPublicId }) }).catch(console.error);
      }
      if (medal.ceremonyPublicId) {
        await fetch('/api/delete-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: medal.ceremonyPublicId }) }).catch(console.error);
      }
      
      await runTransaction(db, async (transaction) => {
        // 1. READS
        const medalField = medal.medalType === 'emas' ? 'gold' : medal.medalType === 'perak' ? 'silver' : 'bronze';
        const caborRef = doc(db, "cabors", medal.caborId);
        const caborDoc = await transaction.get(caborRef);
        
        const cacheRef = doc(db, "public_cache", "v1");
        const cacheDoc = await transaction.get(cacheRef);

        // 2. WRITES
        const medalRef = doc(db, "medals", medal.id);
        transaction.delete(medalRef);
        
        if (caborDoc.exists()) {
          const cData = caborDoc.data();
          transaction.update(caborRef, { [medalField]: Math.max(0, (cData[medalField] || 0) - 1) });
        }
        
        if (cacheDoc.exists()) {
          const cacheData = cacheDoc.data();
          cacheData.medals = (cacheData.medals || []).filter((m: any) => m.id !== medal.id);
          
          cacheData.cabors = cacheData.cabors || [];
          const cacheCabor = cacheData.cabors.find((c: any) => c.id === medal.caborId);
          if (cacheCabor) {
            cacheCabor[medalField] = Math.max(0, (cacheCabor[medalField] || 0) - 1);
          }
          
          transaction.update(cacheRef, { 
            medals: cacheData.medals,
            cabors: cacheData.cabors
          });
        }
      });
      } catch (e: any) {
        toast.error("Gagal menghapus: " + e.message);
      } finally {
        fetch('/api/revalidate', { method: 'POST' }).then(() => setRefreshTrigger(prev => prev + 1)).catch(e => console.error(e));
        setIsProcessingId(null);
        hideLoading();
      }
  };

  const openEditModal = (medal: any) => {
    setEditingMedal(medal);
    setEditAthleteName(medal.athleteName || '');
    setEditCategory(medal.category || '');
    setEditMedalType(medal.medalType || 'emas');
    setEditCaborId(medal.caborId || '');
    setEditDate(medal.date || '');
    setIsCaborDropdownOpen(false);
    setCaborSearchQuery('');
    setIsCategoryDropdownOpen(false);
    setCategorySearchQuery('');
    setIsAthleteDropdownOpen(false);
    setAthleteSearchQuery('');
    setEditPortraitPreview(null);
    setEditCeremonyPreview(null);
  };

  const handlePortraitChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const webpData = await convertFileToWebP(e.target.files[0], 0.8, 512);
        setEditPortraitPreview(webpData);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCeremonyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const webpData = await convertFileToWebP(e.target.files[0], 0.8, 1024);
        setEditCeremonyPreview(webpData);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const saveEdit = async () => {
    if (!editingMedal) return;
    setIsSavingEdit(true);
    
    try {
      showLoading('Menyimpan Perubahan Medali...');
      let finalPortraitUrl = editingMedal.portraitUrl;
      let finalPortraitPublicId = editingMedal.portraitPublicId;
      let finalCeremonyUrl = editingMedal.ceremonyUrl;
      let finalCeremonyPublicId = editingMedal.ceremonyPublicId;

      if (editPortraitPreview) {
        const uploadRes = await uploadImageToCloudinary(editPortraitPreview);
        if (uploadRes) {
          finalPortraitUrl = uploadRes.secure_url;
          finalPortraitPublicId = uploadRes.public_id;
          if (editingMedal.portraitPublicId) {
            const token = await auth.currentUser?.getIdToken();
            await fetch('/api/delete-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: editingMedal.portraitPublicId }) }).catch(console.error);
          }
        }
      }

      if (editCeremonyPreview) {
        const uploadRes = await uploadImageToCloudinary(editCeremonyPreview);
        if (uploadRes) {
          finalCeremonyUrl = uploadRes.secure_url;
          finalCeremonyPublicId = uploadRes.public_id;
          if (editingMedal.ceremonyPublicId) {
            const token = await auth.currentUser?.getIdToken();
            await fetch('/api/delete-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: editingMedal.ceremonyPublicId }) }).catch(console.error);
          }
        }
      }

      await runTransaction(db, async (transaction) => {
        // 1. READS
        let pointsChanged = false;
        let oldField: string | null = null;
        let newField: string | null = null;
        let singleCaborDoc: any = null;
        let singleCaborRef: any = null;
        let oldCaborDoc: any = null;
        let oldCaborRef: any = null;
        let newCaborDoc: any = null;
        let newCaborRef: any = null;
        
        if (editingMedal.medalType !== editMedalType || editingMedal.caborId !== editCaborId) {
          pointsChanged = true;
          oldField = editingMedal.medalType === 'emas' ? 'gold' : editingMedal.medalType === 'perak' ? 'silver' : 'bronze';
          newField = editMedalType === 'emas' ? 'gold' : editMedalType === 'perak' ? 'silver' : 'bronze';
          
          if (editingMedal.caborId === editCaborId) {
            singleCaborRef = doc(db, "cabors", editingMedal.caborId);
            singleCaborDoc = await transaction.get(singleCaborRef);
          } else {
            oldCaborRef = doc(db, "cabors", editingMedal.caborId);
            newCaborRef = doc(db, "cabors", editCaborId);
            oldCaborDoc = await transaction.get(oldCaborRef);
            newCaborDoc = await transaction.get(newCaborRef);
          }
        }

        const cacheRef = doc(db, "public_cache", "v1");
        const cacheDoc = await transaction.get(cacheRef);

        // 2. WRITES
        const medalRef = doc(db, "medals", editingMedal.id);
        transaction.update(medalRef, {
          athleteName: editAthleteName,
          category: editCategory,
          medalType: editMedalType,
          caborId: editCaborId,
          date: editDate,
          portraitUrl: finalPortraitUrl,
          portraitPublicId: finalPortraitPublicId,
          ceremonyUrl: finalCeremonyUrl,
          ceremonyPublicId: finalCeremonyPublicId,
        });

        if (pointsChanged && oldField && newField) {
          if (singleCaborRef && singleCaborDoc?.exists()) {
            const cData = singleCaborDoc.data();
            transaction.update(singleCaborRef, { 
              [oldField]: Math.max(0, (cData[oldField] || 0) - 1), 
              [newField]: (cData[newField] || 0) + 1 
            });
          } else {
            if (oldCaborRef && oldCaborDoc?.exists()) {
              const cDataOld = oldCaborDoc.data();
              transaction.update(oldCaborRef, { [oldField]: Math.max(0, (cDataOld[oldField] || 0) - 1) });
            }
            if (newCaborRef && newCaborDoc?.exists()) {
              const cDataNew = newCaborDoc.data();
              transaction.update(newCaborRef, { [newField]: (cDataNew[newField] || 0) + 1 });
            }
          }
        }

        if (cacheDoc.exists()) {
          const cacheData = cacheDoc.data();
          cacheData.medals = cacheData.medals || [];
          const cacheMedal = cacheData.medals.find((m: any) => m.id === editingMedal.id);
          if (cacheMedal) {
            cacheMedal.athleteName = editAthleteName;
            cacheMedal.category = editCategory;
            cacheMedal.medalType = editMedalType;
            cacheMedal.caborId = editCaborId;
            cacheMedal.date = editDate;
            cacheMedal.portraitUrl = finalPortraitUrl;
            cacheMedal.portraitPublicId = finalPortraitPublicId;
            cacheMedal.ceremonyUrl = finalCeremonyUrl;
            cacheMedal.ceremonyPublicId = finalCeremonyPublicId;
          }

          if (pointsChanged && oldField && newField) {
            cacheData.cabors = cacheData.cabors || [];
            if (editingMedal.caborId === editCaborId) {
              const cacheCabor = cacheData.cabors.find((c: any) => c.id === editingMedal.caborId);
              if (cacheCabor) {
                cacheCabor[oldField] = Math.max(0, (cacheCabor[oldField] || 0) - 1);
                cacheCabor[newField] = (cacheCabor[newField] || 0) + 1;
              }
            } else {
              const cacheOldCabor = cacheData.cabors.find((c: any) => c.id === editingMedal.caborId);
              const cacheNewCabor = cacheData.cabors.find((c: any) => c.id === editCaborId);
              if (cacheOldCabor) cacheOldCabor[oldField] = Math.max(0, (cacheOldCabor[oldField] || 0) - 1);
              if (cacheNewCabor) cacheNewCabor[newField] = (cacheNewCabor[newField] || 0) + 1;
            }
          }
          
          transaction.update(cacheRef, { 
            medals: cacheData.medals,
            cabors: cacheData.cabors
          });
        }
      });
        setEditingMedal(null);
      } catch (e: any) {
        toast.error("Gagal menyimpan perubahan: " + e.message);
      } finally {
        fetch('/api/revalidate', { method: 'POST' }).then(() => setRefreshTrigger(prev => prev + 1)).catch(e => console.error(e));
        setIsSavingEdit(false);
      }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingUI text="Memeriksa Autentikasi..." />
      </div>
    );
  }




  const caborsArray = Object.keys(cabors).map(id => ({ id, name: cabors[id] as string })).sort((a, b) => a.name.localeCompare(b.name));
  const filteredCabors = caborsArray.filter(c => c.name.toLowerCase().includes(caborSearchQuery.toLowerCase()));

  const availableCategories = Array.from(new Set(athletes.map(a => a.matchCategory).filter(Boolean))) as string[];
  const filteredCategories = availableCategories.filter(c => c.toLowerCase().includes(categorySearchQuery.toLowerCase()));
  
  const filteredAthletes = athletes
    .filter(a => !editCategory || a.matchCategory === editCategory)
    .filter(a => a.name.toLowerCase().includes(athleteSearchQuery.toLowerCase()));

  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans selection:bg-blue-200">
      
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
          <img src={lightboxImage} alt="Fullscreen" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Header Premium Blue */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white rounded-b-3xl shadow-[0_10px_25px_-5px_rgba(29,78,216,0.4)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        
        <div className="px-5 pt-12 pb-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors">
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </button>
            <div className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full relative">
              <i className="fa-solid fa-medal text-sm"></i>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">Kelola Data Medali</h1>
          <p className="text-blue-200 text-xs font-medium">Kelola dan edit data medali.</p>
        </div>
      </div>

      <div className="px-5 mt-6 relative z-20 space-y-5 max-w-4xl mx-auto w-full">

        {/* List Usulan */}
        <div className="space-y-4">
          {medals.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <i className="fa-solid fa-folder-open text-3xl text-gray-300"></i>
              </div>
              <h3 className="text-gray-900 font-bold mb-1">Data Kosong</h3>
              <p className="text-xs text-gray-500">Tidak ada medali dalam daftar ini.</p>
            </div>
          ) : (
            medals.map(medal => (
              <div key={medal.id} className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden relative">
                
                {isProcessingId === medal.id && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                <div className="p-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    {/* Circle Photos */}
                    <div className="flex -space-x-3">
                      <div 
                        onClick={() => medal.portraitUrl && setLightboxImage(getOptimizedUrl(medal.portraitUrl, 1080))}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-200 shrink-0 relative cursor-pointer active:scale-95 transition-transform group"
                      >
                        {medal.portraitUrl ? (
                          <img src={getOptimizedUrl(medal.portraitUrl, 150)} alt="Potret" className="w-full h-full object-cover" />
                        ) : <i className="fa-solid fa-user text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                          <i className="fa-solid fa-magnifying-glass text-white opacity-0 group-hover:opacity-100 drop-shadow-md text-[10px]"></i>
                        </div>
                      </div>
                      <div 
                        onClick={() => medal.ceremonyUrl && setLightboxImage(getOptimizedUrl(medal.ceremonyUrl, 1080))}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-200 shrink-0 relative cursor-pointer active:scale-95 transition-transform group"
                      >
                        {medal.ceremonyUrl ? (
                          <img src={getOptimizedUrl(medal.ceremonyUrl, 150)} alt="UUP" className="w-full h-full object-cover" />
                        ) : <i className="fa-solid fa-image text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                          <i className="fa-solid fa-magnifying-glass text-white opacity-0 group-hover:opacity-100 drop-shadow-md text-[10px]"></i>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-gray-800 leading-tight truncate">{medal.athleteName || 'Tanpa Nama'}</h4>
                      <p className="text-[10px] text-gray-500 font-bold mt-0.5 truncate">{cabors[medal.caborId]} • {medal.category}</p>
                    </div>

                    <div className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black border uppercase ${
                      medal.medalType === 'emas' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      medal.medalType === 'perak' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                      'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {medal.medalType}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex bg-gray-50 p-2 gap-2">
                  <button 
                    onClick={() => handleDeleteApproved(medal)}
                    className="flex-1 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-[11px] rounded-lg transition-colors"
                  >
                    <i className="fa-solid fa-trash-can mr-1"></i> Hapus
                  </button>
                  <button 
                    onClick={() => openEditModal(medal)}
                    className="flex-1 py-2.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm font-bold text-[11px] rounded-lg transition-colors"
                  >
                    <i className="fa-solid fa-pen-to-square mr-1"></i> Edit Data
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Modal Edit Approved Medal */}
      {editingMedal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4" onClick={() => setEditingMedal(null)}>
          <div className="bg-white w-full max-w-md md:max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
              <h3 className="font-extrabold text-gray-800 text-sm">Edit Data Medali</h3>
              <button onClick={() => setEditingMedal(null)} className="w-8 h-8 bg-red-50 hover:bg-red-100 rounded-full text-red-500 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Cabang Olahraga */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Cabang Olahraga</label>
                <div className="relative">
                  <div 
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 cursor-pointer flex justify-between items-center transition-colors hover:bg-gray-100"
                    onClick={() => setIsCaborDropdownOpen(!isCaborDropdownOpen)}
                  >
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <i className="fa-solid fa-dharmachakra"></i>
                    </div>
                    <span className={`truncate ${editCaborId ? 'text-gray-800' : 'text-gray-400 font-medium'}`}>
                      {editCaborId ? (cabors[editCaborId] as string) : 'Pilih Cabor...'}
                    </span>
                    <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${isCaborDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </div>

                  {isCaborDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsCaborDropdownOpen(false)}></div>
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden">
                        <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                          <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                            <input 
                              type="text" 
                              placeholder="Cari Cabor..." 
                              className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                              value={caborSearchQuery}
                              onChange={(e) => setCaborSearchQuery(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        <ul className="max-h-[180px] overflow-y-auto">
                          {filteredCabors.length > 0 ? (
                            filteredCabors.map((c: any) => (
                              <li 
                                key={c.id} 
                                className={`px-4 py-2.5 text-xs cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${editCaborId === c.id ? 'font-bold text-blue-600 bg-blue-50' : 'font-medium text-gray-700'}`}
                                onClick={() => {
                                  setEditCaborId(c.id);
                                  setIsCaborDropdownOpen(false);
                                  setCaborSearchQuery('');
                                }}
                              >
                                {c.name}
                              </li>
                            ))
                          ) : (
                            <li className="px-4 py-4 text-[10px] text-center text-gray-400 font-medium">
                              Cabor tidak ditemukan
                            </li>
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kategori Lomba */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Kategori / Nomor Lomba</label>
                  <div className="relative">
                    <div 
                      className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 border ${!editCaborId ? 'border-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-200 cursor-pointer hover:bg-gray-100'} rounded-xl text-xs font-semibold text-gray-800 flex justify-between items-center transition-colors`}
                      onClick={() => editCaborId && setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    >
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <i className="fa-solid fa-list-ol"></i>
                      </div>
                      <span className={`truncate ${editCategory ? 'text-gray-800' : 'text-gray-400 font-medium'}`}>
                        {!editCaborId ? 'Pilih Cabor dulu...' : editCategory ? editCategory : 'Pilih Kategori...'}
                      </span>
                      <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </div>

                    {isCategoryDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)}></div>
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden">
                          <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                            <div className="relative">
                              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                              <input 
                                type="text" 
                                placeholder="Cari atau ketik baru..." 
                                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-medium focus:outline-none focus:border-blue-500 transition-all"
                                value={categorySearchQuery}
                                onChange={(e) => {
                                  setCategorySearchQuery(e.target.value);
                                  setEditCategory(e.target.value);
                                }}
                                autoFocus
                              />
                            </div>
                          </div>
                          <ul className="max-h-[180px] overflow-y-auto">
                            {filteredCategories.length > 0 ? (
                              filteredCategories.map((c, idx) => (
                                <li 
                                  key={idx} 
                                  className={`px-4 py-2.5 text-xs cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${editCategory === c ? 'font-bold text-blue-600 bg-blue-50' : 'font-medium text-gray-700'}`}
                                  onClick={() => {
                                    setEditCategory(c);
                                    setIsCategoryDropdownOpen(false);
                                    setCategorySearchQuery('');
                                  }}
                                >
                                  {c}
                                </li>
                              ))
                            ) : (
                              <li className="px-4 py-4 text-[10px] text-center text-gray-400 font-medium flex flex-col items-center">
                                {categorySearchQuery ? (
                                   <>
                                    <span className="text-gray-600 mb-1">Gunakan kategori baru:</span>
                                    <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded mt-1">{categorySearchQuery}</span>
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setEditCategory(categorySearchQuery);
                                        setIsCategoryDropdownOpen(false);
                                        setCategorySearchQuery('');
                                      }}
                                      className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                                    >
                                      Pilih Ini
                                    </button>
                                   </>
                                ) : (
                                   <>Ketik untuk buat baru.</>
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
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Nama Atlet / Tim</label>
                  <div className="relative">
                    <div 
                      className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 border ${!editCaborId ? 'border-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-200 cursor-pointer hover:bg-gray-100'} rounded-xl text-xs font-semibold text-gray-800 flex justify-between items-center transition-colors`}
                      onClick={() => editCaborId && setIsAthleteDropdownOpen(!isAthleteDropdownOpen)}
                    >
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <i className="fa-solid fa-user"></i>
                      </div>
                      <span className={`truncate ${editAthleteName ? 'text-gray-800' : 'text-gray-400 font-medium'}`}>
                        {!editCaborId ? 'Pilih Cabor dulu...' : editAthleteName ? editAthleteName : 'Pilih Atlet/Tim...'}
                      </span>
                      <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform ${isAthleteDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </div>

                    {isAthleteDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAthleteDropdownOpen(false)}></div>
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden">
                          <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                            <div className="relative">
                              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                              <input 
                                type="text" 
                                placeholder="Cari atau ketik baru..." 
                                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-medium focus:outline-none focus:border-blue-500 transition-all"
                                value={athleteSearchQuery}
                                onChange={(e) => {
                                  setAthleteSearchQuery(e.target.value);
                                  setEditAthleteName(e.target.value);
                                }}
                                autoFocus
                              />
                            </div>
                          </div>
                          <ul className="max-h-[180px] overflow-y-auto">
                            {filteredAthletes.length > 0 ? (
                              filteredAthletes.map((a) => (
                                <li 
                                  key={a.id} 
                                  className={`px-4 py-2.5 text-xs cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${editAthleteName === a.name ? 'font-bold text-blue-600 bg-blue-50' : 'font-medium text-gray-700'}`}
                                  onClick={() => {
                                    setEditAthleteName(a.name);
                                    if (a.matchCategory && !editCategory) {
                                      setEditCategory(a.matchCategory);
                                    }
                                    setIsAthleteDropdownOpen(false);
                                    setAthleteSearchQuery('');
                                  }}
                                >
                                  {a.name}
                                </li>
                              ))
                            ) : (
                              <li className="px-4 py-4 text-[10px] text-center text-gray-400 font-medium flex flex-col items-center">
                                {athleteSearchQuery ? (
                                   <>
                                    <span className="text-gray-600 mb-1">Gunakan nama baru:</span>
                                    <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded mt-1">{athleteSearchQuery}</span>
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setEditAthleteName(athleteSearchQuery);
                                        setIsAthleteDropdownOpen(false);
                                        setAthleteSearchQuery('');
                                      }}
                                      className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                                    >
                                      Pilih Ini
                                    </button>
                                   </>
                                ) : (
                                   <>Ketik untuk buat baru.</>
                                )}
                              </li>
                            )}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Jenis Medali</label>
                  <select 
                    value={editMedalType}
                    onChange={e => setEditMedalType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="emas">Emas</option>
                    <option value="perak">Perak</option>
                    <option value="perunggu">Perunggu</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Tanggal Perolehan</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={e => setEditDate(e.target.value)} 
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 text-center">Ganti Potret</label>
                  <div className="w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 relative group cursor-pointer mx-auto">
                    {(editPortraitPreview || editingMedal.portraitUrl) ? (
                      <img src={editPortraitPreview || getOptimizedUrl(editingMedal.portraitUrl, 400)} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <i className="fa-solid fa-plus mb-1"></i>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handlePortraitChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 text-center">Ganti Foto UUP</label>
                  <div className="w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 relative group cursor-pointer mx-auto">
                    {(editCeremonyPreview || editingMedal.ceremonyUrl) ? (
                      <img src={editCeremonyPreview || getOptimizedUrl(editingMedal.ceremonyUrl, 400)} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <i className="fa-solid fa-plus mb-1"></i>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleCeremonyChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
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
