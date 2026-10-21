const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const cloudinary = require('cloudinary').v2;
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

cloudinary.config({
  cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

async function run() {
  console.log("Starting full data wipe (medals, reports, cabors stats, cloudinary)...");

  // 1. Wipe Medals
  console.log("Wiping medals collection...");
  const medalsSnap = await db.collection('medals').get();
  let mBatch = db.batch();
  let mCount = 0;
  for (const doc of medalsSnap.docs) {
    mBatch.delete(doc.ref);
    mCount++;
    if (mCount % 400 === 0) {
      await mBatch.commit();
      mBatch = db.batch();
    }
  }
  if (mCount % 400 !== 0) await mBatch.commit();
  console.log(`Deleted ${mCount} medals.`);

  // 2. Wipe Reports
  console.log("Wiping reports collection...");
  const reportsSnap = await db.collection('reports').get();
  let rBatch = db.batch();
  let rCount = 0;
  for (const doc of reportsSnap.docs) {
    rBatch.delete(doc.ref);
    rCount++;
    if (rCount % 400 === 0) {
      await rBatch.commit();
      rBatch = db.batch();
    }
  }
  if (rCount % 400 !== 0) await rBatch.commit();
  console.log(`Deleted ${rCount} reports.`);

  // 3. Reset Cabors
  console.log("Resetting cabors medal counts...");
  const caborsSnap = await db.collection('cabors').get();
  let cBatch = db.batch();
  for (const doc of caborsSnap.docs) {
    cBatch.update(doc.ref, { gold: 0, silver: 0, bronze: 0 });
  }
  await cBatch.commit();
  console.log("Cabors reset.");

  // 4. Reset public_cache
  console.log("Resetting public_cache...");
  const cacheRef = db.collection('public_cache').doc('v1');
  const cacheDoc = await cacheRef.get();
  if (cacheDoc.exists) {
    const cacheData = cacheDoc.data();
    if (cacheData.cabors) {
      cacheData.cabors.forEach(c => {
        c.gold = 0;
        c.silver = 0;
        c.bronze = 0;
      });
    }
    await cacheRef.update({
      medals: [],
      cabors: cacheData.cabors || []
    });
    console.log("public_cache reset.");
  }

  // 5. Delete Cloudinary Images
  console.log("Deleting images from Cloudinary...");
  try {
    const result = await cloudinary.api.delete_all_resources({ type: 'upload', resource_type: 'image' });
    console.log("Cloudinary deletion result:", result);
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
  }

  console.log("ALL DATA RESET COMPLETED SUCCESSFULLY.");
}

run().catch(console.error);
