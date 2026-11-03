import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const artifactDir = '/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c';
const desktopPath = path.resolve('public/images/dr-rias-hero-lineup-desktop.webp');

const crops = [
  { name: 'zoom-lip-balm.png', left: 380, top: 800, width: 360, height: 270 },
  { name: 'zoom-sunscreen.png', left: 770, top: 450, width: 260, height: 420 },
  { name: 'zoom-hair-oil.png', left: 1050, top: 320, width: 300, height: 500 },
  { name: 'zoom-face-wash.png', left: 1360, top: 360, width: 280, height: 480 },
  { name: 'zoom-moisturizer.png', left: 1640, top: 720, width: 400, height: 350 },
];

for (const c of crops) {
  const buf = await sharp(desktopPath)
    .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .png()
    .toBuffer();

  const dest = path.resolve(artifactDir, c.name);
  fs.writeFileSync(dest, buf);
  console.log(`Saved 200% zoom crop: ${dest}`);
}
