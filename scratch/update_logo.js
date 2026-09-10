const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const srcPath = 'C:/Users/User/.gemini/antigravity-ide/brain/a2f01565-3d14-4927-9662-4423a9dc8f56/.user_uploaded/media_1789034802026.png';
const destPng = 'public/cabor/shorinji-kempo.png';
const destWebp = 'public/cabor/shorinji-kempo.webp';

async function processImage() {
  try {
    fs.copyFileSync(srcPath, destPng);
    console.log('Copied to shorinji-kempo.png');
    
    await sharp(srcPath)
      .webp({ quality: 80 })
      .toFile(destWebp);
    console.log('Converted to shorinji-kempo.webp');
    
    // Delete old kempo
    if (fs.existsSync('public/cabor/kempo.png')) fs.unlinkSync('public/cabor/kempo.png');
    if (fs.existsSync('public/cabor/kempo.webp')) fs.unlinkSync('public/cabor/kempo.webp');
    console.log('Deleted old kempo files');
  } catch(e) {
    console.error(e);
  }
}
processImage();
