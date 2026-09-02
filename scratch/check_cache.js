const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"')) val = val.substring(1, val.length - 1);
    envVars[key] = val;
  }
});

initializeApp({
  credential: cert({
    projectId: envVars.FIREBASE_PROJECT_ID,
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
    privateKey: envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const db = getFirestore();
db.collection('public_cache').doc('v1').get().then(doc => {
  const data = doc.data();
  console.log("Reports count:", (data.reports || []).length);
  console.log("MedaliTerbaru count:", (data.medaliTerbaru || []).length);
  console.log("Medals count:", (data.medals || []).length);
  process.exit(0);
}).catch(console.error);
