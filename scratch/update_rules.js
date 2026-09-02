const { initializeApp, cert } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"')) val = val.substring(1, val.length - 1);
    envVars[key] = val;
  }
});

const app = initializeApp({
  credential: cert({
    projectId: envVars.FIREBASE_PROJECT_ID,
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
    privateKey: envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /public_cache/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

getSecurityRules(app).releaseFirestoreRulesetFromSource(rules)
  .then(() => {
    console.log("Firestore rules successfully updated!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error updating rules:", error);
    process.exit(1);
  });
