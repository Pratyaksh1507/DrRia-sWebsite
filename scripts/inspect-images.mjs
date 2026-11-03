import sharp from 'sharp';
import fs from 'fs';

const targets = [
  'Anti-Pigmentation Lip Balm Spa Scene.png',
  'Botanical SPF-50 Sunscreen Still Life.png',
  'Dr Ria’s Hair Growth Oil Retreat.png',
  'Vita C Daily Glow Face Wash.png',
  'Hydroboost Moisturizer Spa Editorial.png',
];

for (const name of targets) {
  const path = `source-images/${name}`;
  if (!fs.existsSync(path)) {
    console.log(`NOT FOUND: ${path}`);
    continue;
  }
  const img = sharp(path);
  const meta = await img.metadata();
  console.log(`\n=== ${name} ===`);
  console.log(`Size: ${meta.width}x${meta.height}, Channels: ${meta.channels}, Has Alpha: ${meta.hasAlpha}`);
}
