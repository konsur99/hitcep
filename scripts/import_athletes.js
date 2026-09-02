const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const xlsx = require('xlsx');

// 1. Parse .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    envVars[key] = val;
  }
});

// 2. Init Firebase
initializeApp({
  credential: cert({
    projectId: envVars.FIREBASE_PROJECT_ID,
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
    privateKey: envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});
const db = getFirestore();

async function main() {
  try {
    const filePath = 'C:\\Users\\User\\Downloads\\DATA BY NAME SI SAKTI - PORPROV 2026 - APLIKASI KONI.xlsx';
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const dataRows = rows.slice(2);
    
    const athletesCol = db.collection('athletes');
    const caborsCol = db.collection('cabors');
    
    console.log('Fetching existing cabors...');
    const caborsSnap = await caborsCol.get();
    const caborMap = {};
    caborsSnap.docs.forEach(doc => {
      const dbName = doc.data().name;
      if (dbName) {
        const normalized = dbName.toLowerCase().replace(/[^a-z0-9]/g, '');
        caborMap[normalized] = doc.id;
      }
    });
    
    console.log('Wiping existing athletes...');
    const existing = await athletesCol.get();
    let wipeBatch = db.batch();
    let wipeCount = 0;
    for (const doc of existing.docs) {
      wipeBatch.delete(doc.ref);
      wipeCount++;
      if (wipeCount === 500) {
        await wipeBatch.commit();
        wipeBatch = db.batch();
        wipeCount = 0;
      }
    }
    if (wipeCount > 0) await wipeBatch.commit();
    console.log('Wiped existing athletes.');

    let batch = db.batch();
    let count = 0;
    let totalInserted = 0;
    let newCaborsAdded = new Set();

    for (const row of dataRows) {
      const rawCabor = row[1] ? String(row[1]).trim() : '';
      const matchCategory = row[2] ? String(row[2]).trim() : '';
      const athleteName = row[3] ? String(row[3]).trim() : '';
      
      if (!rawCabor || !athleteName) continue;
      
      const normalizedRaw = rawCabor.toLowerCase().replace(/[^a-z0-9]/g, '');
      let matchedCaborId = caborMap[normalizedRaw];
      
      if (!matchedCaborId) {
        // Create new cabor on the fly
        const newSlug = rawCabor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        matchedCaborId = newSlug;
        caborMap[normalizedRaw] = matchedCaborId;
        newCaborsAdded.add(rawCabor);
        
        const caborRef = caborsCol.doc(matchedCaborId);
        batch.set(caborRef, {
          name: rawCabor,
          type: 'Terukur', // default
          category: 'Beladiri', // default
          createdAt: new Date().toISOString()
        });
        count++;
      }
      
      const docRef = athletesCol.doc();
      batch.set(docRef, {
        caborId: matchedCaborId,
        caborName: rawCabor,
        matchCategory: matchCategory,
        name: athleteName,
        createdAt: new Date().toISOString()
      });
      
      count++;
      totalInserted++;
      
      if (count >= 450) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    
    console.log(`Successfully inserted ${totalInserted} athletes!`);
    if (newCaborsAdded.size > 0) {
      console.log('Automatically created new cabors in database:', Array.from(newCaborsAdded));
    }
  } catch (error) {
    console.error('Error importing:', error);
  }
}

main();
