const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const TARGET_CABORS = [
  { name: "AEROMODELLING", image: "/cabor/aeromodelling.png" },
  { name: "AKUATIK", image: "/cabor/renang.png" },
  { name: "ANGGAR", image: "/cabor/anggar.png" },
  { name: "ANGKAT BERAT", image: "/cabor/angkat-berat.png" },
  { name: "ANGKAT BESI", image: "/cabor/angkat-besi.png" },
  { name: "ATLETIK", image: "/cabor/atletik.png" },
  { name: "BALAP MOTOR", image: "/cabor/bermotor.png" },
  { name: "BALAP SEPEDA", image: "/cabor/balap-sepeda.png" },
  { name: "BARONGSAI", image: "/cabor/barongsai.png" },
  { name: "GANTOLE", image: "/cabor/gantolle.png" },
  { name: "BILLIAR", image: "/cabor/biliar.png" },
  { name: "BINARAGA", image: "/cabor/binaraga.png" },
  { name: "BOLA BASKET", image: "/cabor/basket.png" },
  { name: "BOLA TANGAN", image: "/cabor/bola-tangan.png" },
  { name: "BOLA VOLLY", image: "/cabor/bola-voli.png" },
  { name: "BRIDGE", image: "/cabor/bridge.png" },
  { name: "BULU TANGKIS", image: "/cabor/badminton.png" },
  { name: "CATUR", image: "/cabor/catur.png" },
  { name: "DANSA", image: "/cabor/dansa-sport.png" },
  { name: "DRUM BAND", image: "/cabor/drumband.png" },
  { name: "ESPORT", image: "/cabor/esports.png" },
  { name: "FUTSAL", image: "/cabor/futsal.png" },
  { name: "GATEBALL", image: "/cabor/gateball.png" },
  { name: "GOLF", image: "/cabor/golf.png" },
  { name: "GULAT", image: "/cabor/gulat.png" },
  { name: "HAPKIDO", image: "/cabor/hapkido.png" },
  { name: "HOCKEY", image: "/cabor/hockey.png" },
  { name: "JUDO", image: "/cabor/judo.png" },
  { name: "JUJITSU", image: "/cabor/jujitsu.png" },
  { name: "KARATE", image: "/cabor/karate.png" },
  { name: "KEMPO", image: "/cabor/kempo.png" }, // No official scraped logo, fallback
  { name: "KICKBOXING", image: "/cabor/kick-boxing.png" },
  { name: "MENEMBAK", image: "/cabor/menembak.png" },
  { name: "MUAYTHAI", image: "/cabor/muaythai.png" },
  { name: "PANAHAN", image: "/cabor/panahan.png" },
  { name: "PANJAT TEBING", image: "/cabor/panjat-tebing.png" },
  { name: "PARALAYANG", image: "/cabor/paralayang.png" },
  { name: "PENCAK SILAT", image: "/cabor/pencak-silat.png" },
  { name: "PETANQUE", image: "/cabor/petanque.png" },
  { name: "RUGBY", image: "/cabor/rugby.png" },
  { name: "SAMBO", image: "/cabor/sambo.png" },
  { name: "SELAM", image: "/cabor/selam.png" },
  { name: "SENAM", image: "/cabor/senam.png" },
  { name: "SEPAK BOLA", image: "/cabor/sepakbola.png" },
  { name: "SEPATU RODA", image: "/cabor/sepatu-roda.png" },
  { name: "SOFTBALL & BASEBALL", image: "/cabor/softball-dan-baseball.png" },
  { name: "TAEKWONDO", image: "/cabor/taekwondo.png" },
  { name: "TARUNG DERAJAT", image: "/cabor/tarung-derajat.png" },
  { name: "TENIS LAPANGAN", image: "/cabor/tenis-lapangan.png" },
  { name: "TENIS MEJA", image: "/cabor/tenis-meja.png" },
  { name: "TINJU AMATIR", image: "/cabor/tinju.png" },
  { name: "WOODBALL", image: "/cabor/woodball.png" },
  { name: "WUSHU", image: "/cabor/wushu.png" },
  { name: "XIANGQI", image: "/cabor/xiangqi.png" }
];

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Deleted ${batchSize} documents from ${collectionPath}`);
}

async function main() {
  try {
    console.log("Wiping collections...");
    await deleteCollection('cabors');
    await deleteCollection('medals');
    await deleteCollection('reports');
    
    console.log("Wiping public_cache/v1...");
    await db.collection("public_cache").doc("v1").delete().catch(e => console.log("Cache v1 doesn't exist yet, ignoring"));

    console.log(`Inserting ${TARGET_CABORS.length} cabors...`);
    const caborsCol = db.collection('cabors');
    
    // Convert array to batch inserts
    const batch = db.batch();
    
    TARGET_CABORS.forEach(c => {
      const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const docRef = caborsCol.doc(slug); // Use slug as ID
      batch.set(docRef, {
        name: c.name,
        logo: c.image,
        gold: 0,
        silver: 0,
        bronze: 0,
        createdAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
    console.log(`Successfully inserted ${TARGET_CABORS.length} cabors!`);
    
  } catch (error) {
    console.error("Error running script:", error);
  }
}

main();
