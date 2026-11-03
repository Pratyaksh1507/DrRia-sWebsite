import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const artifactDir = '/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c';
const cutouts = ['lip-balm.png', 'sunscreen.png', 'hair-oil.png', 'face-wash.png', 'moisturizer.png'];

for (const c of cutouts) {
  const src = path.resolve('source-images/cutouts', c);
  const dest = path.resolve(artifactDir, `cutout-${c}`);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${c} to artifact dir: ${dest}`);
}
