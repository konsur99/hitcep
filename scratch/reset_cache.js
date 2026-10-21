const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const https = require('https');
const crypto = require('crypto');
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

const CLOUD_NAME = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = env.CLOUDINARY_API_KEY;
const API_SECRET = env.CLOUDINARY_API_SECRET;

initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY
  })
});

const db = getFirestore();

// Cloudinary delete function
function deleteFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.round(Date.now() / 1000);
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');
    const postData = `public_id=${encodeURIComponent(publicId)}&timestamp=${timestamp}&api_key=${API_KEY}&signature=${signature}`;

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/image/destroy`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ result: 'error', raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🚨 RESET CACHE PELAPORAN & MEDALI');
  console.log('==================================\n');

  // 1. Get cache data to find Cloudinary images in cached reports
  const cacheRef = db.collection('public_cache').doc('v1');
  const cacheDoc = await cacheRef.get();

  if (!cacheDoc.exists) {
    console.log('❌ Cache tidak ditemukan.');
    return;
  }

  const cacheData = cacheDoc.data();
  const cachedReports = cacheData.reports || [];
  console.log(`📊 Reports dalam cache: ${cachedReports.length}`);

  // 2. Delete Cloudinary images from cached reports
  let deletedImages = 0;
  for (const report of cachedReports) {
    if (report.imagePublicId) {
      try {
        const result = await deleteFromCloudinary(report.imagePublicId);
        if (result.result === 'ok') {
          console.log(`  🗑️  Foto dihapus: ${report.imagePublicId}`);
          deletedImages++;
        } else if (result.result === 'not found') {
          console.log(`  ⏭️  Foto sudah tidak ada: ${report.imagePublicId}`);
        } else {
          console.log(`  ⚠️  ${report.imagePublicId}: ${result.result}`);
        }
      } catch (err) {
        console.error(`  ❌ Gagal: ${report.imagePublicId}: ${err.message}`);
      }
    }
  }

  // 3. Update cache: reset reports to empty array, reset medals to empty array
  await cacheRef.update({
    reports: [],
    medals: [],
    lastUpdated: new Date().toISOString()
  });

  console.log(`\n==================================`);
  console.log(`🎉 RESET CACHE SELESAI!`);
  console.log(`   Reports dihapus dari cache: ${cachedReports.length}`);
  console.log(`   Foto Cloudinary dihapus: ${deletedImages}`);
  console.log(`   Medals dalam cache: direset ke []`);
  console.log(`\n⚠️  Data cabors dalam cache TIDAK diubah.`);
}

main();
