const xlsx = require('xlsx');

const filePath = 'C:\\Users\\User\\Downloads\\030926 DATA BY NAME SI SAKTI - PORPROV 2026 - APLIKASI KONI - 02 september 2026 (1).xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length > 1) {
  const headers = data[1]; // second row has the real headers
  console.log("HEADERS:", headers);

  let caborIndex = -1;
  headers.forEach((h, i) => {
    if (typeof h === 'string' && h.toLowerCase().includes('cabor')) {
      caborIndex = i;
    }
  });

  if (caborIndex !== -1) {
    const cabors = new Set();
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if (row[caborIndex]) {
        cabors.add(row[caborIndex].toString().trim());
      }
    }
    console.log("UNIQUE CABORS IN EXCEL:", Array.from(cabors).sort());
  } else {
    console.log("Cabor column not found.");
  }
  
  console.log("TOTAL DATA ROWS:", data.length - 2);
  console.log("FIRST 2 DATA ROWS:", data.slice(2, 4));
} else {
  console.log("Empty sheet");
}
