const fs = require('fs');
const path = require('path');

const files = [
  'src/app/validasi-pelaporan/page.tsx',
  'src/app/validasi/page.tsx',
  'src/app/profil/page.tsx',
  'src/app/pengaturan/page.tsx',
  'src/app/input-pelaporan/page.tsx',
  'src/app/input-medali/page.tsx',
  'src/app/developer/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('alert(') && !content.includes("from 'sonner'")) {
    const importMatch = content.match(/import .* from '.*';\n/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      content = content.replace(lastImport, lastImport + "import { toast } from 'sonner';\n");
    } else {
      content = "import { toast } from 'sonner';\n" + content;
    }
  }

  content = content.replace(/alert\((.*)\);?/g, (match, p1) => {
    const isError = /gagal|kesalahan|ditolak|tidak dapat|harap|terjadi kesalahan/i.test(p1.toLowerCase());
    if (isError) {
      return `toast.error(${p1});`;
    } else {
      return `toast.success(${p1});`;
    }
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
