const fs = require('fs');
const admin = require('firebase-admin');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key] = val.join('=').replace(/^\"|\"$/g, '').replace(/\\n/g, '\n');
  return acc;
}, {});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY
  })
});

const db = admin.firestore();
(async () => {
  let count = 0;
  const snap = await db.collection('reports').get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.imageUrl && data.imageUrl.includes('placeholder.com')) {
      await doc.ref.update({ imageUrl: 'https://picsum.photos/seed/koni/400/300' });
      count++;
    }
  }
  
  const cacheRef = db.collection('public_cache').doc('v1');
  const cacheSnap = await cacheRef.get();
  if (cacheSnap.exists) {
    let cacheData = cacheSnap.data();
    let cacheUpdated = false;
    cacheData.reports.forEach(r => {
      if (r.imageUrl && r.imageUrl.includes('placeholder.com')) {
        r.imageUrl = 'https://picsum.photos/seed/koni/400/300';
        cacheUpdated = true;
      }
    });
    if (cacheUpdated) await cacheRef.update({ reports: cacheData.reports });
  }
  console.log('Fixed', count);
})();
