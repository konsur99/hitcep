const fs = require('fs');

const files = [
  'src/app/page.tsx',
  'src/app/medali/page.tsx',
  'src/app/pelaporan/page.tsx',
  'src/app/statistik/page.tsx',
  'src/app/cabor/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import { db } from '@/lib/firebase';")) {
    content = "import { db } from '@/lib/firebase';\nimport { doc, getDoc } from 'firebase/firestore';\n" + content;
    fs.writeFileSync(file, content);
    console.log("Added imports to", file);
  }
}
