import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join } from 'path';

const SRC = './source-images';
const OUT = './public/images';
const SIZES = [480, 768, 1200];

const MAP = {
  'Anti-Pigmentation Lip Balm Benefits.png': 'lip-balm-benefits',
  'Anti-Pigmentation Lip Balm Spa Scene.png': 'lip-balm-spa',
  'Elegant Blue-Accented Cosmetic Information Label.png': 'lip-balm-label',
  'Dr Ria\'s Vita C Glow Face Wash.png': 'vita-c-face-wash-benefits',
  'Vita C Daily Glow Face Wash.png': 'vita-c-face-wash-lifestyle',
  'Orange Aloe Face Wash Label.png': 'vita-c-face-wash-label',
  'Elegant Hair Growth Oil Benefits.png': 'hair-growth-oil-benefits',
  'Dr Ria\'s Hair Growth Oil Retreat.png': 'hair-growth-oil-lifestyle',
  'Elegant Hair Growth Oil Information Label.png': 'hair-growth-oil-label',
  'Hydroboost Moisturizer Hydration Ad.png': 'hydroboost-moisturizer-benefits',
  'Hydroboost Moisturizer Spa Editorial.png': 'hydroboost-moisturizer-lifestyle',
  'Mint Green Skincare Back Panel.png': 'hydroboost-moisturizer-label',
  'SPF-50 Sunscreen Key Benefits.png': 'spf50-sunscreen-benefits',
  'Botanical SPF-50 Sunscreen Still Life.png': 'spf50-sunscreen-lifestyle',
  'Aloe Skincare Ingredient Label.png': 'spf50-sunscreen-label',
};

await mkdir(OUT, { recursive: true });

const diskFiles = await readdir(SRC);
const blurMap = {};

for (const [mapKey, slug] of Object.entries(MAP)) {
  const normKey = mapKey.replace(/[\u2018\u2019]/g, "'");
  const actualFile = diskFiles.find(
    (f) => f === mapKey || f.replace(/[\u2018\u2019]/g, "'") === normKey
  );

  if (!actualFile) {
    console.error(`File not found for key: ${mapKey}`);
    continue;
  }

  const srcPath = join(SRC, actualFile);
  for (const w of SIZES) {
    await sharp(srcPath).resize(w).webp({ quality: 85 }).toFile(join(OUT, `${slug}-${w}.webp`));
    await sharp(srcPath).resize(w).avif({ quality: 65 }).toFile(join(OUT, `${slug}-${w}.avif`));
    console.log(`✓ ${slug} @ ${w}`);
  }

  const blur = await sharp(srcPath).resize(20).webp({ quality: 50 }).toBuffer();
  const b64 = `data:image/webp;base64,${blur.toString('base64')}`;
  blurMap[slug] = b64;
  console.log(`BLUR:${slug}=${b64.substring(0, 80)}...`);
}

import { writeFile } from 'fs/promises';
await writeFile(join(OUT, 'blur-map.json'), JSON.stringify(blurMap, null, 2));
console.log('Saved blur-map.json!');
console.log('Done converting images!');
