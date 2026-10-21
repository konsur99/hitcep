const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const https = require('https');
const xlsx = require('xlsx');

// 1. Baca Environment Variables
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1].trim()] = val.replace(/\\n/g, '\n');
  }
});

// 2. Inisialisasi Firebase
initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY
  })
});

const db = getFirestore();

// Helper untuk download gambar
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    // Jika URL menggunakan http, ubah ke https
    if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
    }
    
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`Gagal download: ${res.statusCode} - ${url}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Format tanggal
function formatDate(timestamp) {
  if (!timestamp) return '-';
  let date;
  if (typeof timestamp.toDate === 'function') date = timestamp.toDate();
  else if (timestamp._seconds) date = new Date(timestamp._seconds * 1000);
  else date = new Date(timestamp);
  
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

async function runBackup() {
  console.log("🚀 Memulai Proses Backup Data Porprov KONI Surakarta...");
  
  // 3. Buat Folder Backup
  const backupDir = path.join(__dirname, '..', 'Backup_Porprov');
  const fotoMedaliDir = path.join(backupDir, 'Foto_Medali');
  const fotoPelaporanDir = path.join(backupDir, 'Foto_Pelaporan');
  
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  if (!fs.existsSync(fotoMedaliDir)) fs.mkdirSync(fotoMedaliDir);
  if (!fs.existsSync(fotoPelaporanDir)) fs.mkdirSync(fotoPelaporanDir);
  
  console.log("📁 Folder backup berhasil disiapkan.");

  // 4. Ambil Daftar Cabor
  const caborsSnap = await db.collection('users').where('role', '==', 'cabor').get();
  const caborMap = {};
  caborsSnap.forEach(doc => {
    const data = doc.data();
    caborMap[data.caborId || doc.id] = data.name;
  });

  // 5. Ambil Data Medali
  console.log("⏳ Mengambil data Medali dari database...");
  const medalsSnap = await db.collection('medals').get();
  const dataMedaliExcel = [];
  let medaliImageCount = 0;
  
  for (const doc of medalsSnap.docs) {
    const data = doc.data();
    const caborName = caborMap[data.caborId] || data.caborId || 'Tidak Diketahui';
    
    // Siapkan baris Excel
    dataMedaliExcel.push({
      ID: doc.id,
      Cabor: caborName,
      'Nama Atlet / Regu': data.athleteName,
      'Jenis / Kategori': data.isTeam ? 'Beregu' : 'Individu',
      'Tipe Medali': (data.medalType || '').toUpperCase(),
      'Nomor Pertandingan': data.matchNumber || '-',
      Validasi: data.isValidated ? 'Valid' : 'Menunggu',
      'Waktu Input': formatDate(data.createdAt),
      'Link Foto Atlet': data.portraitUrl || '-',
      'Link Foto Penyerahan Medali': data.ceremonyUrl || '-'
    });

    // Download Foto Medali
    const safeAthleteName = data.athleteName ? data.athleteName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : 'Atlet';
    const safeCabor = caborName ? caborName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : 'Cabor';

    if (data.portraitUrl && !data.portraitUrl.includes('placeholder')) {
      try {
        const fileName = `${safeCabor}_${data.medalType}_${safeAthleteName}_Atlet.jpg`;
        const filePath = path.join(fotoMedaliDir, fileName);
        
        await downloadImage(data.portraitUrl, filePath);
        medaliImageCount++;
      } catch (err) {
        console.error(`Gagal download foto atlet ID ${doc.id}: ${err.message}`);
      }
    }

    if (data.ceremonyUrl && !data.ceremonyUrl.includes('placeholder')) {
      try {
        const fileName = `${safeCabor}_${data.medalType}_${safeAthleteName}_Medali.jpg`;
        const filePath = path.join(fotoMedaliDir, fileName);
        
        await downloadImage(data.ceremonyUrl, filePath);
        medaliImageCount++;
      } catch (err) {
        console.error(`Gagal download foto penyerahan medali ID ${doc.id}: ${err.message}`);
      }
    }
  }
  console.log(`✅ Berhasil membackup ${dataMedaliExcel.length} baris data Medali dan ${medaliImageCount} foto.`);

  // 6. Ambil Data Pelaporan
  console.log("⏳ Mengambil data Pelaporan dari database...");
  const reportsSnap = await db.collection('reports').get();
  const dataPelaporanExcel = [];
  let pelaporanImageCount = 0;
  
  for (const doc of reportsSnap.docs) {
    const data = doc.data();
    const caborName = caborMap[data.caborId] || data.caborId || 'Tidak Diketahui';
    
    // Siapkan baris Excel
    dataPelaporanExcel.push({
      ID: doc.id,
      Cabor: caborName,
      'Isi Laporan': data.description || data.content || '-',
      Status: (data.status || 'pending').toUpperCase(),
      'Balasan (Admin)': data.reply || '-',
      'Waktu Lapor': formatDate(data.createdAt),
      'Link Foto Laporan': data.imageUrl || '-'
    });

    // Download Foto Pelaporan
    if (data.imageUrl) {
      try {
        const safeCabor = caborName ? caborName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : 'Cabor';
        const fileName = `${safeCabor}_Laporan_${doc.id.substring(0,8)}.jpg`;
        const filePath = path.join(fotoPelaporanDir, fileName);
        
        await downloadImage(data.imageUrl, filePath);
        pelaporanImageCount++;
      } catch (err) {
        console.error(`Gagal download foto pelaporan ID ${doc.id}: ${err.message}`);
      }
    }
  }
  console.log(`✅ Berhasil membackup ${dataPelaporanExcel.length} baris data Pelaporan dan ${pelaporanImageCount} foto.`);

  // 7. Buat File Excel
  console.log("⏳ Sedang menyusun file Excel yang rapi...");
  const wb = xlsx.utils.book_new();
  
  // Sheet Medali
  const wsMedali = xlsx.utils.json_to_sheet(dataMedaliExcel);
  wsMedali['!cols'] = [
    {wch: 25}, {wch: 25}, {wch: 35}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 20}, {wch: 45}, {wch: 45}
  ];
  xlsx.utils.book_append_sheet(wb, wsMedali, "Data Medali");
  
  // Sheet Pelaporan
  const wsPelaporan = xlsx.utils.json_to_sheet(dataPelaporanExcel);
  wsPelaporan['!cols'] = [
    {wch: 25}, {wch: 25}, {wch: 50}, {wch: 15}, {wch: 40}, {wch: 20}, {wch: 50}
  ];
  xlsx.utils.book_append_sheet(wb, wsPelaporan, "Data Pelaporan");
  
  // Simpan Excel
  const excelPath = path.join(backupDir, 'Backup_Data_Porprov_2026.xlsx');
  xlsx.writeFile(wb, excelPath);
  
  console.log(`\n🎉 SELESAI! Semua data telah di-backup ke folder: Backup_Porprov`);
}

runBackup().catch(console.error);
