const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n');
});

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    })
  });
}

const db = admin.firestore();

async function run() {
  const docRef = db.collection('public_cache').doc('v1');
  const snap = await docRef.get();
  const data = snap.data();
  
  if (data && data.cabors) {
    // Top 4 get some medals so they light up
    data.cabors[0].gold = 5;
    data.cabors[0].silver = 2;
    data.cabors[0].bronze = 1;
    
    data.cabors[1].gold = 0;
    data.cabors[1].silver = 3;
    data.cabors[1].bronze = 0;

    data.cabors[2].gold = 0;
    data.cabors[2].silver = 0;
    data.cabors[2].bronze = 4;

    data.cabors[3].gold = 7;
    data.cabors[3].silver = 5;
    data.cabors[3].bronze = 3;
    
    await docRef.update({ cabors: data.cabors });
    console.log('Dummy medals successfully added to Firebase!');
  }
}

run();
