const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
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
const auth = getAuth();

const passwords = [
  'aparajit1689', 'jishnu3698', 'vijaya9186', 'zafar8163', 'ghalib6819', 
  'fawz9381', 'nasr7198', 'mansur8619', 'fath1836', 'najah6981', 
  'falah8319', 'izzah9168', 'muzaffar8691', 'nashir6381', 'digdaya8139', 
  'jayeng7918', 'sakti6813', 'perkasa9186', 'wibawa8693', 'gagah3189', 
  'tangguh9368', 'jayabaya8193', 'mahardika9781', 'vikrama8136', 'abhaya6983', 
  'dhira8617', 'dhruva3691', 'tejas8196', 'ojas6389', 'bala9183', 
  'parakrama8619', 'sthira7139', 'udaya6891', 'prabala8316', 'samartha9186', 
  'nike3691', 'kratos8193', 'arete6819', 'alke9378', 'invictus8619', 
  'victoria9183', 'victor6817', 'triumph8391', 'fortis7168', 'audax9831', 
  'jaya6189', 'menang8361', 'unggul9186', 'juara8613', 'digjaya7931', 
  'jayakarta6893', 'mahajaya8319', 'berjaya8169', 'pemenang9386'
];

const cabors = [
  { id: 'aeromedelling', name: 'AEROMEDELLING' },
  { id: 'akuatik', name: 'AKUATIK' },
  { id: 'anggar', name: 'ANGGAR' },
  { id: 'angkat-berat', name: 'ANGKAT BERAT' },
  { id: 'angkat-besi', name: 'ANGKAT BESI' },
  { id: 'atletik', name: 'ATLETIK' },
  { id: 'bola-volly', name: 'BOLA VOLLY' },
  { id: 'balap-motor', name: 'BALAP MOTOR' },
  { id: 'balap-sepeda', name: 'BALAP SEPEDA' },
  { id: 'barongsai', name: 'BARONGSAI' },
  { id: 'billiar', name: 'BILLIAR' },
  { id: 'binaraga', name: 'BINARAGA' },
  { id: 'bola-basket', name: 'BOLA BASKET' },
  { id: 'bola-tangan', name: 'BOLA TANGAN' },
  { id: 'bridge', name: 'BRIDGE' },
  { id: 'bulu-tangkis', name: 'BULU TANGKIS' },
  { id: 'catur', name: 'CATUR' },
  { id: 'drum-band', name: 'DRUM BAND' },
  { id: 'dansa', name: 'DANSA' },
  { id: 'esport', name: 'ESPORT' },
  { id: 'futsal', name: 'FUTSAL' },
  { id: 'gantole', name: 'GANTOLE' },
  { id: 'gateball', name: 'GATEBALL' },
  { id: 'senam', name: 'SENAM' },
  { id: 'golf', name: 'GOLF' },
  { id: 'gulat', name: 'GULAT' },
  { id: 'hapkido', name: 'HAPKIDO' },
  { id: 'hockey', name: 'HOCKEY' },
  { id: 'jujitsu', name: 'JUJITSU' },
  { id: 'judo', name: 'JUDO' },
  { id: 'karate', name: 'KARATE' },
  { id: 'kickboxing', name: 'KICKBOXING' },
  { id: 'menembak', name: 'MENEMBAK' },
  { id: 'muaythai', name: 'MUAYTHAI' },
  { id: 'panahan', name: 'PANAHAN' },
  { id: 'panjat-tebing', name: 'PANJAT TEBING' },
  { id: 'paralayang', name: 'PARALAYANG' },
  { id: 'pencak-silat', name: 'PENCAK SILAT' },
  { id: 'petanque', name: 'PETANQUE' },
  { id: 'rugby', name: 'RUGBY' },
  { id: 'selam', name: 'SELAM' },
  { id: 'sepak-bola', name: 'SEPAK BOLA' },
  { id: 'sepatu-roda', name: 'SEPATU RODA' },
  { id: 'sambo', name: 'SAMBO' },
  { id: 'kempo', name: 'KEMPO' },
  { id: 'softball-baseball', name: 'SOFTBALL&BASEBALL' },
  { id: 'tarung-derajat', name: 'TARUNG DERAJAT' },
  { id: 'tenis-lapangan', name: 'TENIS LAPANGAN' },
  { id: 'tenis-meja', name: 'TENIS MEJA' },
  { id: 'tinju-pertina', name: 'TINJU (PERTINA)' },
  { id: 'taekwondo', name: 'TAEKWONDO' },
  { id: 'woodball', name: 'WOODBALL' },
  { id: 'wushu', name: 'WUSHU' },
  { id: 'xiangqi', name: 'XIANGQI' }
];

const admins = [
  { email: 'koni@quikkoni.admin', password: '#9*sinkron@99', name: 'ADMIN KONI' },
  { email: 'humas@quikkoni.admin', password: '&kesatuan*99#', name: 'ADMIN HUMAS' }
];

async function run() {
  console.log("=== 1. Wiping old accounts ===");
  let listUsersResult = await auth.listUsers(1000);
  let deletedCount = 0;
  
  for (const userRecord of listUsersResult.users) {
    if (userRecord.email === 'raynaldoanantawijaya180@gmail.com') {
      console.log(`Skipping developer account: ${userRecord.email}`);
      continue;
    }
    
    // Delete from Auth
    await auth.deleteUser(userRecord.uid);
    // Delete from Firestore
    await db.collection('users').doc(userRecord.uid).delete();
    console.log(`Deleted user: ${userRecord.email}`);
    deletedCount++;
  }
  console.log(`Successfully deleted ${deletedCount} users.\n`);

  console.log("=== 2. Creating CABOR accounts ===");
  for (let i = 0; i < cabors.length; i++) {
    const cabor = cabors[i];
    const email = `${cabor.id}@quikkoni.cabor`;
    const password = passwords[i];
    
    try {
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: cabor.name,
      });
      
      await db.collection('users').doc(userRecord.uid).set({
        name: cabor.name,
        email: email,
        role: 'cabor',
        caborId: cabor.id,
        createdAt: new Date().toISOString()
      });
      console.log(`Created CABOR [${i+1}/${cabors.length}]: ${email}`);
    } catch (e) {
      console.error(`Failed to create ${email}:`, e.message);
    }
  }
  
  console.log("\n=== 3. Creating ADMIN accounts ===");
  for (let i = 0; i < admins.length; i++) {
    const admin = admins[i];
    
    try {
      const userRecord = await auth.createUser({
        email: admin.email,
        password: admin.password,
        displayName: admin.name,
      });
      
      await db.collection('users').doc(userRecord.uid).set({
        name: admin.name,
        email: admin.email,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log(`Created ADMIN: ${admin.email}`);
    } catch (e) {
      console.error(`Failed to create ${admin.email}:`, e.message);
    }
  }

  console.log("\nALL TASKS COMPLETED!");
}

run().catch(console.error);
