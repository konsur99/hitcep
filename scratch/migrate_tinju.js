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

async function migrate() {
  console.log("Starting tinju migration...");
  const batch = db.batch();
  let operations = 0;

  const oldRef = db.collection('cabors').doc('tinju-amatir');
  const oldDoc = await oldRef.get();

  if (oldDoc.exists) {
    const data = oldDoc.data();
    console.log("Found tinju-amatir, migrating to tinju-pertina");
    
    // Create new
    const newRef = db.collection('cabors').doc('tinju-pertina');
    batch.set(newRef, {
      ...data,
      name: "TINJU (PERTINA)",
      createdAt: new Date().toISOString()
    });
    operations++;

    // Update medals
    const medalsSnap = await db.collection('medals').where('caborId', '==', 'tinju-amatir').get();
    medalsSnap.forEach(mDoc => {
      batch.update(mDoc.ref, { caborId: 'tinju-pertina', caborName: "TINJU (PERTINA)" });
      operations++;
    });

    // Update reports
    const reportsSnap = await db.collection('reports').where('caborId', '==', 'tinju-amatir').get();
    reportsSnap.forEach(rDoc => {
      batch.update(rDoc.ref, { caborId: 'tinju-pertina', caborName: "TINJU (PERTINA)" });
      operations++;
    });

    // Delete old
    batch.delete(oldRef);
    operations++;
  } else {
    // Maybe it's already tinju-pertina? Let's check
    const existingRef = db.collection('cabors').doc('tinju-pertina');
    const existingDoc = await existingRef.get();
    if (existingDoc.exists) {
      batch.update(existingRef, { name: "TINJU (PERTINA)" });
      operations++;
    }
  }

  if (operations > 0) {
    await batch.commit();
    console.log(`Committed ${operations} operations`);
  } else {
    console.log("Nothing to do");
  }
}

migrate().catch(console.error);
