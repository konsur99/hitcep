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

const TARGET_CABORS = {
  'tinju-amatir': { name: "TINJU AMATIR", image: "/cabor/tinju.png" },
  'dansa': { name: "DANSA", image: "/cabor/dansa-sport.png" },
  'bola-volly': { name: "BOLA VOLLY", image: "/cabor/bola-voli.png" },
  'kempo': { name: "KEMPO", image: "/cabor/kempo.png" },
  'aeromedelling': { name: "AEROMEDELLING", image: "/cabor/aeromodelling.png" },
  'senam': { name: "SENAM", image: "/cabor/senam.png" },
  'softball-baseball': { name: "SOFTBALL&BASEBALL", image: "/cabor/softball-dan-baseball.png" }
};

const MAPPING = {
  'tinju-pertina': 'tinju-amatir',
  'dance-sport': 'dansa',
  'bola-voli': 'bola-volly',
  'shorinji-kempo': 'kempo',
  'aeromodelling': 'aeromedelling',
  'gimnastik': 'senam'
};

async function migrate() {
  console.log("Starting revert migration...");
  
  const caborsSnap = await db.collection('cabors').get();
  
  const accumulatedMedals = {};
  
  const batch = db.batch();
  let operations = 0;

  async function commitBatch() {
    if (operations > 0) {
      await batch.commit();
      console.log(`Committed ${operations} operations`);
      operations = 0;
    }
  }

  for (const doc of caborsSnap.docs) {
    const id = doc.id;
    if (MAPPING[id]) {
      const targetId = MAPPING[id];
      const data = doc.data();
      
      console.log(`Migrating ${id} -> ${targetId}`);
      
      if (!accumulatedMedals[targetId]) {
        accumulatedMedals[targetId] = { gold: 0, silver: 0, bronze: 0 };
      }
      accumulatedMedals[targetId].gold += (data.gold || 0);
      accumulatedMedals[targetId].silver += (data.silver || 0);
      accumulatedMedals[targetId].bronze += (data.bronze || 0);
      
      const medalsSnap = await db.collection('medals').where('caborId', '==', id).get();
      medalsSnap.forEach(mDoc => {
        batch.update(mDoc.ref, { 
          caborId: targetId, 
          caborName: TARGET_CABORS[targetId].name 
        });
        operations++;
      });
      
      const reportsSnap = await db.collection('reports').where('caborId', '==', id).get();
      reportsSnap.forEach(rDoc => {
        batch.update(rDoc.ref, { 
          caborId: targetId, 
          caborName: TARGET_CABORS[targetId].name 
        });
        operations++;
      });
      
      batch.delete(doc.ref);
      operations++;
      
      if (operations >= 400) await commitBatch();
    } else if (TARGET_CABORS[id]) {
      // Also update display names of targets just in case (e.g. softball-baseball needs its display name updated to SOFTBALL&BASEBALL)
      batch.update(doc.ref, { name: TARGET_CABORS[id].name });
      operations++;
    }
  }
  
  await commitBatch();

  console.log("Upserting target cabors...");
  const targetBatch = db.batch();
  
  for (const [tId, tData] of Object.entries(TARGET_CABORS)) {
    const tRef = db.collection('cabors').doc(tId);
    const tDoc = await tRef.get();
    
    const acc = accumulatedMedals[tId] || { gold: 0, silver: 0, bronze: 0 };
    
    if (tDoc.exists) {
      const existingData = tDoc.data();
      targetBatch.update(tRef, {
        name: tData.name,
        logo: tData.image,
        gold: (existingData.gold || 0) + acc.gold,
        silver: (existingData.silver || 0) + acc.silver,
        bronze: (existingData.bronze || 0) + acc.bronze,
      });
    } else {
      targetBatch.set(tRef, {
        name: tData.name,
        logo: tData.image,
        gold: acc.gold,
        silver: acc.silver,
        bronze: acc.bronze,
        createdAt: new Date().toISOString()
      });
    }
  }
  
  await targetBatch.commit();
  console.log("Migration complete!");
}

migrate().catch(console.error);
