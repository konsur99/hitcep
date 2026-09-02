const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n');
});

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  })
});
const db = getFirestore();

async function run() {
  console.log('Syncing database to public_cache/v1...');
  
  const caborsSnap = await db.collection('cabors').get();
  const cabors = [];
  caborsSnap.forEach(doc => cabors.push({ id: doc.id, ...doc.data() }));
  
  const medalsSnap = await db.collection('medals').get();
  const medals = [];
  medalsSnap.forEach(doc => medals.push({ id: doc.id, ...doc.data() }));

  const reportsSnap = await db.collection('reports').get();
  const reports = [];
  reportsSnap.forEach(doc => {
    const data = doc.data();
    // Convert Firestore Timestamp to ISO string for JSON serialization in cache
    if (data.incidentTime && data.incidentTime.toDate) {
      data.incidentTime = data.incidentTime.toDate().toISOString();
    }
    if (data.createdAt && data.createdAt.toDate) {
      data.createdAt = data.createdAt.toDate().toISOString();
    }
    reports.push({ id: doc.id, ...data });
  });

  await db.collection('public_cache').doc('v1').set({
    cabors,
    medals,
    reports
  }, { merge: true });

  console.log('Sync complete!');
}

run().catch(console.error);
