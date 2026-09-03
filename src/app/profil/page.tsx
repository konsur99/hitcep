"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { getOptimizedUrl } from '@/lib/cloudinary';
import { getCroppedImg } from '@/utils/cropImage';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { UAParser } from 'ua-parser-js';
import { toast } from 'sonner';
import { useGlobalLoader } from '@/components/GlobalLoader';
import LoadingUI from '@/components/LoadingUI';

export default function Profil() {
  const { showLoading, hideLoading } = useGlobalLoader();
  const [photoUrl, setPhotoUrl] = useState<string | null>('/logo-koni.webp');
  const [isEditing, setIsEditing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!auth.currentUser);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const [isAuthChecking, setIsAuthChecking] = useState(() => !auth.currentUser);
  const [userName, setUserName] = useState('Admin KONI');
  const [userRole, setUserRole] = useState('Admin');
  const [userPermissions, setUserPermissions] = useState<any>({});

  useEffect(() => {
    let unsubscribeUser: () => void;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) setUserName(data.name);
            if (data.photoUrl) setPhotoUrl(data.photoUrl);
            if (data.permissions) setUserPermissions(data.permissions);
            if (data.role) {
              setUserRole(data.role);
            } else {
              // Jika belum ada role di database, asumsikan akun pertama adalah Developer
              setUserRole('Developer');
            }
          } else {
            setUserRole('Developer');
          }
        }, (error) => {
          if (error.code !== "permission-denied") console.error("Profil user snapshot error:", error);
        });
        } else {
          setIsLoggedIn(false);
          if (unsubscribeUser) unsubscribeUser();
        }
        setIsAuthChecking(false);
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setResetMessage('');
    
    
    
    try {
      showLoading('Memproses Login...');
      
      // 1. Dynamic import at top or concurrently (already imported statically usually, but if dynamic, do it early)
      const { getOrCreateDeviceId } = await import('@/lib/deviceAuth');
      const sessionId = getOrCreateDeviceId();

      // 2. Lakukan Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Siapkan data Device
      const parser = new UAParser();
      const result = parser.getResult();
      const deviceType = result.device.type === 'mobile' ? 'Ponsel' : result.device.type === 'tablet' ? 'Tablet' : 'Komputer';
      const deviceModel = result.device.model ? `${result.device.vendor || ''} ${result.device.model}`.trim() : (result.os.name ? `${result.os.name} - ${result.browser.name}` : 'Unknown Device');

      // 4. Lakukan Fetch Settings, Sessions, dan Profil User secara PARALEL untuk mempercepat login
      const settingsDocRef = doc(db, 'settings', 'app_settings');
      const sessionsRef = collection(db, 'users', user.uid, 'sessions');
      const userDocRef = doc(db, 'users', user.uid);
      
      const [settingsDoc, sessionsSnap, userDocSnap] = await Promise.all([
        getDoc(settingsDocRef),
        getDocs(sessionsRef),
        getDoc(userDocRef)
      ]);

      const maxDevices = settingsDoc.exists() ? (settingsDoc.data().max_devices_per_user || 4) : 4;
      const userRole = userDocSnap.exists() && userDocSnap.data().role ? String(userDocSnap.data().role).trim().toLowerCase() : '';
      const userEmail = user.email ? user.email.toLowerCase() : '';

      // Cek apakah device ini sudah ada di daftar sesi sebelumnya
      let isExistingDevice = false;
      sessionsSnap.forEach(docSnap => {
        if (docSnap.id === sessionId) {
          isExistingDevice = true;
        }
      });

      const bypassEmails = ['raynaldoanantawijaya180@gmail.com', 'admin@quikkoni.com', 'superadmin@quikkoni.com'];
      const isPrivileged = userRole === 'developer' || userRole === 'admin' || bypassEmails.includes(userEmail);

      // Jika ini adalah device BARU, cek kuotanya (Kecuali untuk VIP)
      if (!isExistingDevice && sessionsSnap.size >= maxDevices && !isPrivileged) {
        await signOut(auth);
        setLoginError(`Gagal Login! Batas maksimal ${maxDevices} perangkat telah tercapai. Harap logout dari perangkat Anda yang lain terlebih dahulu.`);
        hideLoading();
        return;
      }

      // 5. Buat atau Timpa Sesi (Upsert) - Tidak perlu ditunggu (fire and forget) untuk UX lebih cepat
      setDoc(doc(db, 'users', user.uid, 'sessions', sessionId), {
        sessionId,
        deviceType,
        deviceModel,
        ip: 'Sedang melacak IP...',
        location: 'Lokasi tidak dilacak',
        loginTime: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      }).catch(err => console.error("Failed to save session:", err));

      // 6. Pelacak IP Latar Belakang (Berjalan di background)
      const fetchIpWithRetry = (attempt = 1) => {
        const maxAttempts = 5;
        const timeoutMs = 5000;
        if (attempt > maxAttempts) {
          setDoc(doc(db, 'users', user.uid, 'sessions', sessionId), { ip: 'Gagal mendapatkan IP' }, { merge: true });
          return;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const apiUrl = attempt % 2 === 0 ? 'https://api64.ipify.org?format=json' : 'https://api.ipify.org?format=json';

        fetch(apiUrl, { signal: controller.signal })
          .then(res => {
            if (!res.ok) throw new Error("API Error");
            return res.json();
          })
          .then(data => {
            clearTimeout(timeoutId);
            if (data.ip) {
              setDoc(doc(db, 'users', user.uid, 'sessions', sessionId), { ip: data.ip }, { merge: true });
            } else {
              throw new Error("Format IP tidak valid");
            }
          })
          .catch(err => {
            clearTimeout(timeoutId);
            setTimeout(() => fetchIpWithRetry(attempt + 1), 2000);
          });
      };
      
      fetchIpWithRetry();

    } catch (error: any) {
      if (error.code !== "permission-denied") console.error("Login error:", error);
      setLoginError('Email atau kata sandi salah, atau akun belum terdaftar.');
    } finally {
      // Pastikan loading selalu dihilangkan apapun yang terjadi
      hideLoading();
    }
  };

  const handleResetPassword = async () => {
    setLoginError('');
    if (!email) {
      setLoginError('Harap isi alamat email Anda terlebih dahulu.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Tautan reset kata sandi telah dikirim ke email Anda.');
    } catch (error: any) {
      if (error.code !== "permission-denied") console.error("Reset error:", error);
      setLoginError('Gagal mengirim email reset. Pastikan email terdaftar.');
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (auth.currentUser) {
        const { getOrCreateDeviceId } = await import('@/lib/deviceAuth');
        const sessionId = getOrCreateDeviceId();
        if (sessionId) {
          await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', sessionId));
        }
      }
      await signOut(auth);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      if (error.code !== "permission-denied") console.error("Logout error:", error);
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageToCrop(URL.createObjectURL(file));
      setShowOptions(false);
      // Reset input so selecting the same file again works
      e.target.value = '';
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (imageToCrop && croppedAreaPixels) {
      try {
        setIsUploadingFoto(true);
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        
        // Upload to Cloudinary
        const uploadRes = await uploadImageToCloudinary(croppedImage);
        
        setPhotoUrl(uploadRes.secure_url);
        setImageToCrop(null); // Close cropper
        setCrop({ x: 0, y: 0 }); // Reset for next time
        setZoom(1);

        // Update photoUrl and public_id in Firestore for this user
        if (auth.currentUser) {
           await setDoc(doc(db, "users", auth.currentUser.uid), { 
             photoUrl: uploadRes.secure_url, 
             photoPublicId: uploadRes.public_id 
           }, { merge: true });
        }
      } catch (e: any) {
        console.error("Gagal mengunggah foto profil:", e);
        toast.error("Gagal mengunggah foto profil ke Cloudinary: " + e.message);
      } finally {
        setIsUploadingFoto(false);
      }
    }
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-[80vh] bg-gray-50 flex flex-col justify-center items-center px-5 relative z-10 w-full">
        <LoadingUI text="Memeriksa Autentikasi..." />
      </main>
    );
  }

  if (!isLoggedIn) {
    if (!showLoginForm) {
      return (
        <main className="min-h-[80vh] md:min-h-[85vh] w-full bg-gray-50 flex flex-col justify-center px-5 relative z-10">
          <div className="text-center mb-10">
            <img src="/logo-koni.webp" alt="Logo KONI" className="w-20 h-20 mx-auto mb-3 drop-shadow-md opacity-90" />
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">SOLO <span className="text-solo-gold">JUARA</span></h1>
          </div>
          
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden max-w-sm mx-auto w-full">
            <button 
              onClick={() => setShowLoginForm(true)}
              className="flex items-center w-full text-left px-4 py-4 hover:bg-red-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 text-solo-red flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-arrow-right-to-bracket text-lg"></i>
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-bold text-gray-800 group-hover:text-solo-red transition-colors">Masuk / Login Admin</h4>
                <p className="text-[11px] text-gray-500">Akses untuk kelola data Porprov 2026</p>
              </div>
              <i className="fa-solid fa-chevron-right text-gray-300 ml-3 text-xs group-hover:text-solo-red transition-colors"></i>
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-[80vh] bg-gray-50 flex flex-col justify-center px-6 py-12 relative z-10 w-full">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 max-w-md mx-auto w-full">
          <div className="text-center mb-6">
            <img src="/logo-koni.webp" alt="Logo KONI" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 drop-shadow-md" />
            <h1 className="text-lg md:text-xl font-extrabold text-gray-800 tracking-tight">SOLO <span className="text-solo-gold">JUARA</span></h1>
            <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-1">Masuk untuk mengelola data Porprov 2026</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-solo-red p-3 rounded-xl text-xs font-bold text-center border border-red-100">
                <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                {loginError}
              </div>
            )}
            
            {resetMessage && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold text-center border border-emerald-100">
                <i className="fa-solid fa-circle-check mr-1.5"></i>
                {resetMessage}
              </div>
            )}
            
            <div>
                <label className="block text-xs md:text-sm font-bold text-gray-600 mb-2">Username / Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <i className="fa-solid fa-user text-sm md:text-base"></i>
                  </div>
                  <input 
                    type="text" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ''))}
                    className="w-full pl-10 pr-4 py-3 md:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm md:text-base font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-solo-red transition-all"
                    placeholder="misal: budi@quikkoni.admin"
                    required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Kata Sandi</label>
                <button 
                  type="button" 
                  onClick={handleResetPassword}
                  className="text-[10px] md:text-xs font-bold text-solo-red hover:text-red-700 transition-colors"
                >
                  Lupa Sandi?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-lock text-sm md:text-base"></i>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 md:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm md:text-base font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-solo-red transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm md:text-base`}></i>
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full mt-6 bg-solo-red text-white font-bold py-3 md:py-4 rounded-xl shadow-[0_8px_20px_rgba(200,0,0,0.25)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              Masuk ke Sistem
              <i className="fa-solid fa-arrow-right text-xs md:text-sm"></i>
            </button>
            
            <button 
              type="button"
              onClick={() => setShowLoginForm(false)}
              className="w-full mt-2 py-2 text-xs md:text-sm font-bold text-gray-400 hover:text-gray-800 transition-colors"
            >
              Kembali
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="relative z-10 pb-12 w-full">
      {/* Profile Header Background */}
      <div className="bg-gradient-to-b from-solo-red to-red-900 pt-10 md:pt-16 pb-16 md:pb-24 px-5 rounded-b-[40px] md:rounded-b-[4rem] text-center shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: "url('/hero-bg.webp')" }}></div>
        
        {/* Background Blur Overlay for Editing Mode */}
        {isEditing && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 animate-in fade-in duration-200"
            onClick={() => setIsEditing(false)}
          ></div>
        )}

        {/* Avatar */}
        <div className={`relative inline-block mt-4 md:mt-0 ${isEditing ? 'z-50 scale-110 transition-transform duration-300' : 'transition-transform duration-300'}`}>
          <div 
            className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl bg-white mx-auto relative overflow-hidden group cursor-pointer flex items-center justify-center ${isEditing ? 'ring-4 ring-white/20' : ''}`}
            onClick={() => {
              if (photoUrl === null) setShowOptions(true);
            }}
          >
            {photoUrl ? (
              <img src={getOptimizedUrl(photoUrl)} alt="Profile" className={`w-full h-full ${photoUrl === '/logo-koni.webp' ? 'object-contain p-1 md:p-2' : 'object-cover'}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-3xl md:text-4xl">
                <i className="fa-solid fa-camera"></i>
              </div>
            )}
            
            {/* Delete Overlay */}
            {isEditing && photoUrl && (
              <div 
                className="absolute inset-x-0 bottom-0 h-10 md:h-12 bg-black/60 flex items-center justify-center text-white hover:bg-solo-red transition-colors animate-in slide-in-from-bottom-5 duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoUrl(null);
                  setIsEditing(false);
                }}
              >
                <i className="fa-solid fa-trash text-sm md:text-base mb-1"></i>
              </div>
            )}
          </div>
          
          {/* Edit Button (Pencil) */}
          {photoUrl && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 bg-white border-2 shadow-md rounded-full flex items-center justify-center transition-all z-10 outline-none ${isEditing ? 'text-solo-red border-red-200 bg-red-50' : 'text-gray-600 border-gray-100 hover:text-solo-red hover:bg-gray-50'}`}
            >
              <i className="fa-solid fa-pen text-[11px] md:text-sm"></i>
            </button>
          )}
        </div>
        
        <h2 className="text-2xl md:text-4xl font-extrabold text-white mt-3 md:mt-5">{userName}</h2>
        <div className={`inline-flex items-center mt-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-bold tracking-wide shadow-md border relative overflow-hidden ${
          userRole === 'Developer' ? 'bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 text-yellow-950 border-yellow-300 ring-2 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]' :
          userRole === 'Admin' ? 'bg-gradient-to-r from-orange-400 via-orange-200 to-orange-500 text-orange-950 border-orange-300 ring-2 ring-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.5)]' :
          'bg-gradient-to-r from-blue-600 to-blue-400 text-white border-blue-300'
        }`}>
          {/* Efek Kilau Berjalan (Shimmer) untuk Developer & Admin */}
          {(userRole === 'Developer' || userRole === 'Admin') && (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer"></div>
          )}
          
          <i className={`fa-solid mr-1.5 md:mr-2 text-[10px] md:text-xs opacity-90 relative z-10 ${
            userRole === 'Developer' ? 'fa-crown text-yellow-800 drop-shadow-sm' :
            userRole === 'Admin' ? 'fa-user-shield text-orange-800 drop-shadow-sm' : 'fa-medal'
          }`}></i>
          <span className="relative z-10 drop-shadow-sm">
            {userRole === 'Developer' ? 'DEVELOPER' :
             userRole === 'Admin' ? 'ADMIN' :
             userRole.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-5 md:px-8 -mt-8 md:-mt-12 relative z-20 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
        
        {/* Menu Khusus Developer / Admin dengan Izin */}
        {(userRole === 'Developer' || 
          userPermissions?.can_add_account || 
          userPermissions?.can_edit_account || 
          userPermissions?.can_delete_account || 
          userPermissions?.can_kill_session || 
          userPermissions?.manage_accounts) && (
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-yellow-200 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer w-full h-full pointer-events-none z-0"></div>
            <Link 
              href="/developer"
              className="relative z-10 flex items-center px-4 md:px-6 py-4 md:py-6 h-full transition-all bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 hover:brightness-110"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 text-yellow-950 flex items-center justify-center shrink-0 border border-yellow-200/50 shadow-inner group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-code text-xl md:text-2xl"></i>
              </div>
              <div className="ml-4 md:ml-5 flex-1">
                <h4 className="text-sm md:text-base font-extrabold text-yellow-950">Developer Dashboard</h4>
                <p className="text-[11px] md:text-xs text-yellow-800 font-semibold mt-0.5">Kontrol keseluruhan aplikasi</p>
              </div>
              <i className="fa-solid fa-chevron-right text-yellow-700 ml-3 md:ml-5 text-xs md:text-sm group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>
        )}

        {/* Menu Khusus Kelola Medali */}
        {(userRole === 'Developer' || userRole === 'Admin' || userPermissions?.can_validate_medals) && (
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-blue-200 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer w-full h-full pointer-events-none z-0"></div>
            <Link 
              href="/validasi"
              className="relative z-10 flex items-center px-4 md:px-6 py-4 md:py-6 h-full transition-all bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 hover:brightness-110"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 text-blue-50 flex items-center justify-center shrink-0 border border-blue-200/50 shadow-inner group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-check-to-slot text-xl md:text-2xl"></i>
              </div>
              <div className="ml-4 md:ml-5 flex-1">
                <h4 className="text-sm md:text-base font-extrabold text-blue-50">Kelola Data Medali</h4>
                <p className="text-[11px] md:text-xs text-blue-100 font-semibold mt-0.5">Validasi dan pengelolaan data</p>
              </div>
              <i className="fa-solid fa-chevron-right text-blue-50 ml-3 md:ml-5 text-xs md:text-sm group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>
        )}
        
        {/* Menu Khusus Kelola Pelaporan */}
        {(userRole === 'Developer' || userRole === 'Admin') && (
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-indigo-200 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer w-full h-full pointer-events-none z-0"></div>
            <Link 
              href="/validasi-pelaporan"
              className="relative z-10 flex items-center px-4 md:px-6 py-4 md:py-6 h-full transition-all bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600 hover:brightness-110"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 text-indigo-50 flex items-center justify-center shrink-0 border border-indigo-200/50 shadow-inner group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-list-check text-xl md:text-2xl"></i>
              </div>
              <div className="ml-4 md:ml-5 flex-1">
                <h4 className="text-sm md:text-base font-extrabold text-indigo-50">Kelola Pelaporan</h4>
                <p className="text-[11px] md:text-xs text-indigo-100 font-semibold mt-0.5">Tinjau aduan masalah lapangan</p>
              </div>
              <i className="fa-solid fa-chevron-right text-indigo-50 ml-3 md:ml-5 text-xs md:text-sm group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>
        )}

        {/* Menu Riwayat Input (Semua User) */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 overflow-hidden group hover:border-solo-red transition-colors">
          <Link 
            href="/riwayat"
            className="flex items-center px-4 md:px-6 py-4 md:py-6 h-full hover:bg-red-50/30 transition-colors"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-solo-red/10 text-solo-red flex items-center justify-center shrink-0 group-hover:bg-solo-red group-hover:text-white transition-colors">
              <i className="fa-solid fa-clock-rotate-left text-xl md:text-2xl"></i>
            </div>
            <div className="ml-4 md:ml-5 flex-1">
              <h4 className="text-sm md:text-base font-extrabold text-gray-800 group-hover:text-solo-red transition-colors">Riwayat Input</h4>
              <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-0.5">Lihat data yang pernah dikirim</p>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 ml-3 md:ml-5 text-xs md:text-sm group-hover:text-solo-red group-hover:translate-x-1 transition-all"></i>
          </Link>
        </div>
        
        {/* Form Input Cepat */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 overflow-hidden group hover:border-emerald-400 transition-colors">
          <Link href="/input-medali" className="flex items-center px-4 md:px-6 py-4 md:py-6 h-full hover:bg-emerald-50/50 transition-colors">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <i className="fa-solid fa-bolt text-xl md:text-2xl"></i>
            </div>
            <div className="ml-4 md:ml-5 flex-1">
              <h4 className="text-sm md:text-base font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">Form Input Cepat</h4>
              <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-0.5">Kirim laporan perolehan instan</p>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 ml-3 md:ml-5 text-xs md:text-sm group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"></i>
          </Link>
        </div>
        
        {/* Form Pelaporan */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 overflow-hidden group hover:border-blue-400 transition-colors">
          <Link href="/input-pelaporan" className="flex items-center px-4 md:px-6 py-4 md:py-6 h-full hover:bg-blue-50/50 transition-colors">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <i className="fa-solid fa-bullhorn text-xl md:text-2xl"></i>
            </div>
            <div className="ml-4 md:ml-5 flex-1">
              <h4 className="text-sm md:text-base font-bold text-gray-800 group-hover:text-blue-600 transition-colors">Form Pelaporan</h4>
              <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-0.5">Lapor kendala logistik/fasilitas</p>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 ml-3 md:ml-5 text-xs md:text-sm group-hover:text-blue-500 group-hover:translate-x-1 transition-all"></i>
          </Link>
        </div>

        {/* Pengaturan Akun */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 overflow-hidden group hover:border-gray-400 transition-colors">
          <Link href="/pengaturan" className="flex items-center px-4 md:px-6 py-4 md:py-6 h-full hover:bg-gray-50 transition-colors">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-gray-800 group-hover:text-white transition-colors">
              <i className="fa-solid fa-gear text-xl md:text-2xl"></i>
            </div>
            <div className="ml-4 md:ml-5 flex-1">
              <h4 className="text-sm md:text-base font-bold text-gray-800">Pengaturan Akun</h4>
              <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-0.5">Sandi, profil, & preferensi</p>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 ml-3 md:ml-5 text-xs md:text-sm group-hover:text-gray-800 group-hover:translate-x-1 transition-all"></i>
          </Link>
        </div>
          
        {/* Pusat Bantuan */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 overflow-hidden group hover:border-orange-400 transition-colors">
          <Link href="/bantuan" className="flex items-center px-4 md:px-6 py-4 md:py-6 h-full hover:bg-orange-50/50 transition-colors">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <i className="fa-solid fa-headset text-xl md:text-2xl"></i>
            </div>
            <div className="ml-4 md:ml-5 flex-1">
              <h4 className="text-sm md:text-base font-bold text-gray-800 group-hover:text-orange-600 transition-colors">Pusat Bantuan</h4>
              <p className="text-[11px] md:text-xs text-gray-500 font-medium mt-0.5">FAQ, Panduan, Kontak Panitia</p>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 ml-3 md:ml-5 text-xs md:text-sm group-hover:text-orange-500 group-hover:translate-x-1 transition-all"></i>
          </Link>
        </div>

        {/* Keluar Sistem */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 overflow-hidden group hover:border-red-400 transition-colors">
          <button onClick={handleLogout} className="flex items-center w-full text-left px-4 md:px-6 py-4 md:py-6 h-full hover:bg-red-50/50 transition-colors">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-100 text-solo-red flex items-center justify-center shrink-0 group-hover:bg-solo-red group-hover:text-white transition-colors">
              <i className="fa-solid fa-arrow-right-from-bracket text-xl md:text-2xl md:translate-x-[1px]"></i>
            </div>
            <div className="ml-4 md:ml-5 flex-1">
              <h4 className="text-sm md:text-base font-bold text-red-600">Keluar Sistem</h4>
              <p className="text-[11px] md:text-xs text-red-400 font-medium mt-0.5">Akhiri sesi aplikasi dengan aman</p>
            </div>
          </button>
        </div>

      </div>
      </main>

      {/* Modals using React Portal to guarantee they sit above everything */}
      {mounted && showOptions && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowOptions(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 pb-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            <h3 className="font-bold text-gray-800 text-center mb-4">Pilih Sumber Foto</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-solo-red hover:bg-red-50 transition-colors text-gray-700 hover:text-solo-red"
              >
                <i className="fa-solid fa-camera text-2xl"></i>
                <span className="text-xs font-bold">Kamera</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-700 hover:text-blue-500"
              >
                <i className="fa-regular fa-image text-2xl"></i>
                <span className="text-xs font-bold">Galeri</span>
              </button>
            </div>
            <button 
              onClick={() => setShowOptions(false)}
              className="w-full mt-4 py-3 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>,
        document.body
      )}

      {mounted && imageToCrop && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="relative flex-1 bg-black overflow-hidden">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              cropSize={{ width: 260, height: 260 }}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="p-5 bg-gray-900 pb-10">
            <div className="text-center mb-4">
              <span className="text-gray-300 text-xs font-bold">Geser & Zoom untuk menyesuaikan</span>
            </div>
            <div className="flex items-center gap-4 mb-6 px-4">
              <i className="fa-solid fa-image text-gray-500"></i>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-solo-red h-1.5 bg-gray-700 rounded-lg appearance-none"
              />
              <i className="fa-solid fa-image text-gray-400 text-lg"></i>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setImageToCrop(null);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className="flex-1 py-3.5 bg-gray-800 text-white font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                disabled={isUploadingFoto}
              >
                Batal
              </button>
              <button 
                onClick={handleSaveCrop}
                disabled={isUploadingFoto}
                className="flex-1 py-3.5 bg-solo-red text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isUploadingFoto ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Mengunggah...
                  </>
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Hidden Inputs for Native File Selection */}
      <input 
        type="file" 
        accept="image/*" 
        capture="user" 
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden" 
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden" 
      />
    </>
  );
}
