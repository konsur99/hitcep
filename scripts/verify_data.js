const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// 1. Parse .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    envVars[key] = val;
  }
});

// 2. Init Firebase
initializeApp({
  credential: cert({
    projectId: envVars.FIREBASE_PROJECT_ID,
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
    privateKey: envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});
const db = getFirestore();

async function checkData() {
  const caborsSnap = await db.collection('cabors').get();
  console.log('=== DATA CABOR ===');
  console.log(`Total Cabor di Database: ${caborsSnap.size}`);
  const sampleCabors = caborsSnap.docs.slice(0, 3).map(d => d.data().name);
  console.log(`Contoh Cabor terdaftar: ${sampleCabors.join(', ')} ...`);
  console.log('------------------');

  const athletesSnap = await db.collection('athletes').get();
  console.log('=== DATA ATLET ===');
  console.log(`Total Atlet di Database: ${athletesSnap.size}`);
  const sampleAthletes = athletesSnap.docs.slice(0, 3).map(d => `${d.data().name} (${d.data().caborName} - ${d.data().matchCategory})`);
  console.log(`Contoh Atlet terdaftar:\n- ${sampleAthletes.join('\n- ')}\n...`);
  console.log('------------------');
}

checkData().catch(console.error);
