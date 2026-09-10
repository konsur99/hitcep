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
  'tinju-pertina': { name: "TINJU (PERTINA)", image: "/cabor/tinju.png" },
  'softball-baseball': { name: "SOFTBALL & BASEBALL", image: "/cabor/softball-dan-baseball.png" },
  'gantole': { name: "GANTOLE", image: "/cabor/gantolle.png" },
  'dance-sport': { name: "DANCE SPORT", image: "/cabor/dansa-sport.png" },
  'bola-voli': { name: "BOLA VOLI", image: "/cabor/bola-voli.png" },
  'shorinji-kempo': { name: "SHORINJI KEMPO", image: "/cabor/shorinji-kempo.png" }
};

const MAPPING = {
  'tinju': 'tinju-pertina',
  'tinju-amatir': 'tinju-pertina',
  'soft-ball': 'softball-baseball',
  'gantolle': 'gantole',
  'dansa': 'dance-sport',
  'bola-volly': 'bola-voli',
  'kempo': 'shorinji-kempo'
};

async function migrate() {
  console.log("Starting migration...");
  
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
      
      // Accumulate medals
      if (!accumulatedMedals[targetId]) {
        accumulatedMedals[targetId] = { gold: 0, silver: 0, bronze: 0 };
      }
      accumulatedMedals[targetId].gold += (data.gold || 0);
      accumulatedMedals[targetId].silver += (data.silver || 0);
      accumulatedMedals[targetId].bronze += (data.bronze || 0);
      
      // Migrate medals
      const medalsSnap = await db.collection('medals').where('caborId', '==', id).get();
      medalsSnap.forEach(mDoc => {
        batch.update(mDoc.ref, { 
          caborId: targetId, 
          caborName: TARGET_CABORS[targetId].name 
        });
        operations++;
      });
      
      // Migrate reports
      const reportsSnap = await db.collection('reports').where('caborId', '==', id).get();
      reportsSnap.forEach(rDoc => {
        batch.update(rDoc.ref, { 
          caborId: targetId, 
          caborName: TARGET_CABORS[targetId].name 
        });
        operations++;
      });
      
      // Delete old cabor
      batch.delete(doc.ref);
      operations++;
      
      if (operations >= 400) await commitBatch();
    }
  }
  
  await commitBatch(); // commit remaining

  // Now ensure target cabors exist and have correct accumulated medals and names
  console.log("Upserting target cabors...");
  const targetBatch = db.batch();
  
  for (const [tId, tData] of Object.entries(TARGET_CABORS)) {
    const tRef = db.collection('cabors').doc(tId);
    const tDoc = await tRef.get();
    
    const acc = accumulatedMedals[tId] || { gold: 0, silver: 0, bronze: 0 };
    
    if (tDoc.exists) {
      // It exists (maybe it was already the correct ID like 'softball-baseball', 'gantole', 'dance-sport', 'bola-voli', 'shorinji-kempo')
      const existingData = tDoc.data();
      targetBatch.update(tRef, {
        name: tData.name,
        logo: tData.image,
        gold: (existingData.gold || 0) + acc.gold,
        silver: (existingData.silver || 0) + acc.silver,
        bronze: (existingData.bronze || 0) + acc.bronze,
      });
    } else {
      // It doesn't exist (like 'tinju-pertina' if we just renamed 'tinju-amatir')
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
