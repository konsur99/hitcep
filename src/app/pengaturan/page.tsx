"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useGlobalLoader } from '@/components/GlobalLoader';
import LoadingUI from '@/components/LoadingUI';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import DatePicker from '@/components/DatePicker';
import { toast } from 'sonner';

export default function PengaturanAkun() {
  const router = useRouter();
    const { showLoading, hideLoading } = useGlobalLoader();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [name, setName] = useState('Admin KONI');
  const [birthDate, setBirthDate] = useState('1985-05-20');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('081234567890');
  const [role, setRole] = useState('Admin');
  const [maxDevices, setMaxDevices] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // router.replace('/profil'); // Handled by SessionGuard
      } else {
        setUserId(user.uid);
        if (user.email) setEmail(user.email);
        
        // Load existing profile from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        let currentRole = 'Admin';
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) setName(data.name);
          if (data.birthDate) setBirthDate(data.birthDate);
          if (data.phone) setPhone(data.phone);
          if (data.role) {
            currentRole = data.role;
            setRole(currentRole);
          }
        }
        
        if (currentRole === 'Developer') {
          const settingsRef = doc(db, 'settings', 'app_settings');
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            setMaxDevices(settingsSnap.data().max_devices_per_user || 4);
          }
        }
        
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", userId), {
        name,
        birthDate,
        phone,
        role,
        email // Keep email in sync just in case
      }, { merge: true });
      
      if (role === 'Developer') {
        await setDoc(doc(db, "settings", "app_settings"), {
          max_devices_per_user: maxDevices
        }, { merge: true });
      }
      
      toast.success("Pengaturan berhasil disimpan!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Terjadi kesalahan saat menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return;
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Link reset password telah dikirim ke email Anda. Silakan cek kotak masuk/spam.');
    } catch (error) {
      console.error("Error sending reset email:", error);
      setResetMessage('Gagal mengirim link reset password. Pastikan email valid.');
    }
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-center items-center pb-24">
        <LoadingUI text="Memeriksa Autentikasi..." />
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
        <h1 className="font-extrabold text-gray-800 text-lg ml-2">Pengaturan Akun</h1>
      </div>

      <div className="px-5 mt-6 space-y-6 max-w-3xl mx-auto w-full">
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          
          {/* Info Akun Section */}
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-user text-solo-red"></i> Informasi Pribadi
          </h2>

          <div className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Nama Lengkap</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-regular fa-id-card"></i>
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-solo-red transition-all"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Tanggal Lahir</label>
              <DatePicker 
                date={birthDate || null}
                onChange={(dateStr) => setBirthDate(dateStr || '')}
                placeholder="Pilih Tanggal Lahir"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-solo-red cursor-pointer transition-all"
              />
            </div>
          </div>

          <hr className="my-6 border-gray-100" />

          {/* Kontak Section */}
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-address-book text-solo-red"></i> Data Kontak
          </h2>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Alamat Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-regular fa-envelope"></i>
                </div>
                <input 
                  type="email" 
                  value={email}
                  readOnly
                  className="w-full pl-9 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 focus:outline-none transition-all cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 ml-1">Email digunakan untuk login dan tidak dapat diubah.</p>
            </div>

            {/* Nomor HP */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Nomor WhatsApp / HP</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-phone"></i>
                </div>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-solo-red transition-all"
                  placeholder="Contoh: 0812..."
                />
              </div>
            </div>
          </div>

          <hr className="my-6 border-gray-100" />

          {/* Keamanan Section */}
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-solo-red"></i> Keamanan Akun
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-3">Untuk alasan keamanan, perubahan password harus diverifikasi melalui email Anda.</p>
              
              <button 
                type="button"
                onClick={handleResetPassword}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <i className="fa-regular fa-envelope"></i>
                Kirim Link Reset Password
              </button>
              
              {resetMessage && (
                <p className={`mt-3 text-xs font-semibold p-3 rounded-lg ${resetMessage.includes('Gagal') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {resetMessage}
                </p>
              )}
            </div>
          </div>

          {role === 'Developer' && (
            <>
              <hr className="my-6 border-gray-100" />
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-server text-solo-red"></i> Pengaturan Sistem (Developer Khusus)
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">Maksimal Device Login (Seluruh Pengguna)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <i className="fa-solid fa-laptop-mobile"></i>
                    </div>
                    <input 
                      type="number" 
                      min="1"
                      max="100"
                      value={maxDevices}
                      onChange={(e) => setMaxDevices(parseInt(e.target.value) || 4)}
                      className="w-full pl-9 pr-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm font-semibold text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">Mengatur jumlah maksimal device yang bisa digunakan untuk login secara bersamaan oleh setiap akun. Hati-hati, ini berlaku untuk seluruh sistem.</p>
                </div>
              </div>
            </>
          )}

          <button 
            type="submit"
            disabled={isSaving}
            className={`w-full mt-8 text-white font-bold py-3.5 rounded-xl shadow-[0_8px_20px_rgba(200,0,0,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isSaving ? 'bg-gray-400' : 'bg-solo-red'}`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i>
                Simpan Pengaturan
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
