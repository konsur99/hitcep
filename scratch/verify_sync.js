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
  const snap = await db.collection('athletes').get();
  console.log(`Total Athletes: ${snap.size}`);
  
  const cabors = {};
  snap.forEach(doc => {
    const data = doc.data();
    cabors[data.caborName] = (cabors[data.caborName] || 0) + 1;
  });
  
  console.log(cabors);
}

check().catch(console.error);
