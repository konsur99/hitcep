const xlsx = require('xlsx');

const data = [
  { No: 1, Nama: 'AEROMEDELLING', Email: 'aeromedelling@quikkoni.cabor', Password: 'aparajit1689', Role: 'Cabor' },
  { No: 2, Nama: 'AKUATIK', Email: 'akuatik@quikkoni.cabor', Password: 'jishnu3698', Role: 'Cabor' },
  { No: 3, Nama: 'ANGGAR', Email: 'anggar@quikkoni.cabor', Password: 'vijaya9186', Role: 'Cabor' },
  { No: 4, Nama: 'ANGKAT BERAT', Email: 'angkat-berat@quikkoni.cabor', Password: 'zafar8163', Role: 'Cabor' },
  { No: 5, Nama: 'ANGKAT BESI', Email: 'angkat-besi@quikkoni.cabor', Password: 'ghalib6819', Role: 'Cabor' },
  { No: 6, Nama: 'ATLETIK', Email: 'atletik@quikkoni.cabor', Password: 'fawz9381', Role: 'Cabor' },
  { No: 7, Nama: 'BOLA VOLLY', Email: 'bola-volly@quikkoni.cabor', Password: 'nasr7198', Role: 'Cabor' },
  { No: 8, Nama: 'BALAP MOTOR', Email: 'balap-motor@quikkoni.cabor', Password: 'mansur8619', Role: 'Cabor' },
  { No: 9, Nama: 'BALAP SEPEDA', Email: 'balap-sepeda@quikkoni.cabor', Password: 'fath1836', Role: 'Cabor' },
  { No: 10, Nama: 'BARONGSAI', Email: 'barongsai@quikkoni.cabor', Password: 'najah6981', Role: 'Cabor' },
  { No: 11, Nama: 'BILLIAR', Email: 'billiar@quikkoni.cabor', Password: 'falah8319', Role: 'Cabor' },
  { No: 12, Nama: 'BINARAGA', Email: 'binaraga@quikkoni.cabor', Password: 'izzah9168', Role: 'Cabor' },
  { No: 13, Nama: 'BOLA BASKET', Email: 'bola-basket@quikkoni.cabor', Password: 'muzaffar8691', Role: 'Cabor' },
  { No: 14, Nama: 'BOLA TANGAN', Email: 'bola-tangan@quikkoni.cabor', Password: 'nashir6381', Role: 'Cabor' },
  { No: 15, Nama: 'BRIDGE', Email: 'bridge@quikkoni.cabor', Password: 'digdaya8139', Role: 'Cabor' },
  { No: 16, Nama: 'BULU TANGKIS', Email: 'bulu-tangkis@quikkoni.cabor', Password: 'jayeng7918', Role: 'Cabor' },
  { No: 17, Nama: 'CATUR', Email: 'catur@quikkoni.cabor', Password: 'sakti6813', Role: 'Cabor' },
  { No: 18, Nama: 'DRUM BAND', Email: 'drum-band@quikkoni.cabor', Password: 'perkasa9186', Role: 'Cabor' },
  { No: 19, Nama: 'DANSA', Email: 'dansa@quikkoni.cabor', Password: 'wibawa8693', Role: 'Cabor' },
  { No: 20, Nama: 'ESPORT', Email: 'esport@quikkoni.cabor', Password: 'gagah3189', Role: 'Cabor' },
  { No: 21, Nama: 'FUTSAL', Email: 'futsal@quikkoni.cabor', Password: 'tangguh9368', Role: 'Cabor' },
  { No: 22, Nama: 'GANTOLE', Email: 'gantole@quikkoni.cabor', Password: 'jayabaya8193', Role: 'Cabor' },
  { No: 23, Nama: 'GATEBALL', Email: 'gateball@quikkoni.cabor', Password: 'mahardika9781', Role: 'Cabor' },
  { No: 24, Nama: 'SENAM', Email: 'senam@quikkoni.cabor', Password: 'vikrama8136', Role: 'Cabor' },
  { No: 25, Nama: 'GOLF', Email: 'golf@quikkoni.cabor', Password: 'abhaya6983', Role: 'Cabor' },
  { No: 26, Nama: 'GULAT', Email: 'gulat@quikkoni.cabor', Password: 'dhira8617', Role: 'Cabor' },
  { No: 27, Nama: 'HAPKIDO', Email: 'hapkido@quikkoni.cabor', Password: 'dhruva3691', Role: 'Cabor' },
  { No: 28, Nama: 'HOCKEY', Email: 'hockey@quikkoni.cabor', Password: 'tejas8196', Role: 'Cabor' },
  { No: 29, Nama: 'JUJITSU', Email: 'jujitsu@quikkoni.cabor', Password: 'ojas6389', Role: 'Cabor' },
  { No: 30, Nama: 'JUDO', Email: 'judo@quikkoni.cabor', Password: 'bala9183', Role: 'Cabor' },
  { No: 31, Nama: 'KARATE', Email: 'karate@quikkoni.cabor', Password: 'parakrama8619', Role: 'Cabor' },
  { No: 32, Nama: 'KICKBOXING', Email: 'kickboxing@quikkoni.cabor', Password: 'sthira7139', Role: 'Cabor' },
  { No: 33, Nama: 'MENEMBAK', Email: 'menembak@quikkoni.cabor', Password: 'udaya6891', Role: 'Cabor' },
  { No: 34, Nama: 'MUAYTHAI', Email: 'muaythai@quikkoni.cabor', Password: 'prabala8316', Role: 'Cabor' },
  { No: 35, Nama: 'PANAHAN', Email: 'panahan@quikkoni.cabor', Password: 'samartha9186', Role: 'Cabor' },
  { No: 36, Nama: 'PANJAT TEBING', Email: 'panjat-tebing@quikkoni.cabor', Password: 'nike3691', Role: 'Cabor' },
  { No: 37, Nama: 'PARALAYANG', Email: 'paralayang@quikkoni.cabor', Password: 'kratos8193', Role: 'Cabor' },
  { No: 38, Nama: 'PENCAK SILAT', Email: 'pencak-silat@quikkoni.cabor', Password: 'arete6819', Role: 'Cabor' },
  { No: 39, Nama: 'PETANQUE', Email: 'petanque@quikkoni.cabor', Password: 'alke9378', Role: 'Cabor' },
  { No: 40, Nama: 'RUGBY', Email: 'rugby@quikkoni.cabor', Password: 'invictus8619', Role: 'Cabor' },
  { No: 41, Nama: 'SELAM', Email: 'selam@quikkoni.cabor', Password: 'victoria9183', Role: 'Cabor' },
  { No: 42, Nama: 'SEPAK BOLA', Email: 'sepak-bola@quikkoni.cabor', Password: 'victor6817', Role: 'Cabor' },
  { No: 43, Nama: 'SEPATU RODA', Email: 'sepatu-roda@quikkoni.cabor', Password: 'triumph8391', Role: 'Cabor' },
  { No: 44, Nama: 'SAMBO', Email: 'sambo@quikkoni.cabor', Password: 'fortis7168', Role: 'Cabor' },
  { No: 45, Nama: 'KEMPO', Email: 'kempo@quikkoni.cabor', Password: 'audax9831', Role: 'Cabor' },
  { No: 46, Nama: 'SOFTBALL&BASEBALL', Email: 'softball-baseball@quikkoni.cabor', Password: 'jaya6189', Role: 'Cabor' },
  { No: 47, Nama: 'TARUNG DERAJAT', Email: 'tarung-derajat@quikkoni.cabor', Password: 'menang8361', Role: 'Cabor' },
  { No: 48, Nama: 'TENIS LAPANGAN', Email: 'tenis-lapangan@quikkoni.cabor', Password: 'unggul9186', Role: 'Cabor' },
  { No: 49, Nama: 'TENIS MEJA', Email: 'tenis-meja@quikkoni.cabor', Password: 'juara8613', Role: 'Cabor' },
  { No: 50, Nama: 'TINJU (PERTINA)', Email: 'tinju-pertina@quikkoni.cabor', Password: 'digjaya7931', Role: 'Cabor' },
  { No: 51, Nama: 'TAEKWONDO', Email: 'taekwondo@quikkoni.cabor', Password: 'jayakarta6893', Role: 'Cabor' },
  { No: 52, Nama: 'WOODBALL', Email: 'woodball@quikkoni.cabor', Password: 'mahajaya8319', Role: 'Cabor' },
  { No: 53, Nama: 'WUSHU', Email: 'wushu@quikkoni.cabor', Password: 'berjaya8169', Role: 'Cabor' },
  { No: 54, Nama: 'XIANGQI', Email: 'xiangqi@quikkoni.cabor', Password: 'pemenang9386', Role: 'Cabor' },
  { No: 55, Nama: 'ADMIN KONI', Email: 'koni@quikkoni.admin', Password: '#9*sinkron@99', Role: 'Admin' },
  { No: 56, Nama: 'ADMIN HUMAS', Email: 'humas@quikkoni.admin', Password: '&kesatuan*99#', Role: 'Admin' },
  { No: 57, Nama: 'DEVELOPER', Email: 'raynaldoanantawijaya180@gmail.com', Password: 'rahasia/login dengan google', Role: 'Developer' }
];

const ws = xlsx.utils.json_to_sheet(data);

// Define column widths for better readability
const wscols = [
  {wch: 5},  // No
  {wch: 25}, // Nama
  {wch: 35}, // Email
  {wch: 20}, // Password
  {wch: 15}  // Role
];
ws['!cols'] = wscols;

const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Daftar Akun");

// Write to file
const filePath = 'Data_Akun_QuikKONI.xlsx';
xlsx.writeFile(wb, filePath);

console.log(`Excel file successfully created at: ${filePath}`);
