const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Load env
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

// Cloudinary delete function using REST API
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
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve({ result: 'error', raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Delete all documents in a collection using batch
async function deleteCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) {
    console.log(`  ✅ Koleksi '${collectionName}' sudah kosong.`);
    return { deletedDocs: 0, deletedImages: 0 };
  }

  let deletedDocs = 0;
  let deletedImages = 0;

  // Process in batches of 400 (Firestore batch limit is 500)
  const batchSize = 400;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);

    for (const doc of chunk) {
      const data = doc.data();

      // Delete Cloudinary images
      const imageIds = [];
      if (data.portraitPublicId) imageIds.push(data.portraitPublicId);
      if (data.ceremonyPublicId) imageIds.push(data.ceremonyPublicId);
      if (data.imagePublicId) imageIds.push(data.imagePublicId);

      for (const publicId of imageIds) {
        try {
          const result = await deleteFromCloudinary(publicId);
          if (result.result === 'ok') {
            console.log(`  🗑️  Foto dihapus: ${publicId}`);
            deletedImages++;
          } else {
            console.log(`  ⚠️  Foto '${publicId}': ${result.result || JSON.stringify(result)}`);
          }
        } catch (err) {
          console.error(`  ❌ Gagal hapus foto '${publicId}': ${err.message}`);
        }
      }

      batch.delete(doc.ref);
      deletedDocs++;
    }

    await batch.commit();
    console.log(`  📦 Batch commit: ${chunk.length} dokumen dihapus.`);
  }

  return { deletedDocs, deletedImages };
}

async function main() {
  console.log('🚨 RESET DATA MEDALI & PELAPORAN');
  console.log('================================\n');

  // Reset medals
  console.log('⏳ Menghapus koleksi "medals"...');
  const medalResult = await deleteCollection('medals');
  console.log(`  ✅ Selesai: ${medalResult.deletedDocs} dokumen, ${medalResult.deletedImages} foto.\n`);

  // Reset reports
  console.log('⏳ Menghapus koleksi "reports"...');
  const reportResult = await deleteCollection('reports');
  console.log(`  ✅ Selesai: ${reportResult.deletedDocs} dokumen, ${reportResult.deletedImages} foto.\n`);

  // Summary
  const totalDocs = medalResult.deletedDocs + reportResult.deletedDocs;
  const totalImages = medalResult.deletedImages + reportResult.deletedImages;
  console.log('================================');
  console.log(`🎉 RESET SELESAI!`);
  console.log(`   Dokumen dihapus: ${totalDocs}`);
  console.log(`   Foto Cloudinary dihapus: ${totalImages}`);
  console.log('\n⚠️  Koleksi lain (users, cabors, dll) TIDAK diubah.');
}

main();
