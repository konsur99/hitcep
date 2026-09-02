const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "porprov-koni-solo",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(async () => {
  const cacheRef = doc(db, 'public_cache', 'v1');
  const snap = await getDoc(cacheRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("Total Medals:", data.medals ? data.medals.length : 0);
    if (data.medals && data.medals.length > 0) {
      console.log("First Medal:", data.medals[0]);
    }
  } else {
    console.log("Cache v1 not found");
  }
  process.exit(0);
})();
