const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n');
});

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// 2. Init Firebase
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  })
});
const db = getFirestore();

const dummyNames = [
  'Budi Santoso', 'Siti Aminah', 'Agus Setiawan', 'Dewi Lestari', 'Joko Susilo', 
  'Wahyu Hidayat', 'Putri Utami', 'Rizky Pratama', 'Eko Purnomo', 'Indah Permata'
];
const dummyCategories = ['Perorangan Putra', 'Perorangan Putri', 'Ganda Putra', 'Ganda Putri', 'Beregu'];
const medalTypes = ['emas', 'perak', 'perunggu'];

const reportTitles = [
  'Fasilitas Kurang Memadai', 
  'Keterlambatan Konsumsi', 
  'Kondisi Lapangan Basah', 
  'Kerusakan Peralatan Medis',
  'Penonton Masuk Lapangan'
];

async function run() {
  console.log('Seeding dummy data...');
  
  // 1. Fetch cabors
  const caborsSnap = await db.collection('cabors').get();
  const cabors = [];
  caborsSnap.forEach(doc => cabors.push({ id: doc.id, ...doc.data() }));
  
  if (cabors.length === 0) {
    console.log('No cabors found. Please import cabors first.');
    return;
  }
  
  let batch = db.batch();
  
  // Add 15 Medals
  for (let i = 0; i < 15; i++) {
    const cabor = cabors[Math.floor(Math.random() * cabors.length)];
    const name = dummyNames[Math.floor(Math.random() * dummyNames.length)];
    const category = dummyCategories[Math.floor(Math.random() * dummyCategories.length)];
    const medalType = medalTypes[Math.floor(Math.random() * medalTypes.length)];
    
    const newMedalRef = db.collection('medals').doc();
    const medalData = {
      caborId: cabor.id,
      athleteName: name,
      category: category,
      date: new Date().toISOString().split('T')[0],
      medalType: medalType,
      portraitUrl: 'https://via.placeholder.com/150',
      portraitPublicId: 'dummy',
      ceremonyUrl: 'https://via.placeholder.com/300x200',
      ceremonyPublicId: 'dummy',
      status: 'approved',
      authorUid: 'dummy_admin',
      createdAt: FieldValue.serverTimestamp(),
      caborName: cabor.name // Cache the cabor name in case it's needed
    };
    
    batch.set(newMedalRef, medalData);
    
    // Update cabor counts directly in db
    const medalField = medalType === 'emas' ? 'gold' : medalType === 'perak' ? 'silver' : 'bronze';
    const caborRef = db.collection('cabors').doc(cabor.id);
    batch.update(caborRef, { [medalField]: FieldValue.increment(1) });
  }

  // Add 10 Reports
  for (let i = 0; i < 10; i++) {
    const cabor = cabors[Math.floor(Math.random() * cabors.length)];
    const title = reportTitles[Math.floor(Math.random() * reportTitles.length)];
    const dateStr = new Date(Date.now() - Math.random() * 86400000 * 5).toISOString(); // random past 5 days
    
    const newReportRef = db.collection('reports').doc();
    batch.set(newReportRef, {
      title: title,
      description: 'Ini adalah deskripsi laporan dummy yang dibuat secara otomatis oleh sistem untuk pengujian UI. Kejadian ini dilaporkan agar segera ditindaklanjuti oleh panitia Porprov 2026.',
      caborName: cabor.name,
      reporterRole: 'Admin Cabor',
      reporterName: dummyNames[Math.floor(Math.random() * dummyNames.length)],
      location: 'Solo',
      specificLocation: 'Stadion Manahan Solo',
      categories: ['Fasilitas', 'Logistik'],
      customCategory: null,
      incidentTime: new Date(dateStr), // Native Firestore Timestamp
      imageUrl: 'https://via.placeholder.com/400x300',
      imagePublicId: 'dummy',
      status: 'approved',
      authorUid: 'dummy_admin',
      createdAt: FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
  console.log('Successfully seeded 15 Medals and 10 Reports!');
}

run().catch(console.error);
