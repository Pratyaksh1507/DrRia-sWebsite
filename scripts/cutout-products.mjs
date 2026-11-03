import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const products = [
  {
    name: 'Lip Balm',
    source: 'Anti-Pigmentation Lip Balm Spa Scene.png',
    output: 'lip-balm.png',
  },
  {
    name: 'Sunscreen',
    source: 'Botanical SPF-50 Sunscreen Still Life.png',
    output: 'sunscreen.png',
  },
  {
    name: 'Hair Growth Oil',
    source: 'Dr Ria’s Hair Growth Oil Retreat.png',
    output: 'hair-oil.png',
  },
  {
    name: 'Vita C Face Wash',
    source: 'Vita C Daily Glow Face Wash.png',
    output: 'face-wash.png',
  },
  {
    name: 'Hydroboost Moisturizer',
    source: 'Hydroboost Moisturizer Spa Editorial.png',
    output: 'moisturizer.png',
  },
];

const cutoutsDir = path.resolve('source-images/cutouts');
if (!fs.existsSync(cutoutsDir)) {
  fs.mkdirSync(cutoutsDir, { recursive: true });
}

for (const prod of products) {
  const inputPath = path.resolve('source-images', prod.source);
  const outputPath = path.resolve(cutoutsDir, prod.output);

  console.log(`\n-----------------------------------------`);
  console.log(`Processing: ${prod.name}`);
  console.log(`Input: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: File not found: ${inputPath}`);
    continue;
  }

  const startTime = Date.now();
  try {
    // 1. Remove background using @imgly/background-removal-node
    console.log(`Removing background...`);
    const blob = await removeBackground(`file://${inputPath}`, {
      output: {
        format: 'image/png',
        quality: 1.0,
      },
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    // 2. Trim transparent borders
    console.log(`Trimming transparent borders...`);
    const trimmed = await sharp(buffer)
      .trim()
      .png({ compressionLevel: 9 })
      .toBuffer();

    const meta = await sharp(trimmed).metadata();
    console.log(`Trimmed size: ${meta.width}x${meta.height}`);

    // Save cutout
    fs.writeFileSync(outputPath, trimmed);
    console.log(`Saved cutout to: ${outputPath} (${Math.round((Date.now() - startTime) / 1000)}s)`);
  } catch (err) {
    console.error(`Failed to process ${prod.name}:`, err);
  }
}

console.log(`\nAll product cutouts completed!`);
