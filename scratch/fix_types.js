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
  content = content.replace(/const cacheData = \{/, 'const cacheData: any = {');
  fs.writeFileSync(file, content);
  console.log("Fixed type error in", file);
}
