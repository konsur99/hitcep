"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfig } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import Link from 'next/link';
import * as XLSX from 'xlsx';

// Import data for migration (if needed)
import caborData from '@/data/cabor.json';
import summaryData from '@/data/summary.json';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useGlobalLoader } from '@/components/GlobalLoader';


type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: {
    manage_accounts?: boolean;
    can_add_account?: boolean;
    can_edit_account?: boolean;
    can_delete_account?: boolean;
    can_kill_session?: boolean;
    can_validate_medals?: boolean;
    can_validate_reports?: boolean;
  };
  max_devices?: number;
  phone?: string;
  photoUrl?: string;
  photoPublicId?: string;
};

export default function DeveloperDashboard() {
  const { showLoading, hideLoading } = useGlobalLoader();
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserPermissions, setCurrentUserPermissions] = useState<any>({});
  
  // Create user form state
  const [isCreating, setIsCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDomainSuffix, setNewDomainSuffix] = useState('@quikkoni.admin');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Admin');
  const [createMessage, setCreateMessage] = useState({ type: '', text: '' });
  
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Table dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [tableRoleSearch, setTableRoleSearch] = useState('');
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Admin' | 'Cabor'>('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  
  // Edit user state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editMaxDevices, setEditMaxDevices] = useState('4');
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState({ type: '', text: '' });
  
  // Permissions modal state
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permUserId, setPermUserId] = useState('');
  const [permUserName, setPermUserName] = useState('');
  const [permAccessDashboard, setPermAccessDashboard] = useState(false);
  const [permCanAdd, setPermCanAdd] = useState(false);
  const [permCanEdit, setPermCanEdit] = useState(false);
  const [permCanDelete, setPermCanDelete] = useState(false);
  const [permCanKill, setPermCanKill] = useState(false);
  const [permCanValidate, setPermCanValidate] = useState(false);
  const [permCanValidatePelaporan, setPermCanValidatePelaporan] = useState(false);

  // Session Management State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionTargetUser, setSessionTargetUser] = useState<UserData | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [targetMaxDevices, setTargetMaxDevices] = useState(2);
  
  // Emergency System State
  const [isSystemFrozen, setIsSystemFrozen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    keyword: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    keyword: '',
    onConfirm: () => {}
  });
  const [confirmInput, setConfirmInput] = useState('');
  
  // Wipe Data Modal State
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeOptions, setWipeOptions] = useState({
    medali: false,
    akun: false,
    dokumentasi: false,
    profil: false
  });
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  
  const allRoles = ['Admin', ...caborData.map(c => c.name)];
  const filteredRoles = allRoles.filter(r => r.toLowerCase().includes(roleSearchQuery.toLowerCase()));
  const filteredTableRoles = allRoles.filter(r => r.toLowerCase().includes(tableRoleSearch.toLowerCase()));

  useEffect(() => {
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeSystem: (() => void) | null = null;
    let usersLoaded = false;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous listeners when auth state changes
      if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
      if (unsubscribeSystem) { unsubscribeSystem(); unsubscribeSystem = null; }
      if (unsubscribeUsers) { unsubscribeUsers(); unsubscribeUsers = null; }
      usersLoaded = false;

      if (!user) {
        setIsAuthChecking(false);
        return;
      }
      
      // Listen to current user doc
      const docRef = doc(db, "users", user.uid);
      unsubscribeUser = onSnapshot(docRef, async (docSnap) => {
        const data = docSnap.data();
        if (!docSnap.exists() || !data?.role) {
          await setDoc(docRef, { role: 'Developer' }, { merge: true });
          setCurrentUserRole('Developer');
          setCurrentUserPermissions({});
          setIsAuthChecking(false);
          // Load users list only once
          if (!usersLoaded) {
            usersLoaded = true;
            startUsersListener();
          }
        } else {
          const perms = data.permissions || {};
          const hasAnyPermission = perms.manage_accounts || perms.can_add_account || perms.can_edit_account || perms.can_delete_account || perms.can_kill_session;
          
          if (data.role !== 'Developer' && !hasAnyPermission) {
            // Handled by SessionGuard
          } else {
            setCurrentUserRole(data.role);
            setCurrentUserPermissions(perms);
            // Load users list only once, not on every user doc update
            if (!usersLoaded) {
              usersLoaded = true;
              startUsersListener();
            }
          }
          setIsAuthChecking(false);
        }
      }, (error) => {
        console.error("Developer page user snapshot error:", error);
      });
      
      // Start users collection listener (called only once per auth session)
      const startUsersListener = () => {
        if (unsubscribeUsers) unsubscribeUsers();
        unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
          const usersData: UserData[] = [];
          snapshot.forEach((d) => {
            usersData.push({ id: d.id, ...d.data() } as UserData);
          });
          setUsers(usersData);
        }, (error) => {
          console.error("Developer page users list snapshot error:", error);
        });
      };
      
      // Listen to system settings
      const systemRef = doc(db, "settings", "system");
      unsubscribeSystem = onSnapshot(systemRef, (sysSnap) => {
        if (sysSnap.exists()) {
          setIsSystemFrozen(!!sysSnap.data().isFrozen);
        }
      }, (error) => {
        console.error("Developer page system snapshot error:", error);
      });
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeSystem) unsubscribeSystem();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isPermModalOpen || isEditModalOpen || isSessionModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isPermModalOpen, isEditModalOpen, isSessionModalOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMessage({ type: '', text: '' });
    
    if (newPassword.length < 6) {
      setCreateMessage({ type: 'error', text: 'Password minimal 6 karakter' });
      return;
    }

    setIsCreating(true);
    
    try {
      const finalEmail = `${newEmail}${newDomainSuffix}`;
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: finalEmail,
          password: newPassword,
          name: newName,
          role: newRole
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal membuat pengguna');
      }
      
      setCreateMessage({ type: 'success', text: `Akun ${newName} berhasil dibuat!` });
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('Admin');
      
    } catch (error: any) {
      console.error("Error creating user:", error);
      setCreateMessage({ type: 'error', text: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string, newRole: string) => {
    if (currentRole === 'Developer' && newRole !== 'Developer') {
      const isConfirmed = await confirm({
        title: 'Ubah Role Developer',
        message: 'Peringatan: Anda akan mengubah status Developer. Jika ini adalah satu-satunya Developer, Anda akan kehilangan akses ini. Lanjutkan?',
        danger: true
      });
      if (!isConfirmed) return;
    }
    try {
      await setDoc(doc(db, "users", userId), { role: newRole }, { merge: true });
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengubah role");
    }
  };
  
  const handleDeleteUserRecord = async (userId: string, role: string, photoPublicId?: string) => {
    if (role === 'Developer') {
      toast.error("Tidak dapat menghapus record Developer dari panel ini.");
      return;
    }
    const isConfirmed = await confirm({
      title: 'Hapus Akun',
      message: 'PERINGATAN: Anda akan MENGHAPUS TOTAL akun ini dari database dan Firebase Authentication secara permanen. Lanjutkan?',
      danger: true
    });
    if (!isConfirmed) return;
    
    try {
      const token = await auth.currentUser?.getIdToken();
      // 1. Delete photo from Cloudinary first if exists
      if (photoPublicId) {
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: photoPublicId }),
        }).catch(console.error);
      }

      // 2. Delete user auth and document
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus pengguna.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menghapus profil");
    }
  };

  const openEditModal = (user: UserData) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditMaxDevices(user.max_devices?.toString() || '4');
    setEditPassword('');
    setEditMessage({ type: '', text: '' });
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    setEditMessage({ type: '', text: '' });

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/edit-user', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid: editingUserId, 
          newName: editName,
          maxDevices: editMaxDevices,
          newPassword: editPassword || undefined
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengupdate pengguna.');
      }
      
      setEditMessage({ type: 'success', text: 'Akun berhasil diperbarui!' });
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setEditMessage({ type: 'error', text: err.message || "Gagal mengupdate profil" });
    } finally {
      setIsEditing(false);
    }
  };

  const openSessionModal = (user: UserData) => {
    setSessionTargetUser(user);
    setTargetMaxDevices(user.max_devices || 2);
    setIsSessionModalOpen(true);
    
    // Fetch sessions real-time
    const sessionsRef = collection(db, 'users', user.id, 'sessions');
    onSnapshot(sessionsRef, (snapshot) => {
      const s: any[] = [];
      snapshot.forEach(doc => s.push({ id: doc.id, ...doc.data() }));
      // Sort by login time descending
      s.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
      setActiveSessions(s);
    }, (error) => {
      console.error("Developer page active sessions snapshot error:", error);
    });
  };

  const updateMaxDevices = async (newVal: number) => {
    if (!sessionTargetUser) return;
    if (newVal < 1) newVal = 1;
    setTargetMaxDevices(newVal);
    try {
      await setDoc(doc(db, 'users', sessionTargetUser.id), { max_devices: newVal }, { merge: true });
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengupdate batas device');
    }
  };

  const killSpecificSession = async (sessionId: string) => {
    if (!sessionTargetUser) return;
    const isConfirmed = await confirm({
      title: 'Akhiri Sesi',
      message: 'Akhiri sesi login dari perangkat ini? Pengguna di perangkat tersebut akan otomatis keluar (logout).',
      danger: true
    });
    if (!isConfirmed) return;
    
    try {
      await deleteDoc(doc(db, 'users', sessionTargetUser.id, 'sessions', sessionId));
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengakhiri sesi perangkat tersebut.');
    }
  };

  const openPermModal = (user: UserData) => {
    setPermUserId(user.id);
    setPermUserName(user.name);
    // Legacy support for manage_accounts
    const legacyManage = user.permissions?.manage_accounts;
    const hasAnyPerm = legacyManage || user.permissions?.can_add_account || user.permissions?.can_edit_account || user.permissions?.can_delete_account || user.permissions?.can_kill_session;
    setPermAccessDashboard(!!hasAnyPerm);
    setPermCanAdd(user.permissions?.can_add_account ?? legacyManage ?? false);
    setPermCanEdit(user.permissions?.can_edit_account ?? legacyManage ?? false);
    setPermCanDelete(user.permissions?.can_delete_account ?? legacyManage ?? false);
    setPermCanKill(user.permissions?.can_kill_session ?? legacyManage ?? false);
    setPermCanValidate(user.permissions?.can_validate_medals ?? false);
    setPermCanValidatePelaporan(user.permissions?.can_validate_reports ?? false);
    setIsPermModalOpen(true);
  };

  const handleSavePermissions = async () => {
    try {
      await setDoc(doc(db, "users", permUserId), {
        permissions: {
          manage_accounts: permAccessDashboard,
          can_add_account: permAccessDashboard ? permCanAdd : false,
          can_edit_account: permAccessDashboard ? permCanEdit : false,
          can_delete_account: permAccessDashboard ? permCanDelete : false,
          can_kill_session: permAccessDashboard ? permCanKill : false,
          can_validate_medals: permAccessDashboard ? permCanValidate : false,
          can_validate_reports: permAccessDashboard ? permCanValidatePelaporan : false
        }
      }, { merge: true });
      setIsPermModalOpen(false);
      toast.success("Izin berhasil diperbarui!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal memperbarui izin.");
    }
  };

  const executeWipeData = async () => {
    setIsWiping(true);
    try {
      // 1. Data Medali
      if (wipeOptions.medali) {
        for (const cabor of caborData) {
          await setDoc(doc(db, "cabors", cabor.id), { ...cabor, gold: 0, silver: 0, bronze: 0 });
        }
      }
      
      // 2. Data Dokumentasi
      if (wipeOptions.dokumentasi) {
        const medalsRef = collection(db, "medals");
        const snaps = await getDocs(medalsRef);
        
        const token = await auth.currentUser?.getIdToken();
        for (const d of snaps.docs) {
          const medalData = d.data();
          // Delete from Cloudinary if exists
          if (medalData.portraitPublicId) {
            await fetch('/api/delete-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: medalData.portraitPublicId }) }).catch(console.error);
          }
          if (medalData.ceremonyPublicId) {
            await fetch('/api/delete-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: medalData.ceremonyPublicId }) }).catch(console.error);
          }
          await deleteDoc(d.ref);
        }
      }
      
      // Update public cache if medali or dokumentasi is wiped
      if (wipeOptions.medali || wipeOptions.dokumentasi) {
        const cacheRef = doc(db, "public_cache", "v1");
        const cacheDoc = await getDoc(cacheRef);
        if (cacheDoc.exists()) {
          const cacheData = cacheDoc.data();
          if (wipeOptions.medali) {
            cacheData.cabors = (cacheData.cabors || []).map((c: any) => ({ ...c, gold: 0, silver: 0, bronze: 0 }));
          }
          if (wipeOptions.dokumentasi) {
            cacheData.medals = [];
          }
          await setDoc(cacheRef, cacheData, { merge: true });
        }
      }
      
      // 3. Foto Profil
      if (wipeOptions.profil) {
        const token = await auth.currentUser?.getIdToken();
        for (const u of users) {
          if (u.photoPublicId) {
            await fetch('/api/delete-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: u.photoPublicId }) }).catch(console.error);
          }
          await setDoc(doc(db, "users", u.id), { photoUrl: null, photoPublicId: null }, { merge: true });
        }
      }
      
      // 4. Data Akun
      if (wipeOptions.akun) {
        const token = await auth.currentUser?.getIdToken();
        for (const u of users) {
          if (u.role !== 'Developer') {
            await fetch('/api/delete-user', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: u.id }),
            });
          }
        }
      }
      
      toast.success('Penghapusan data berhasil dieksekusi!');
      setIsWipeModalOpen(false);
      setWipeOptions({ medali: false, akun: false, dokumentasi: false, profil: false });
      setWipeConfirmInput('');
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat mengeksekusi penghapusan data.');
    } finally {
      setIsWiping(false);
    }
  };

  const executeToggleFreeze = async () => {
    try {
      await setDoc(doc(db, "settings", "system"), { isFrozen: !isSystemFrozen }, { merge: true });
      toast.success(`Sistem berhasil di${!isSystemFrozen ? 'bekukan' : 'cairkan'}!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengubah status sistem!');
    }
  };

  const executeKillAllSessions = async () => {
    try {
      // Iterate through all users and delete their sessions
      for (const u of users) {
        // Unfortunately, without a collectionGroup index, we have to fetch manually per user
        // This is acceptable since this is a rare emergency action and user count isn't millions
        const sessionsRef = collection(db, "users", u.id, "sessions");
        onSnapshot(sessionsRef, (snapshot) => {
           snapshot.forEach(d => deleteDoc(d.ref));
        }, (error) => {
          console.error("Developer page kill all sessions snapshot error:", error);
        });
      }
      toast.success('Perintah eksekusi Kill All Sessions telah dikirim!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengeksekusi Kill All Sessions!');
    }
  };

  const executeRevokeAllAccess = async () => {
    try {
      let count = 0;
      for (const u of users) {
        if (u.role !== 'Developer') {
          await setDoc(doc(db, "users", u.id), { permissions: {} }, { merge: true });
          count++;
        }
      }
      toast.success(`Berhasil mencabut hak akses dari ${count} pengguna.`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mencabut hak akses massal!');
    }
  };

  const executeForceRefresh = async () => {
    try {
      await setDoc(doc(db, "settings", "system"), { forceRefresh: Date.now() }, { merge: true });
      toast.success('Perintah Force Refresh telah dikirim ke semua perangkat!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengirim perintah Force Refresh!');
    }
  };

  const handleOpenConfirm = (title: string, description: string, keyword: string, onConfirm: () => void) => {
    setConfirmInput('');
    setConfirmModal({
      isOpen: true,
      title,
      description,
      keyword,
      onConfirm
    });
  };

  const [isBackingUp, setIsBackingUp] = useState(false);

  const executeBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const wb = XLSX.utils.book_new();
      
      const collectionsToBackup = [
        { name: 'users', sheetName: 'Akun' },
        { name: 'cabors', sheetName: 'Cabor' },
        { name: 'reports', sheetName: 'Laporan Cabor' },
        { name: 'medals', sheetName: 'Dokumentasi Medali' },
        { name: 'settings', sheetName: 'Pengaturan' }
      ];
      
      let imageCounter = 1;
      
      let summaryText = `LAPORAN PENCADANGAN DATA (BACKUP) SISTEM PORPROV KONI SURAKARTA\n`;
      summaryText += `===============================================================\n`;
      summaryText += `Tanggal Backup : ${new Date().toLocaleString('id-ID')}\n`;
      summaryText += `Total Koleksi  : ${collectionsToBackup.length} koleksi\n\n`;
      summaryText += `RINCIAN DATA:\n`;
      summaryText += `---------------------------------------------------------------\n`;
      
      for (const col of collectionsToBackup) {
        const snap = await getDocs(collection(db, col.name));
        summaryText += `- ${col.sheetName.padEnd(20)} : ${snap.size} baris data\n`;
        
        // Folder khusus untuk tiap kategori gambar
        const colImagesFolder = zip.folder(`Foto_&_Dokumentasi/${col.sheetName.replace(/ /g, '_')}`);
        
        const data = await Promise.all(snap.docs.map(async doc => {
          const docData = doc.data();
          const cleanData: any = { id: doc.id };
          
          for (const key in docData) {
            const val = docData[key];
            if (typeof val === 'string' && val.startsWith('https://res.cloudinary.com/')) {
              try {
                // Fetch the image from Cloudinary
                const res = await fetch(val);
                if (!res.ok) throw new Error('Network response was not ok');
                
                const blob = await res.blob();
                const arrayBuffer = await blob.arrayBuffer();
                
                // Try to guess the extension from the URL
                let ext = 'webp';
                const urlParts = val.split('?')[0].split('.');
                if (urlParts.length > 1) {
                  const possibleExt = urlParts[urlParts.length - 1];
                  if (possibleExt.length <= 4 && possibleExt.length > 0) ext = possibleExt;
                }
                
                const fileName = `${doc.id}_${key}_${imageCounter++}.${ext}`;
                if (colImagesFolder) {
                  colImagesFolder.file(fileName, arrayBuffer);
                }
                cleanData[key] = `[Tersimpan di: Foto_&_Dokumentasi/${col.sheetName.replace(/ /g, '_')}/${fileName}]`;
              } catch (e) {
                console.error("Failed to download image for backup", e);
                cleanData[key] = val; // fallback to just storing the URL
              }
            } else if (typeof val === 'string' && val.startsWith('data:image/')) {
              // Extract base64 image and save it into the ZIP (Legacy data)
              let base64Data = val;
              let ext = 'webp';
              
              const parts = val.split(';');
              if (parts[0]) ext = parts[0].replace('data:image/', '');
              const commaParts = val.split(',');
              if (commaParts.length > 1) base64Data = commaParts[1];
              
              const fileName = `${doc.id}_${key}_${imageCounter++}.${ext}`;
              if (colImagesFolder) {
                colImagesFolder.file(fileName, base64Data, { base64: true });
              }
              
              cleanData[key] = `[Tersimpan di: Foto_&_Dokumentasi/${col.sheetName.replace(/ /g, '_')}/${fileName}]`;
            } else if (typeof val === 'string' && val.length > 32000) {
              // Fallback for any other long strings to prevent Excel crash
              cleanData[key] = '[Teks Terlalu Panjang]';
            } else if (typeof val === 'object' && val !== null) {
              try {
                // Konversi Timestamp firebase ke format Date/String agar rapi di excel
                if (val.seconds && val.nanoseconds && typeof val.toDate === 'function') {
                  cleanData[key] = val.toDate().toLocaleString('id-ID');
                } else {
                  const strVal = JSON.stringify(val);
                  cleanData[key] = strVal.length > 30000 ? '[Data Object Terlalu Panjang]' : strVal;
                }
              } catch (e) {
                cleanData[key] = '[Object]';
              }
            } else {
              cleanData[key] = val;
            }
          }
          return cleanData;
        }));
        
        const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ status: 'Kosong' }]);
        XLSX.utils.book_append_sheet(wb, ws, col.sheetName);
      }
      
      summaryText += `---------------------------------------------------------------\n`;
      summaryText += `\nStruktur Folder Backup:\n`;
      summaryText += `1. File_Excel_Database.xlsx (Berisi seluruh data teks/tabel)\n`;
      summaryText += `2. Foto_&_Dokumentasi/ (Folder berisi file foto, dipisah per kategori)\n`;
      summaryText += `3. Ringkasan_Backup.txt (File ini)\n`;

      // 1. Simpan file Excel ke dalam ZIP
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file(`File_Excel_Database.xlsx`, excelBuffer);
      
      // 2. Simpan file TXT Ringkasan ke dalam ZIP
      zip.file('Ringkasan_Backup.txt', summaryText);
      
      // 2. Buat file ZIP
      const zipContent = await zip.generateAsync({ type: 'blob' });
      
      // 3. Unduh ZIP
      const url = URL.createObjectURL(zipContent);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_Porprov_KONI_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Backup failed", error);
      toast.error("Gagal melakukan backup data ZIP. Pastikan koneksi internet stabil.");
    } finally {
      setIsBackingUp(false);
    }
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-center items-center pb-24">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      </main>
    );
  }

  return (
    <main className="min-h-[100vh] bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 px-5 py-5 flex items-center shadow-md sticky top-0 z-50">
        <Link href="/profil" className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-yellow-950 hover:bg-yellow-400/30 transition-colors">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </Link>
        <div className="ml-2">
          <h1 className="font-extrabold text-yellow-950 text-lg flex items-center gap-2">
            <i className="fa-solid fa-code"></i> Developer Dashboard
          </h1>
          <p className="text-[10px] text-yellow-900 font-bold uppercase tracking-wide">Control keseluruhan</p>
        </div>
      </div>
      <div className="px-5 mt-6 relative max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 items-start pb-20">
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
      
        {/* Form Create Account (Only if Dev or has can_add_account) */}
        {(currentUserRole === 'Developer' || currentUserPermissions?.can_add_account) && (
          <section className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 w-full h-fit flex flex-col">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                 <i className="fa-solid fa-user-plus text-[10px]"></i>
              </div>
              Buat Akun Akses Baru
            </h2>
          
          <form onSubmit={handleCreateUser} className="space-y-4" autoComplete="off">
            {createMessage.text && (
              <div className={`p-3 rounded-xl text-xs font-bold text-center border ${createMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                <i className={`fa-solid ${createMessage.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'} mr-1.5`}></i>
                {createMessage.text}
              </div>
            )}
          
            <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Nama</label>
                <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Misal: John Doe" autoComplete="off" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Role / Peran</label>
                <div className="relative">
                  <div 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-800 cursor-pointer flex justify-between items-center focus:ring-2 focus:ring-yellow-400 transition-colors hover:bg-gray-100"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  >
                    <span className="truncate">{newRole}</span>
                    <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </div>
                  {isRoleDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsRoleDropdownOpen(false)}></div>
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden">
                        <div className="p-1.5 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                          <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                            <input 
                              type="text" 
                              placeholder="Cari Role..." 
                              className="w-full pl-7 pr-2 py-1.5 bg-white border border-gray-200 rounded text-[11px] font-medium focus:outline-none focus:border-yellow-400 transition-all"
                              value={roleSearchQuery}
                              onChange={(e) => setRoleSearchQuery(e.target.value)}
                              
                            />
                          </div>
                        </div>
                        <ul className="max-h-[160px] overflow-y-auto">
                          {filteredRoles.length > 0 ? (
                            filteredRoles.map(role => (
                              <li 
                                key={role} 
                                className={`px-3 py-2 text-[11px] cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${newRole === role ? 'font-bold text-yellow-600 bg-yellow-50' : 'font-medium text-gray-700'}`}
                                onClick={() => {
                                  setNewRole(role);
                                  setIsRoleDropdownOpen(false);
                                  setRoleSearchQuery('');
                                }}
                              >
                                {role}
                              </li>
                            ))
                          ) : (
                            <li className="px-4 py-6 text-xs text-center text-gray-400 font-medium">
                              Tidak ditemukan
                            </li>
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Username Login</label>
                  <div className="flex rounded-lg shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-yellow-400 bg-gray-50">
                    <input 
                      type="text" 
                      required 
                      value={newEmail} 
                      onChange={e => setNewEmail(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())} 
                      className="w-full px-3 py-2 bg-transparent text-[11px] font-semibold focus:outline-none" 
                      placeholder="Misal: budi_99" 
                      autoComplete="off"
                    />
                    <div className="border-l border-gray-200 bg-gray-100 flex items-center shrink-0">
                      <select 
                        value={newDomainSuffix} 
                        onChange={e => setNewDomainSuffix(e.target.value)}
                        className="bg-transparent border-none text-[11px] font-bold text-gray-700 pl-3 pr-6 py-2 focus:outline-none cursor-pointer appearance-none outline-none ring-0"
                        style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="%234B5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                      >
                        <option value="@quikkoni.admin">@quikkoni.admin</option>
                        <option value="@quikkoni.cabor">@quikkoni.cabor</option>
                      </select>
                    </div>
                  </div>
                </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Password Baru</label>
                <div className="relative">
                  <input type={showNewPassword ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Minimal 6 karakter" autoComplete="new-password" />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                  >
                    <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-[11px]`}></i>
                  </button>
                </div>
              </div>
            
            <button type="submit" disabled={isCreating} className="w-full mt-2 py-3 bg-gray-900 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2">
              {isCreating ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <i className="fa-solid fa-plus"></i>}
              Daftarkan Akun
            </button>
          </form>
        </section>
        )}

        </div>
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
        {/* Section: Manajemen Pengguna */}
        <section className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 w-full h-fit flex flex-col">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
               <i className="fa-solid fa-users text-[10px]"></i>
            </div>
            Daftar Pengguna ({users.length})
          </h2>
          
          <div className="space-y-6">
            {/* Developer Cards */}
            <div className="space-y-3">
              {users.filter(u => u.role === 'Developer').map(u => (
                <div key={u.id} className="p-4 border rounded-xl flex flex-col gap-2 relative overflow-hidden bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-100 border-yellow-400 shadow-sm">
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex-1">
                      <h3 className="text-[12px] font-black text-yellow-900 tracking-tight uppercase">{u.name}</h3>
                      <div className="mt-1 flex items-center">
                          <div className="px-2 py-0.5 bg-white/50 rounded text-[9px] font-bold text-yellow-800 border border-yellow-300/50 flex items-center">
                            <i className="fa-solid fa-shield-halved mr-1.5 text-yellow-600"></i> Developer Access <span className="ml-1 text-emerald-600"><i className="fa-solid fa-check-circle"></i> V3</span>
                          </div>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center justify-center ml-2">
                      <div className="text-[10px] font-bold px-3 py-1 rounded-lg border text-center relative z-10 bg-gradient-to-b from-yellow-300 to-yellow-400 text-yellow-900 border-yellow-500 shadow-sm">
                        Developer
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Other Users Table */}
            {users.filter(u => u.role !== 'Developer').length > 0 && (
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input 
                      type="text" 
                      placeholder="Cari nama atau email..." 
                      className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm transition-shadow"
                      value={nameSearchQuery}
                      onChange={(e) => setNameSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors shadow-sm ${
                        roleFilter !== 'All' 
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                      title="Filter Role"
                    >
                      <i className="fa-solid fa-filter text-[11px]"></i>
                    </button>
                    
                    {isFilterDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsFilterDropdownOpen(false)}></div>
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-lg shadow-[0_4px_15px_rgb(0,0,0,0.1)] z-50 overflow-hidden py-1">
                          <button 
                            onClick={() => { setRoleFilter('All'); setIsFilterDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[10px] font-bold transition-colors ${roleFilter === 'All' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            Semua Role
                          </button>
                          <button 
                            onClick={() => { setRoleFilter('Admin'); setIsFilterDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[10px] font-bold transition-colors ${roleFilter === 'Admin' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            Hanya Admin
                          </button>
                          <button 
                            onClick={() => { setRoleFilter('Cabor'); setIsFilterDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[10px] font-bold transition-colors ${roleFilter === 'Cabor' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            Hanya Cabor
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="rounded-xl border border-gray-200 shadow-sm w-full bg-white relative">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[9px] uppercase tracking-wider text-gray-500">
                        <th className="px-1.5 py-2 font-bold w-[45%] rounded-tl-xl">Akun</th>
                        <th className="px-1 py-2 font-bold text-center w-[40%]">Role</th>
                        <th className="px-1.5 py-2 font-bold text-right w-[15%] rounded-tr-xl">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {users
                        .filter(u => u.role !== 'Developer')
                        .filter(u => 
                          u.name.toLowerCase().includes(nameSearchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(nameSearchQuery.toLowerCase())
                        )
                        .filter(u => {
                          if (roleFilter === 'All') return true;
                          if (roleFilter === 'Admin') return u.role === 'Admin';
                          if (roleFilter === 'Cabor') return u.role !== 'Admin' && u.role !== 'Developer';
                          return true;
                        })
                        .map((u, index, array) => {
                          const isLast = index === array.length - 1;
                          return (
                          <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className={`px-1.5 py-2 ${isLast ? 'rounded-bl-xl' : ''}`}>
                              <p className="text-[10px] font-bold text-gray-900 break-words leading-tight">{u.name}</p>
                              <p className="text-[8px] text-gray-500 break-all mt-0.5 leading-tight">{u.email}</p>
                            </td>
                            <td className="px-1 py-2 text-center align-middle">
                              <div className="relative flex justify-center w-full">
                                <div 
                                  className={`font-bold px-2 py-1 rounded border cursor-pointer text-center flex items-center justify-center leading-tight min-h-[22px] max-w-full break-words whitespace-normal ${
                                    u.role === 'Admin' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                    'bg-blue-100 text-blue-800 border-blue-200'
                                  }`}
                                  style={{
                                    fontSize: u.role.length > 18 ? '6.5px' : (u.role.length > 12 ? '7.5px' : '8.5px')
                                  }}
                                  onClick={() => {
                                    if (openDropdownId === u.id) {
                                      setOpenDropdownId(null);
                                    } else {
                                      setOpenDropdownId(u.id);
                                      setTableRoleSearch('');
                                    }
                                  }}
                                >
                                  {u.role}
                                </div>
                                {openDropdownId === u.id && (
                                  <>
                                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setOpenDropdownId(null)}></div>
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-full min-w-[90px] bg-white border border-gray-100 rounded-lg shadow-[0_4px_15px_rgb(0,0,0,0.1)] z-50 overflow-hidden">
                                      <div className="p-1 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                                        <input 
                                          type="text" 
                                          placeholder="Cari..." 
                                          className="w-full px-1 py-1.5 bg-white border border-gray-200 rounded text-[9px] font-medium focus:outline-none focus:border-yellow-400 text-center"
                                          value={tableRoleSearch}
                                          onChange={(e) => setTableRoleSearch(e.target.value)}
                                          
                                        />
                                      </div>
                                      <ul className="max-h-[140px] overflow-y-auto text-left">
                                        {filteredTableRoles.length > 0 ? (
                                          filteredTableRoles.map(role => (
                                            <li 
                                              key={role} 
                                              className={`px-2 py-1.5 text-[9px] cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 truncate ${u.role === role ? 'font-bold text-yellow-600 bg-yellow-50' : 'font-medium text-gray-700'}`}
                                              onClick={() => {
                                                handleRoleChange(u.id, u.role, role);
                                                setOpenDropdownId(null);
                                              }}
                                            >
                                              {role}
                                            </li>
                                          ))
                                        ) : (
                                          <li className="px-2 py-3 text-[9px] text-center text-gray-400 font-medium">
                                            Kosong
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className={`px-1.5 py-2 ${isLast ? 'rounded-br-xl' : ''}`}>
                              <div className="relative flex justify-end">
                                <button 
                                  onClick={() => setOpenActionId(openActionId === u.id ? null : u.id)}
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors border shadow-sm ${openActionId === u.id ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 border-gray-200'}`}
                                >
                                  <i className="fa-solid fa-ellipsis-vertical text-[10px]"></i>
                                </button>
                                
                                {openActionId === u.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setOpenActionId(null)}></div>
                                    <div className="absolute right-0 top-full mt-1 w-[120px] bg-white border border-gray-100 rounded-lg shadow-[0_4px_15px_rgb(0,0,0,0.1)] z-50 overflow-hidden py-1 divide-y divide-gray-50">
                                      
                                      {currentUserRole === 'Developer' && u.role === 'Admin' && (
                                        <button 
                                          onClick={() => { openPermModal(u); setOpenActionId(null); }}
                                          className="w-full text-left px-3 py-2.5 text-[9px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${u.permissions?.manage_accounts || u.permissions?.can_add_account ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <i className="fa-solid fa-shield-halved text-[8px]"></i>
                                          </div>
                                          Kelola Izin
                                        </button>
                                      )}
                                      
                                      {(currentUserRole === 'Developer' || currentUserPermissions?.can_edit_account) && (
                                        <button 
                                          onClick={() => { openEditModal(u); setOpenActionId(null); }}
                                          className="w-full text-left px-3 py-2.5 text-[9px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                          <div className="w-4 h-4 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-pen text-[8px]"></i>
                                          </div>
                                          Edit Akun
                                        </button>
                                      )}

                                      {(currentUserRole === 'Developer' || currentUserPermissions?.can_kill_session) && (
                                        <button 
                                          onClick={() => { openSessionModal(u); setOpenActionId(null); }}
                                          className="w-full text-left px-3 py-2.5 text-[9px] font-bold text-gray-700 hover:bg-orange-50 flex items-center gap-2"
                                        >
                                          <div className="w-4 h-4 rounded bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-power-off text-[8px]"></i>
                                          </div>
                                          Kill Sesi
                                        </button>
                                      )}

                                      {(currentUserRole === 'Developer' || currentUserPermissions?.can_delete_account) && (
                                        <button 
                                          onClick={() => { handleDeleteUserRecord(u.id, u.role, u.photoPublicId); setOpenActionId(null); }}
                                          className="w-full text-left px-3 py-2.5 text-[9px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                          <div className="w-4 h-4 rounded bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-trash-can text-[8px]"></i>
                                          </div>
                                          Hapus
                                        </button>
                                      )}

                                      {/* Tampilkan pesan jika tidak ada aksi yang tersedia */}
                                      {currentUserRole !== 'Developer' && !currentUserPermissions?.can_edit_account && !currentUserPermissions?.can_kill_session && !currentUserPermissions?.can_delete_account && (
                                        <div className="px-3 py-2 text-[9px] text-gray-400 text-center italic">
                                          Tidak ada akses
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        </div>
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
        {/* Kontrol Khusus Developer (Hanya Developer Asli) */}
        {currentUserRole === 'Developer' && (
          <>
            {/* Manajemen Data & Backup */}
            <section className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 w-full h-fit flex flex-col">
              <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-cloud-arrow-down text-[10px]"></i>
                </div>
                Pencadangan Data (Backup)
              </h2>
              
              <div className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <p className="text-[10px] text-blue-800 leading-relaxed">
                  Unduh seluruh database ke dalam format arsip <span className="font-bold">ZIP</span>. Di dalamnya berisi File <span className="font-bold">Excel (.xlsx)</span> serta Folder <span className="font-bold">Images</span> yang menampung seluruh foto (format webp) secara otomatis.
                </p>
              </div>

              <button 
                onClick={executeBackup}
                disabled={isBackingUp}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(37,99,235,0.3)] disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isBackingUp ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Mengekstrak File ZIP...</>
                ) : (
                  <><i className="fa-solid fa-file-zipper"></i> Download Full Backup (.zip)</>
                )}
              </button>
            </section>

            <section className="bg-red-50 rounded-2xl p-5 shadow-card border border-red-200 relative overflow-hidden w-full h-fit flex flex-col">
            {/* Warning Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }}></div>
            
            <h2 className="text-sm font-black text-red-800 mb-4 flex items-center gap-2 relative z-10">
              <div className="w-6 h-6 rounded-full bg-red-200 text-red-700 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-triangle-exclamation text-[10px] animate-pulse"></i>
              </div>
              TOMBOL EMERGENCY
            </h2>
            
            <div className="space-y-3 relative z-10">
              <button 
                onClick={() => setIsWipeModalOpen(true)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2 border border-red-700"
              >
                <i className="fa-solid fa-bomb text-lg"></i>
                Hapus Seluruh Data (Factory Reset)
              </button>
              
              {/* Tambahan Tombol Emergency Developer */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-red-200/60 mt-2">
                <button 
                  onClick={() => handleOpenConfirm(
                    isSystemFrozen ? 'Cairkan Sistem (Unfreeze)' : 'Bekukan Sistem (Freeze)',
                    isSystemFrozen 
                      ? 'Apakah Anda yakin ingin membuka kembali sistem agar dapat diakses oleh semua pengguna?' 
                      : 'Apakah Anda yakin ingin membekukan (Freeze) sistem? Semua aktivitas akun lain akan dikunci secara instan.',
                    isSystemFrozen ? 'konfirmasi unfreeze' : 'konfirmasi freeze',
                    executeToggleFreeze
                  )}
                  className={`w-full py-2.5 ${isSystemFrozen ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300' : 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300'} text-[10px] font-bold rounded-xl transition-colors border flex flex-col items-center justify-center gap-1.5`}
                >
                  <i className={`fa-solid ${isSystemFrozen ? 'fa-fire' : 'fa-snowflake'} text-sm`}></i>
                  {isSystemFrozen ? 'Unfreeze System' : 'Freeze System'}
                </button>
                <button 
                  onClick={() => handleOpenConfirm(
                    'Kill All Sessions',
                    'PERINGATAN KERAS: Fitur ini akan memaksa LOGOUT seluruh perangkat dari semua akun di sistem secara real-time. Lanjutkan?',
                    'konfirmasi kill all session',
                    executeKillAllSessions
                  )}
                  className="w-full py-2.5 bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-bold rounded-xl transition-colors border border-red-300 flex flex-col items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-skull-crossbones text-sm"></i>
                  Kill All Sessions
                </button>
                <button 
                  onClick={() => handleOpenConfirm(
                    'Cabut Hak Akses Massal',
                    'Fitur ini akan MENGHAPUS SEMUA IZIN SPESIAL (Edit, Hapus, Manajemen) dari seluruh Admin dan Cabor secara permanen (Kecuali Anda). Lanjutkan?',
                    'konfirmasi demote all',
                    executeRevokeAllAccess
                  )}
                  className="w-full py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-[10px] font-bold rounded-xl transition-colors border border-orange-300 flex flex-col items-center justify-center gap-1.5 text-center px-1"
                >
                  <i className="fa-solid fa-user-shield text-sm"></i>
                  Cabut Semua Izin Admin
                </button>
                <button 
                  onClick={() => handleOpenConfirm(
                    'Force Refresh All Clients',
                    'Ini akan memaksa seluruh perangkat pengguna yang sedang membuka aplikasi untuk memuat ulang (Refresh) browser mereka seketika. Lanjutkan?',
                    'konfirmasi force refresh',
                    executeForceRefresh
                  )}
                  className="w-full py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-xl transition-colors border border-emerald-300 flex flex-col items-center justify-center gap-1.5 text-center px-1"
                >
                  <i className="fa-solid fa-rotate text-sm"></i>
                  Force Refresh Clients
                </button>
              </div>
            </div>
            
            <div className="mt-5 bg-red-100/80 p-3 rounded-xl border border-red-200/50 relative z-10">
              <p className="text-[9px] text-red-700 leading-relaxed font-bold">
                <i className="fa-solid fa-circle-info mr-1.5"></i>
                Perhatian: Menu ini hanya muncul khusus untuk Developer Utama. Tidak ada Admin atau Role lain yang bisa melihat atau diberikan akses ke tombol ini. Penggunaan fitur di atas bersifat destruktif.
              </p>
            </div>
          </section>
          </>
        )}
        
        {/* Modal Edit Akun */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pb-20">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isEditing && setIsEditModalOpen(false)}></div>
            <div className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm relative z-10 border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-pen text-[10px]"></i>
                  </div>
                  Edit Akun
                </h3>
                <button 
                  onClick={() => !isEditing && setIsEditModalOpen(false)}
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              <form onSubmit={handleEditUser} className="space-y-4">
                {editMessage.text && (
                  <div className={`p-3 rounded-xl text-xs font-bold text-center border ${editMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    <i className={`fa-solid ${editMessage.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'} mr-1.5`}></i>
                    {editMessage.text}
                  </div>
                )}
              
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Ubah Nama</label>
                  <input 
                    type="text" 
                    required 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400" 
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Reset Password Baru (Opsional)</label>
                  <input 
                    type="text" 
                    value={editPassword} 
                    onChange={e => setEditPassword(e.target.value)} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400" 
                    placeholder="Kosongkan jika tidak ingin mereset"
                  />
                  <p className="text-[9px] text-gray-400 mt-1 ml-1">*Minimal 6 karakter jika diisi.</p>
                </div>

                {currentUserRole === 'Developer' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 ml-1">Maksimal Device Login (Opsional)</label>
                    <input 
                      type="number" 
                      min="1"
                      max="99"
                      value={editMaxDevices} 
                      onChange={e => setEditMaxDevices(e.target.value)} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400" 
                      placeholder="4"
                    />
                    <p className="text-[9px] text-gray-400 mt-1 ml-1">*Default adalah 4 device. Hanya Developer yang bisa mengubah ini.</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isEditing}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-2"
                >
                  {isEditing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk mr-2"></i>
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Permissions */}
        {isPermModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pb-20">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsPermModalOpen(false)}></div>
            <div className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto relative z-10 border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-20 pb-2 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-shield-halved text-[10px]"></i>
                  </div>
                  Kelola Izin (Permissions)
                </h3>
                <button 
                  onClick={() => setIsPermModalOpen(false)}
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
              
              <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500">Mengelola izin untuk akun:</p>
                <p className="text-xs font-bold text-gray-800">{permUserName}</p>
              </div>

              <div className="space-y-3">
                {/* Master Permission */}
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-yellow-200 hover:bg-yellow-50 transition-colors bg-gradient-to-r from-yellow-50 to-amber-50">
                  <div className="flex items-center h-5">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-emerald-600 bg-white border-yellow-400 rounded focus:ring-emerald-500 focus:ring-2"
                      checked={permAccessDashboard}
                      onChange={(e) => setPermAccessDashboard(e.target.checked)}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-extrabold text-yellow-950">Akses Dashboard Developer</h4>
                    <p className="text-[10px] text-yellow-800 mt-1">Mengizinkan Admin ini untuk masuk ke menu khusus Developer Dashboard.</p>
                  </div>
                </label>

                {/* Sub Permissions (Visible only if master is checked) */}
                {permAccessDashboard && (
                  <div className="pl-4 border-l-2 border-yellow-200 mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Hak Akses Spesifik</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center h-4 mt-0.5">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                            checked={permCanAdd}
                            onChange={(e) => setPermCanAdd(e.target.checked)}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold text-gray-900 leading-none">Tambah Akun</h4>
                          <p className="text-[8px] text-gray-500 mt-1 leading-tight">Buat akun baru</p>
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center h-4 mt-0.5">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                            checked={permCanEdit}
                            onChange={(e) => setPermCanEdit(e.target.checked)}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold text-gray-900 leading-none">Edit Akun</h4>
                          <p className="text-[8px] text-gray-500 mt-1 leading-tight">Ubah & reset PW</p>
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center h-4 mt-0.5">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                            checked={permCanDelete}
                            onChange={(e) => setPermCanDelete(e.target.checked)}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold text-gray-900 leading-none">Hapus Akun</h4>
                          <p className="text-[8px] text-gray-500 mt-1 leading-tight">Hapus permanen</p>
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center h-4 mt-0.5">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                            checked={permCanKill}
                            onChange={(e) => setPermCanKill(e.target.checked)}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold text-gray-900 leading-none">Kill Session</h4>
                          <p className="text-[8px] text-gray-500 mt-1 leading-tight">Putus sesi akun</p>
                        </div>
                      </label>
  
                      <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center h-4 mt-0.5">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                            checked={permCanValidate}
                            onChange={(e) => setPermCanValidate(e.target.checked)}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold text-gray-900 leading-none">Val. Medali</h4>
                          <p className="text-[8px] text-gray-500 mt-1 leading-tight">Persetujuan medali</p>
                        </div>
                      </label>
  
                      <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center h-4 mt-0.5">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                            checked={permCanValidatePelaporan}
                            onChange={(e) => setPermCanValidatePelaporan(e.target.checked)}
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold text-gray-900 leading-none">Val. Laporan</h4>
                          <p className="text-[8px] text-gray-500 mt-1 leading-tight">Persetujuan aduan</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSavePermissions}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] mt-5"
              >
                <i className="fa-solid fa-floppy-disk mr-2"></i>
                Simpan Izin
              </button>
            </div>
          </div>
        )}
        {/* Modal Manajemen Sesi */}
        {isSessionModalOpen && sessionTargetUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pb-20">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSessionModalOpen(false)}></div>
            <div className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto relative z-10 border border-gray-100 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-20 pb-2 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-mobile-screen-button text-[10px]"></i>
                  </div>
                  Manajemen Sesi
                </h3>
                <button 
                  onClick={() => setIsSessionModalOpen(false)}
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>
              
              <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500">Mengelola sesi login untuk akun:</p>
                <p className="text-xs font-bold text-gray-800">{sessionTargetUser.name}</p>
              </div>

              <div className="mb-4 p-3 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-blue-900">Batas Maksimal Device</h4>
                    <p className="text-[10px] text-blue-700">Jumlah perangkat yang diizinkan login.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 p-1">
                    <button 
                      onClick={() => updateMaxDevices(targetMaxDevices - 1)}
                      className="w-6 h-6 flex items-center justify-center bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                      <i className="fa-solid fa-minus text-[10px]"></i>
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{targetMaxDevices}</span>
                    <button 
                      onClick={() => updateMaxDevices(targetMaxDevices + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i>
                    </button>
                  </div>
                </div>
                <div className="w-full bg-blue-200 h-1.5 rounded-full mt-1 overflow-hidden">
                   <div 
                     className="bg-blue-600 h-full transition-all duration-300"
                     style={{ width: `${Math.min(100, (activeSessions.length / targetMaxDevices) * 100)}%` }}
                   ></div>
                </div>
                <p className="text-[9px] font-medium text-blue-800 text-right">Terpakai: {activeSessions.length} / {targetMaxDevices}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 mb-2">Daftar Perangkat Aktif</h4>
                {activeSessions.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center italic py-4">Belum ada perangkat yang login saat ini.</p>
                ) : (
                  activeSessions.map((session, idx) => (
                    <div key={session.id || idx} className="p-3 rounded-xl border border-gray-100 bg-white hover:border-orange-200 transition-colors relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <i className={`fa-solid ${session.deviceType === 'Komputer' ? 'fa-desktop' : 'fa-mobile-screen'} text-gray-400`}></i>
                          <h5 className="text-[11px] font-bold text-gray-900">{session.deviceModel || session.deviceType}</h5>
                        </div>
                        <button 
                          onClick={() => killSpecificSession(session.id)}
                          title="Keluarkan Perangkat Ini"
                          className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[9px] font-bold transition-colors flex items-center gap-1"
                        >
                          <i className="fa-solid fa-power-off text-[8px]"></i> Kill
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[9px] text-gray-500 flex items-center gap-1.5">
                          <i className="fa-solid fa-globe w-3 text-center"></i> {session.ip}
                        </p>
                        <p className="text-[9px] text-gray-500 flex items-center gap-1.5">
                          <i className="fa-solid fa-location-dot w-3 text-center"></i> {session.location || 'Lokasi Tidak Diketahui'}
                        </p>
                        <p className="text-[9px] text-gray-500 flex items-center gap-1.5">
                          <i className="fa-solid fa-clock w-3 text-center"></i> {new Date(session.loginTime).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {/* Modal Konfirmasi Darurat (Typed Confirmation) */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pb-20">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}></div>
            <div className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm relative z-10 border border-red-200 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-triangle-exclamation text-lg animate-pulse"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-red-700 uppercase">{confirmModal.title}</h3>
                    <p className="text-[10px] text-red-500 font-bold mt-0.5">Tindakan Sangat Berbahaya</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-5 bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-xs text-red-800 leading-relaxed font-semibold">
                  {confirmModal.description}
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-[11px] font-bold text-gray-700 mb-2">
                  Ketik <span className="text-red-600 select-all bg-red-50 px-1.5 py-0.5 rounded border border-red-100">"{confirmModal.keyword}"</span> di bawah ini untuk melanjutkan:
                </label>
                <input 
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={`Ketik: ${confirmModal.keyword}`}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 focus:border-red-500 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all text-center"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  disabled={confirmInput !== confirmModal.keyword}
                  onClick={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    confirmModal.onConfirm();
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(220,38,38,0.3)] disabled:shadow-none"
                >
                  <i className="fa-solid fa-bolt"></i> Eksekusi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wipe Data Modal */}
        {isWipeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pb-20">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isWiping && setIsWipeModalOpen(false)}></div>
            <div className="bg-white rounded-2xl p-4 shadow-2xl w-full max-w-sm relative z-10 border border-red-300 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                    <i className="fa-solid fa-bomb text-sm animate-pulse"></i>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-red-700 uppercase leading-none">Factory Reset</h3>
                    <p className="text-[8px] text-red-500 font-bold mt-0.5 leading-none">Pilih data yang dihapus</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-2 bg-red-50 p-2 rounded-lg border border-red-100">
                <p className="text-[9px] text-red-800 leading-tight font-semibold">
                  Tindakan ini tidak dapat dibatalkan. Centang data untuk dihapus.
                </p>
              </div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Opsi Penghapusan</span>
                <button 
                  onClick={() => {
                    const isAll = wipeOptions.medali && wipeOptions.dokumentasi && wipeOptions.profil && wipeOptions.akun;
                    setWipeOptions({ medali: !isAll, akun: !isAll, dokumentasi: !isAll, profil: !isAll });
                  }}
                  className="text-[9px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                >
                  <i className={`fa-solid ${wipeOptions.medali && wipeOptions.dokumentasi && wipeOptions.profil && wipeOptions.akun ? 'fa-square-minus' : 'fa-check-double'}`}></i>
                  {wipeOptions.medali && wipeOptions.dokumentasi && wipeOptions.profil && wipeOptions.akun ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              </div>

              <div className="space-y-1.5 mb-3">
                <label className="flex items-center gap-2 py-1.5 px-2 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/50 cursor-pointer transition-all">
                  <input type="checkbox" checked={wipeOptions.medali} onChange={(e) => setWipeOptions(p => ({ ...p, medali: e.target.checked }))} className="w-3 h-3 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                  <div>
                    <div className="text-[10px] font-bold text-gray-800 leading-none">Data Medali (Skor)</div>
                    <div className="text-[8px] text-gray-500 mt-0.5 leading-none">Mengembalikan skor ke angka 0.</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 py-1.5 px-2 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/50 cursor-pointer transition-all">
                  <input type="checkbox" checked={wipeOptions.dokumentasi} onChange={(e) => setWipeOptions(p => ({ ...p, dokumentasi: e.target.checked }))} className="w-3 h-3 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                  <div>
                    <div className="text-[10px] font-bold text-gray-800 leading-none">Dokumentasi (Feed)</div>
                    <div className="text-[8px] text-gray-500 mt-0.5 leading-none">Menghapus riwayat foto di beranda.</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 py-1.5 px-2 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/50 cursor-pointer transition-all">
                  <input type="checkbox" checked={wipeOptions.profil} onChange={(e) => setWipeOptions(p => ({ ...p, profil: e.target.checked }))} className="w-3 h-3 text-red-600 border-gray-300 rounded focus:ring-red-500" />
                  <div>
                    <div className="text-[10px] font-bold text-gray-800 leading-none">Foto Profil Akun</div>
                    <div className="text-[8px] text-gray-500 mt-0.5 leading-none">Menghapus foto profil pengguna.</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 py-1.5 px-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 cursor-pointer transition-all">
                  <input type="checkbox" checked={wipeOptions.akun} onChange={(e) => setWipeOptions(p => ({ ...p, akun: e.target.checked }))} className="w-3 h-3 text-red-600 border-red-300 rounded focus:ring-red-500" />
                  <div>
                    <div className="text-[10px] font-bold text-red-800 leading-none">Hapus Seluruh Akun</div>
                    <div className="text-[8px] text-red-600 mt-0.5 leading-none">Menghapus SEMUA AKUN ADMIN.</div>
                  </div>
                </label>
              </div>

              <div className="mb-3">
                <label className="block text-[9px] font-bold text-gray-700 mb-1">
                  Ketik <span className="text-red-600 select-all bg-red-50 px-1 py-0.5 rounded border border-red-100">konfirmasi hapus data</span>:
                </label>
                <input 
                  type="text"
                  value={wipeConfirmInput}
                  onChange={(e) => setWipeConfirmInput(e.target.value)}
                  placeholder="Ketik disini..."
                  disabled={isWiping}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-200 focus:border-red-500 rounded-lg text-[10px] font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-center"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  disabled={isWiping}
                  onClick={() => setIsWipeModalOpen(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  disabled={isWiping || wipeConfirmInput !== 'konfirmasi hapus data' || (!wipeOptions.medali && !wipeOptions.akun && !wipeOptions.dokumentasi && !wipeOptions.profil)}
                  onClick={executeWipeData}
                  className="flex-[2] py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(220,38,38,0.3)] disabled:shadow-none"
                >
                  {isWiping ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Mengeksekusi...</>
                  ) : (
                    <><i className="fa-solid fa-skull-crossbones"></i> Eksekusi Kiamat</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </main>
  );
}
