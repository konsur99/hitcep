const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n');
});

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  })
});
const db = getFirestore();

async function fixMedals() {
  const snap = await db.collection('medals').get();
  const batch = db.batch();
  let i = 0;
  snap.forEach(doc => {
    const data = doc.data();
    if (data.portraitUrl && data.portraitUrl.includes('placeholder.com')) {
      batch.update(doc.ref, {
        portraitUrl: i % 2 === 0 ? '/portrait-1.webp' : '/portrait-2.webp',
        ceremonyUrl: i % 2 === 0 ? '/ceremony-1.webp' : '/ceremony-2.webp'
      });
      i++;
    }
  });
  await batch.commit();
  console.log('Fixed medals:', i);
}

fixMedals();
