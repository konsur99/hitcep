const xlsx = require('xlsx');

const workbook = xlsx.readFile('C:\\Users\\User\\Downloads\\DATA BY NAME SI SAKTI - PORPROV 2026 - APLIKASI KONI.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Read as array of arrays (A1 to max)
const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Row 1 (Header 1):', rows[0]);
console.log('Row 2 (Header 2):', rows[1]);
console.log('Row 3 (First Data):', rows[2]);
console.log('Row 4 (Second Data):', rows[3]);
console.log('Total Rows:', rows.length);
