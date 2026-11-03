import sharp from 'sharp';
import fs from 'fs';

const img = sharp('source-images/cutouts/face-wash.png');
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

// Erase ghost orange slice on the left
for (let y = 0; y < info.height; y++) {
  // Bottle starts around x=496 for y >= 250, nozzle starts around x=435 for y < 250
  const thresholdX = y < 70 ? 430 : 494;
  for (let x = 0; x < info.width; x++) {
    if (x < thresholdX) {
      data[(y * info.width + x) * 4 + 3] = 0; // alpha = 0
    }
  }
}

const cleaned = await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4,
  },
})
  .trim()
  .png()
  .toBuffer();

fs.writeFileSync('source-images/cutouts/face-wash.png', cleaned);
fs.writeFileSync('/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c/cutout-face-wash.png', cleaned);

const newMeta = await sharp(cleaned).metadata();
console.log('Cleaned face wash cutout dimensions:', newMeta.width, 'x', newMeta.height);
