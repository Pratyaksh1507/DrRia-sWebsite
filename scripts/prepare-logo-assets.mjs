import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();

async function main() {
  console.log('1. Copying app router icons...');
  // app/favicon.ico from source-images/logo/favicon.ico
  await fs.copyFile(
    path.join(rootDir, 'source-images/logo/favicon.ico'),
    path.join(rootDir, 'app/favicon.ico')
  );
  console.log('✓ app/favicon.ico updated');

  // app/icon.png from source-images/logo/icon-512.png
  await fs.copyFile(
    path.join(rootDir, 'source-images/logo/icon-512.png'),
    path.join(rootDir, 'app/icon.png')
  );
  console.log('✓ app/icon.png created (from icon-512.png)');

  // app/apple-icon.png from source-images/logo/apple-touch-icon.png
  await fs.copyFile(
    path.join(rootDir, 'source-images/logo/apple-touch-icon.png'),
    path.join(rootDir, 'app/apple-icon.png')
  );
  console.log('✓ app/apple-icon.png created (from apple-touch-icon.png)');

  console.log('\n2. Copying public manifest icons...');
  // public/icon-192.png
  await fs.copyFile(
    path.join(rootDir, 'source-images/logo/icon-192.png'),
    path.join(rootDir, 'public/icon-192.png')
  );
  console.log('✓ public/icon-192.png created');

  // public/icon-512.png
  await fs.copyFile(
    path.join(rootDir, 'source-images/logo/icon-512.png'),
    path.join(rootDir, 'public/icon-512.png')
  );
  console.log('✓ public/icon-512.png created');

  console.log('\n3. Removing old favicon files...');
  try {
    await fs.unlink(path.join(rootDir, 'public/favicon.ico'));
    console.log('✓ Removed public/favicon.ico');
  } catch (err) {
    console.log('- public/favicon.ico already removed or not found');
  }

  try {
    await fs.unlink(path.join(rootDir, 'public/apple-touch-icon.png'));
    console.log('✓ Removed public/apple-touch-icon.png');
  } catch (err) {
    console.log('- public/apple-touch-icon.png already removed or not found');
  }

  console.log('\n4. Processing Organization JSON-LD logo (source-images/logo/dr-rias-logo-transparent.png)...');
  const transparentLogoPath = path.join(rootDir, 'source-images/logo/dr-rias-logo-transparent.png');
  const orgLogoPng = path.join(rootDir, 'public/brand/dr-rias-logo.png');
  const orgLogoWebp = path.join(rootDir, 'public/brand/dr-rias-logo.webp');

  await sharp(transparentLogoPath)
    .resize({ width: 600, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(orgLogoPng);
  console.log('✓ Generated public/brand/dr-rias-logo.png (max 600px wide, optimized PNG)');

  await sharp(transparentLogoPath)
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(orgLogoWebp);
  console.log('✓ Generated public/brand/dr-rias-logo.webp (max 600px wide, optimized WebP)');

  console.log('\n5. Copying footer logo badge...');
  const footerWebpSrc = path.join(rootDir, 'source-images/logo/footer-logo-badge.webp');
  const footerPngSrc = path.join(rootDir, 'source-images/logo/footer-logo-badge.png');
  const footerWebpDest = path.join(rootDir, 'public/brand/footer-logo-badge.webp');
  const footerPngDest = path.join(rootDir, 'public/brand/footer-logo-badge.png');

  await fs.copyFile(footerWebpSrc, footerWebpDest);
  console.log('✓ Copied public/brand/footer-logo-badge.webp');

  await sharp(footerPngSrc)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(footerPngDest);
  console.log('✓ Optimized & saved public/brand/footer-logo-badge.png');

  console.log('\nAll logo assets prepared successfully!');
}

main().catch((err) => {
  console.error('Error preparing assets:', err);
  process.exit(1);
});
