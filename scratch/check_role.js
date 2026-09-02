const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const envVars = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
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
getFirestore().collection('users').get().then(snap => {
  snap.forEach(doc => {
    if(doc.data().role && doc.data().role.toLowerCase() === 'developer') {
      console.log(doc.id, doc.data().role, doc.data().email);
    }
  });
  process.exit(0);
});
