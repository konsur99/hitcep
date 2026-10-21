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
  // 1. Cek reports collection
  const reportsSnap = await db.collection('reports').get();
  console.log(`📊 Koleksi 'reports': ${reportsSnap.size} dokumen`);
  reportsSnap.forEach(doc => {
    console.log(`  - ${doc.id}: ${doc.data().title || doc.data().description?.substring(0, 50)}`);
  });

  // 2. Cek medals collection
  const medalsSnap = await db.collection('medals').get();
  console.log(`\n📊 Koleksi 'medals': ${medalsSnap.size} dokumen`);

  // 3. Cek public_cache
  const cacheDoc = await db.collection('public_cache').doc('v1').get();
  if (cacheDoc.exists) {
    const cacheData = cacheDoc.data();
    console.log(`\n📊 Cache 'public_cache/v1':`);
    console.log(`  Keys: ${Object.keys(cacheData)}`);
    if (cacheData.reports) {
      console.log(`  reports dalam cache: ${Array.isArray(cacheData.reports) ? cacheData.reports.length : 'bukan array'}`);
      if (Array.isArray(cacheData.reports) && cacheData.reports.length > 0) {
        console.log(`  Sample: ${JSON.stringify(cacheData.reports[0]).substring(0, 200)}`);
      }
    }
    if (cacheData.medals) {
      console.log(`  medals dalam cache: ${typeof cacheData.medals}`);
    }
    if (cacheData.totalMedals !== undefined) {
      console.log(`  totalMedals: ${cacheData.totalMedals}`);
    }
    if (cacheData.totalReports !== undefined) {
      console.log(`  totalReports: ${cacheData.totalReports}`);
    }
    // Show all top-level keys and their types/lengths
    for (const [key, val] of Object.entries(cacheData)) {
      const type = Array.isArray(val) ? `array(${val.length})` : typeof val;
      console.log(`  ${key}: ${type}`);
    }
  } else {
    console.log('\n📊 Cache public_cache/v1 TIDAK ADA');
  }
}

check();
