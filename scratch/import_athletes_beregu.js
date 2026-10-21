const xlsx = require('xlsx');
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

const MAP_EXCEL_TO_DB = {
  'AEROMODELLING': { id: 'aeromedelling', name: 'AEROMEDELLING' },
  'AKUATIK': { id: 'akuatik', name: 'AKUATIK' },
  'ANGGAR': { id: 'anggar', name: 'ANGGAR' },
  'Angkat Berat': { id: 'angkat-berat', name: 'ANGKAT BERAT' },
  'Angkat Besi': { id: 'angkat-besi', name: 'ANGKAT BESI' },
  'Atletik': { id: 'atletik', name: 'ATLETIK' },
  'BOLA VOLI': { id: 'bola-volly', name: 'BOLA VOLLY' },
  'Balap Motor': { id: 'balap-motor', name: 'BALAP MOTOR' },
  'Balap Sepeda': { id: 'balap-sepeda', name: 'BALAP SEPEDA' },
  'Barongsai': { id: 'barongsai', name: 'BARONGSAI' },
  'Billiar': { id: 'billiar', name: 'BILLIAR' },
  'Binaraga': { id: 'binaraga', name: 'BINARAGA' },
  'Bola Basket': { id: 'bola-basket', name: 'BOLA BASKET' },
  'Bola Tangan': { id: 'bola-tangan', name: 'BOLA TANGAN' },
  'Bridge': { id: 'bridge', name: 'BRIDGE' },
  'Bulutangkis': { id: 'bulu-tangkis', name: 'BULU TANGKIS' },
  'Catur': { id: 'catur', name: 'CATUR' },
  'DRUMBAND': { id: 'drum-band', name: 'DRUM BAND' },
  'Dance Sport': { id: 'dansa', name: 'DANSA' },
  'E-SPORT': { id: 'esport', name: 'ESPORT' },
  'FUTSAL': { id: 'futsal', name: 'FUTSAL' },
  'GANTOLLE': { id: 'gantole', name: 'GANTOLE' },
  'Gateball': { id: 'gateball', name: 'GATEBALL' },
  'Gimnastik': { id: 'senam', name: 'SENAM' },
  'Golf': { id: 'golf', name: 'GOLF' },
  'Gulat': { id: 'gulat', name: 'GULAT' },
  'Hapkido': { id: 'hapkido', name: 'HAPKIDO' },
  'Hockey': { id: 'hockey', name: 'HOCKEY' },
  'Ju-Jitsu': { id: 'jujitsu', name: 'JUJITSU' },
  'Judo': { id: 'judo', name: 'JUDO' },
  'Karate': { id: 'karate', name: 'KARATE' },
  'Kick Boxing': { id: 'kickboxing', name: 'KICKBOXING' },
  'Menembak': { id: 'menembak', name: 'MENEMBAK' },
  'Muaythai': { id: 'muaythai', name: 'MUAYTHAI' },
  'Panahan': { id: 'panahan', name: 'PANAHAN' },
  'Panjat Tebing': { id: 'panjat-tebing', name: 'PANJAT TEBING' },
  'Paralayang': { id: 'paralayang', name: 'PARALAYANG' },
  'Pencak Silat': { id: 'pencak-silat', name: 'PENCAK SILAT' },
  'Petanque': { id: 'petanque', name: 'PETANQUE' },
  'Rugby': { id: 'rugby', name: 'RUGBY' },
  'SELAM': { id: 'selam', name: 'SELAM' },
  'SEPAK BOLA': { id: 'sepak-bola', name: 'SEPAK BOLA' },
  'SEPATU RODA': { id: 'sepatu-roda', name: 'SEPATU RODA' },
  'Sambo': { id: 'sambo', name: 'SAMBO' },
  'Shorinji Kempo': { id: 'kempo', name: 'KEMPO' },
  'Soft Ball': { id: 'softball-baseball', name: 'SOFTBALL&BASEBALL' },
  'TARUNG DERAJAT': { id: 'tarung-derajat', name: 'TARUNG DERAJAT' },
  'TENIS LAPANGAN': { id: 'tenis-lapangan', name: 'TENIS LAPANGAN' },
  'TENIS MEJA': { id: 'tenis-meja', name: 'TENIS MEJA' },
  'TINJU': { id: 'tinju-pertina', name: 'TINJU (PERTINA)' }, 
  'Tae Kwon Do': { id: 'taekwondo', name: 'TAEKWONDO' },
  'WOODBALL': { id: 'woodball', name: 'WOODBALL' },
  'WUSHU': { id: 'wushu', name: 'WUSHU' },
  'XIANGQI': { id: 'xiangqi', name: 'XIANGQI' }
};

async function run() {
  console.log("Reading Excel file...");
  const filePath = 'C:\\Users\\User\\Downloads\\LIST ATLIT CONTOH - nomor pertandingan porprov - 11 sept 2026.xlsx';
  const workbook = xlsx.readFile(filePath);
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  
  const athletes = [];
  const teamsMap = new Map();

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (row && row[1]) { // CABOR is at index 1
      const rawCabor = row[1].toString().trim();
      const matchCat = row[2] ? row[2].toString().trim() : '';
      const rawName = row[3] ? row[3].toString().trim() : '';
      const isTeamFlag = row[5] ? row[5].toString().trim().toUpperCase() : '';
      
      const mapped = MAP_EXCEL_TO_DB[rawCabor];
      if (!mapped) continue;

      const isTeam = isTeamFlag.startsWith('YA');

      if (isTeam) {
        const teamKey = `${mapped.id}_${matchCat}`;
        if (!teamsMap.has(teamKey)) {
          teamsMap.set(teamKey, {
            name: matchCat, // Display name for dropdown
            matchCategory: matchCat,
            caborId: mapped.id,
            caborName: mapped.name,
            isTeam: true,
            athleteNames: [],
            createdAt: new Date().toISOString()
          });
        }
        
        if (rawName && rawName !== '-') {
          const t = teamsMap.get(teamKey);
          if (!t.athleteNames.includes(rawName)) {
             t.athleteNames.push(rawName);
          }
        }
      } else {
        if (rawName && rawName !== '-') {
          athletes.push({
            name: rawName,
            matchCategory: matchCat,
            caborId: mapped.id,
            caborName: mapped.name,
            isTeam: false,
            athleteNames: [rawName], // also populate this for consistency
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  }

  // Combine teams and individual athletes
  const allEntries = [...athletes, ...teamsMap.values()];

  console.log(`Parsed ${allEntries.length} total valid entries (${teamsMap.size} teams, ${athletes.length} individuals).`);

  console.log("Wiping existing athletes...");
  const existingSnap = await db.collection('athletes').get();
  
  let delBatch = db.batch();
  let delOps = 0;
  for (const doc of existingSnap.docs) {
    delBatch.delete(doc.ref);
    delOps++;
    if (delOps >= 400) {
      await delBatch.commit();
      console.log(`Deleted ${delOps} old records...`);
      delBatch = db.batch();
      delOps = 0;
    }
  }
  if (delOps > 0) await delBatch.commit();

  console.log("Inserting new athletes & teams...");
  let insBatch = db.batch();
  let insOps = 0;
  for (const entry of allEntries) {
    const ref = db.collection('athletes').doc();
    insBatch.set(ref, entry);
    insOps++;
    if (insOps >= 400) {
      await insBatch.commit();
      console.log(`Inserted ${insOps} new records...`);
      insBatch = db.batch();
      insOps = 0;
    }
  }
  if (insOps > 0) await insBatch.commit();
  console.log("Insert complete! Done.");
}

run().catch(console.error);
