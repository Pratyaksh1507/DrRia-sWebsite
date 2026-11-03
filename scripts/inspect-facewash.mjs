import sharp from 'sharp';

const img = sharp('source-images/cutouts/face-wash.png');
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
console.log('Face wash dimensions:', info.width, 'x', info.height);

// Find min/max x where alpha > 20 for different y bands:
for (let y = 0; y < info.height; y += 100) {
  let minX = -1, maxX = -1;
  for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    if (alpha > 30) {
      if (minX === -1) minX = x;
      maxX = x;
    }
  }
  console.log(`y=${y}: minX=${minX}, maxX=${maxX}`);
}
