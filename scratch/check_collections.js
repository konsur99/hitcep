const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

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

initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY
  })
});

const db = getFirestore();

async function check() {
  // Check medals collection
  const medalsSnap = await db.collection('medals').get();
  console.log(`📊 Koleksi 'medals': ${medalsSnap.size} dokumen`);
  
  // Check sample medal for image fields
  if (medalsSnap.size > 0) {
    const sampleMedal = medalsSnap.docs[0].data();
    console.log('  Sample medal keys:', Object.keys(sampleMedal));
    console.log('  portraitUrl:', sampleMedal.portraitUrl ? 'ADA' : 'TIDAK ADA');
    console.log('  portraitPublicId:', sampleMedal.portraitPublicId || 'TIDAK ADA');
    console.log('  ceremonyUrl:', sampleMedal.ceremonyUrl ? 'ADA' : 'TIDAK ADA');
    console.log('  ceremonyPublicId:', sampleMedal.ceremonyPublicId || 'TIDAK ADA');
  }
  
  // Check reports collection
  const reportsSnap = await db.collection('reports').get();
  console.log(`\n📊 Koleksi 'reports': ${reportsSnap.size} dokumen`);
  
  if (reportsSnap.size > 0) {
    const sampleReport = reportsSnap.docs[0].data();
    console.log('  Sample report keys:', Object.keys(sampleReport));
    console.log('  imageUrl:', sampleReport.imageUrl ? 'ADA' : 'TIDAK ADA');
    console.log('  imagePublicId:', sampleReport.imagePublicId || 'TIDAK ADA');
  }
  
  // Count total images to delete
  let cloudinaryIds = [];
  medalsSnap.forEach(doc => {
    const d = doc.data();
    if (d.portraitPublicId) cloudinaryIds.push(d.portraitPublicId);
    if (d.ceremonyPublicId) cloudinaryIds.push(d.ceremonyPublicId);
  });
  reportsSnap.forEach(doc => {
    const d = doc.data();
    if (d.imagePublicId) cloudinaryIds.push(d.imagePublicId);
  });
  
  console.log(`\n🖼️  Total foto Cloudinary yang akan dihapus: ${cloudinaryIds.length}`);
  console.log(`   Total dokumen yang akan dihapus: ${medalsSnap.size + reportsSnap.size}`);
}

check();
