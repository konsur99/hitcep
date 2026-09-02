const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add imports if not present
  if (!content.includes("import { db } from '@/lib/firebase';")) {
    content = content.replace(/import .*\n/, (match) => match + "import { db } from '@/lib/firebase';\nimport { doc, getDoc } from 'firebase/firestore';\n");
  }
  
  // Replace fetch logic with getDoc
  const fetchRegex = /const res = await fetch\(['"]https:\/\/hitcep.vercel.app\/api\/public_cache['"], \{ next: \{ revalidate: 10 \} \}\);\s*const cacheData = await res\.json\(\);/;
  
  const getDocCode = `const cacheSnap = await getDoc(doc(db, 'public_cache', 'v1'));
    const rawData = cacheSnap.exists() ? cacheSnap.data() : { cabors: [], medals: [], reports: [] };
    
    // Normalize timestamps for Server Component serialization
    const cacheData = {
      ...rawData,
      medals: rawData.medals?.map((m: any) => ({
        ...m,
        createdAt: m.createdAt && typeof m.createdAt.toDate === 'function' 
          ? m.createdAt.toDate().getTime() 
          : (m.createdAt?.seconds ? m.createdAt.seconds * 1000 : null)
      })) || []
    };`;

  if (content.match(fetchRegex)) {
    content = content.replace(fetchRegex, getDocCode);
    fs.writeFileSync(file, content);
    console.log("Updated", file);
  } else {
    console.log("No match found for fetch in", file);
  }
}

processFile('src/app/page.tsx');
processFile('src/app/medali/page.tsx');
processFile('src/app/pelaporan/page.tsx');
processFile('src/app/statistik/page.tsx');
processFile('src/app/cabor/page.tsx');
