import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const cutouts = {
  lipBalm: 'source-images/cutouts/lip-balm.png',
  sunscreen: 'source-images/cutouts/sunscreen.png',
  hairOil: 'source-images/cutouts/hair-oil.png',
  faceWash: 'source-images/cutouts/face-wash.png',
  moisturizer: 'source-images/cutouts/moisturizer.png',
};

// Generates realistic contact + ambient shadow under a container base
async function makeRealisticShadow(baseWidth, contactHeight = 18, ambientHeight = 40, opacity = 0.65) {
  const w = Math.round(baseWidth * 1.35);
  const h = Math.round(ambientHeight * 2.2);
  
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Intense tight contact shadow directly under base -->
        <radialGradient id="contactG" cx="50%" cy="38%" r="50%">
          <stop offset="0%" stop-color="#221408" stop-opacity="${opacity}" />
          <stop offset="45%" stop-color="#221408" stop-opacity="${opacity * 0.5}" />
          <stop offset="100%" stop-color="#221408" stop-opacity="0" />
        </radialGradient>
        <!-- Soft diffuse ambient bounce shadow -->
        <radialGradient id="ambientG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3D2410" stop-opacity="${opacity * 0.38}" />
          <stop offset="70%" stop-color="#3D2410" stop-opacity="${opacity * 0.12}" />
          <stop offset="100%" stop-color="#3D2410" stop-opacity="0" />
        </radialGradient>
      </defs>
      <!-- Ambient layer -->
      <ellipse cx="${w / 2}" cy="${h * 0.52}" rx="${w * 0.46}" ry="${ambientHeight * 0.65}" fill="url(#ambientG)" />
      <!-- Contact layer -->
      <ellipse cx="${w / 2}" cy="${h * 0.36}" rx="${baseWidth * 0.45}" ry="${contactHeight * 0.5}" fill="url(#contactG)" />
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .blur(5)
    .png()
    .toBuffer();
}

// Helper to load, lanczos resize, and subtly sharpen for razor clarity
async function prepareCutout(filePath, targetHeight) {
  return sharp(filePath)
    .resize({ height: targetHeight, kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.85, m1: 0.85, m2: 2.2 })
    .png()
    .toBuffer();
}

// ----------------------------------------------------------------------------
// 1. DESKTOP HERO (2400 x 1350)
// ----------------------------------------------------------------------------
async function buildDesktop() {
  const W = 2400;
  const H = 1350;

  // Background with expansive travertine stone podium structure
  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="deskStudioLight" cx="50%" cy="40%" r="68%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="35%" stop-color="#FCFAF6" />
          <stop offset="72%" stop-color="#F8F1E7" />
          <stop offset="100%" stop-color="#EFE4D4" />
        </radialGradient>
        
        <!-- Stone Plinth Top Surface (Travertine / warm sandstone) -->
        <linearGradient id="plinthTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F4ECE2" />
          <stop offset="50%" stop-color="#ECE2D5" />
          <stop offset="100%" stop-color="#E4D9C9" />
        </linearGradient>
        
        <!-- Plinth Bevel Edge -->
        <linearGradient id="plinthBevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#D9CCB8" />
          <stop offset="100%" stop-color="#C5B6A0" />
        </linearGradient>

        <!-- Lower Platform Top Surface -->
        <linearGradient id="lowerPlatform" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#EFE5D7" />
          <stop offset="100%" stop-color="#E2D5C4" />
        </linearGradient>

        <linearGradient id="podiumShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#2D1C0E" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#2D1C0E" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Studio Backdrop -->
      <rect width="${W}" height="${H}" fill="url(#deskStudioLight)" />

      <!-- Back Architectural Tier for standing bottles (y: 1160) -->
      <path d="M 420 1160 L 1980 1160 L 1930 1195 L 470 1195 Z" fill="url(#plinthTop)" />
      <path d="M 470 1195 L 1930 1195 L 1930 1208 L 470 1208 Z" fill="url(#plinthBevel)" />
      <rect x="440" y="1208" width="1520" height="35" fill="url(#podiumShadow)" />

      <!-- Lower Stepped Platform for front jars (y: 1255) -->
      <path d="M 60 1255 L 2340 1255 L 2300 1290 L 100 1290 Z" fill="url(#lowerPlatform)" opacity="0.9" />
      <path d="M 100 1290 L 2300 1290 L 2300 1302 L 100 1302 Z" fill="url(#plinthBevel)" opacity="0.8" />
      <rect x="80" y="1302" width="2240" height="48" fill="url(#podiumShadow)" opacity="0.5" />

      <!-- Floor base -->
      <rect x="0" y="1300" width="${W}" height="50" fill="#EAE0D2" opacity="0.6" />
    </svg>
  `;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // Sizing in Desktop 2400x1350 (bold, fills frame edge-to-edge):
  const hairOilImg = await prepareCutout(cutouts.hairOil, 1120);
  const hairOilMeta = await sharp(hairOilImg).metadata();

  const sunscreenImg = await prepareCutout(cutouts.sunscreen, 960);
  const sunscreenMeta = await sharp(sunscreenImg).metadata();

  const faceWashImg = await prepareCutout(cutouts.faceWash, 1040);
  const faceWashMeta = await sharp(faceWashImg).metadata();

  const lipBalmImg = await prepareCutout(cutouts.lipBalm, 360);
  const lipBalmMeta = await sharp(lipBalmImg).metadata();

  const moisturizerImg = await prepareCutout(cutouts.moisturizer, 500);
  const moisturizerMeta = await sharp(moisturizerImg).metadata();

  // Vertical Baselines:
  const hairOilY = 1170 - hairOilMeta.height; // y = 50
  const sunscreenY = 1170 - sunscreenMeta.height; // y = 210
  const faceWashY = 1170 - faceWashMeta.height; // y = 130
  const lipBalmY = 1260 - lipBalmMeta.height; // y = 900
  const moisturizerY = 1260 - moisturizerMeta.height; // y = 760

  // Horizontal X Centers:
  const hairOilX = Math.round(1200 - hairOilMeta.width / 2);
  const sunscreenX = Math.round(740 - sunscreenMeta.width / 2);
  const faceWashX = Math.round(1660 - faceWashMeta.width / 2);
  const lipBalmX = Math.round(350 - lipBalmMeta.width / 2);
  const moisturizerX = Math.round(2050 - moisturizerMeta.width / 2);

  // Realistic contact shadows:
  const hairOilShadow = await makeRealisticShadow(hairOilMeta.width, 18, 42, 0.7);
  const sunscreenShadow = await makeRealisticShadow(sunscreenMeta.width, 16, 36, 0.65);
  const faceWashShadow = await makeRealisticShadow(faceWashMeta.width, 18, 40, 0.7);
  const lipBalmShadow = await makeRealisticShadow(lipBalmMeta.width, 22, 46, 0.72);
  const moisturizerShadow = await makeRealisticShadow(moisturizerMeta.width, 24, 52, 0.72);

  const shadowMeta = async (buf) => await sharp(buf).metadata();
  const hoSM = await shadowMeta(hairOilShadow);
  const ssSM = await shadowMeta(sunscreenShadow);
  const fwSM = await shadowMeta(faceWashShadow);
  const lbSM = await shadowMeta(lipBalmShadow);
  const mbSM = await shadowMeta(moisturizerShadow);

  const desktopComposite = await sharp(bgBuffer)
    .composite([
      // 1. Back Shadows (Upper Pedestal at y=1170)
      { input: sunscreenShadow, left: Math.round(740 - ssSM.width / 2), top: 1170 - Math.round(ssSM.height * 0.36) },
      { input: faceWashShadow, left: Math.round(1660 - fwSM.width / 2), top: 1170 - Math.round(fwSM.height * 0.36) },
      { input: hairOilShadow, left: Math.round(1200 - hoSM.width / 2), top: 1170 - Math.round(hoSM.height * 0.36) },

      // 2. Standing Bottles
      { input: sunscreenImg, left: sunscreenX, top: sunscreenY },
      { input: faceWashImg, left: faceWashX, top: faceWashY },
      { input: hairOilImg, left: hairOilX, top: hairOilY },

      // 3. Front Shadows (Lower Pedestal at y=1260)
      { input: lipBalmShadow, left: Math.round(350 - lbSM.width / 2), top: 1260 - Math.round(lbSM.height * 0.36) },
      { input: moisturizerShadow, left: Math.round(2050 - mbSM.width / 2), top: 1260 - Math.round(mbSM.height * 0.36) },

      // 4. Front Jars
      { input: lipBalmImg, left: lipBalmX, top: lipBalmY },
      { input: moisturizerImg, left: moisturizerX, top: moisturizerY },
    ])
    .png()
    .toBuffer();

  // Export Desktop WebP & AVIF (< 150 KB)
  const desktopWebP = await sharp(desktopComposite)
    .webp({ quality: 64, smartSubsample: true, effort: 6 })
    .toBuffer();

  const desktopAVIF = await sharp(desktopComposite)
    .avif({ quality: 58, effort: 4 })
    .toBuffer();

  fs.writeFileSync('public/images/dr-rias-hero-lineup-desktop.webp', desktopWebP);
  fs.writeFileSync('public/images/dr-rias-hero-lineup-desktop.avif', desktopAVIF);
  fs.writeFileSync('/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c/dr-rias-hero-lineup-desktop.png', desktopComposite);

  console.log(`[Desktop] WebP: ${(desktopWebP.length / 1024).toFixed(1)} KB (target < 150 KB)`);
  console.log(`[Desktop] AVIF: ${(desktopAVIF.length / 1024).toFixed(1)} KB (target < 150 KB)`);

  const hotspots = {
    lipBalm: {
      slug: 'anti-pigmentation-lip-balm',
      name: 'Anti Pigmentation Lip Balm',
      x: ((lipBalmX / W) * 100).toFixed(1),
      y: ((lipBalmY / H) * 100).toFixed(1),
      w: ((lipBalmMeta.width / W) * 100).toFixed(1),
      h: ((lipBalmMeta.height / H) * 100).toFixed(1),
    },
    sunscreen: {
      slug: 'spf-50-pa-sunscreen',
      name: 'SPF-50 PA+++ Sunscreen',
      x: ((sunscreenX / W) * 100).toFixed(1),
      y: ((sunscreenY / H) * 100).toFixed(1),
      w: ((sunscreenMeta.width / W) * 100).toFixed(1),
      h: ((sunscreenMeta.height / H) * 100).toFixed(1),
    },
    hairOil: {
      slug: 'hair-growth-oil',
      name: 'Hair Growth Oil',
      x: ((hairOilX / W) * 100).toFixed(1),
      y: ((hairOilY / H) * 100).toFixed(1),
      w: ((hairOilMeta.width / W) * 100).toFixed(1),
      h: ((hairOilMeta.height / H) * 100).toFixed(1),
    },
    faceWash: {
      slug: 'vita-c-daily-glow-face-wash',
      name: 'Vita C Daily Glow Face Wash',
      x: ((faceWashX / W) * 100).toFixed(1),
      y: ((faceWashY / H) * 100).toFixed(1),
      w: ((faceWashMeta.width / W) * 100).toFixed(1),
      h: ((faceWashMeta.height / H) * 100).toFixed(1),
    },
    moisturizer: {
      slug: 'hydroboost-face-moisturizer',
      name: 'Hydroboost Face Moisturizer',
      x: ((moisturizerX / W) * 100).toFixed(1),
      y: ((moisturizerY / H) * 100).toFixed(1),
      w: ((moisturizerMeta.width / W) * 100).toFixed(1),
      h: ((moisturizerMeta.height / H) * 100).toFixed(1),
    },
  };

  return { composite: desktopComposite, hotspots };
}

// ----------------------------------------------------------------------------
// 2. MOBILE HERO (1080 x 1350)
// ----------------------------------------------------------------------------
async function buildMobile() {
  const W = 1080;
  const H = 1350;

  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mobStudioLight" cx="50%" cy="40%" r="68%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="35%" stop-color="#FCFAF6" />
          <stop offset="72%" stop-color="#F8F1E7" />
          <stop offset="100%" stop-color="#EFE4D4" />
        </radialGradient>
        
        <linearGradient id="mobPlinthTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F4ECE2" />
          <stop offset="100%" stop-color="#E4D9C9" />
        </linearGradient>
        
        <linearGradient id="mobPlinthBevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#D9CCB8" />
          <stop offset="100%" stop-color="#C5B6A0" />
        </linearGradient>

        <linearGradient id="mobLowerPlatform" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#EFE5D7" />
          <stop offset="100%" stop-color="#E2D5C4" />
        </linearGradient>

        <linearGradient id="podiumShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#2D1C0E" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#2D1C0E" stop-opacity="0" />
        </linearGradient>
      </defs>

      <rect width="${W}" height="${H}" fill="url(#mobStudioLight)" />

      <!-- Back tier for 3 standing bottles (y: 1100) -->
      <path d="M 60 1100 L 1020 1100 L 980 1135 L 100 1135 Z" fill="url(#mobPlinthTop)" />
      <path d="M 100 1135 L 980 1135 L 980 1147 L 100 1147 Z" fill="url(#mobPlinthBevel)" />
      <rect x="80" y="1147" width="920" height="35" fill="url(#podiumShadow)" />

      <!-- Lower tier for front jars (y: 1220) -->
      <path d="M 20 1220 L 1060 1220 L 1030 1255 L 50 1255 Z" fill="url(#mobLowerPlatform)" opacity="0.9" />
      <path d="M 50 1255 L 1030 1255 L 1030 1267 L 50 1267 Z" fill="url(#mobPlinthBevel)" opacity="0.8" />
      <rect x="30" y="1267" width="1020" height="40" fill="url(#podiumShadow)" opacity="0.5" />
      
      <rect x="0" y="1270" width="${W}" height="80" fill="#EAE0D2" opacity="0.6" />
    </svg>
  `;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // Mobile product sizing:
  // Hair Oil: height 900px
  const hairOilImg = await prepareCutout(cutouts.hairOil, 900);
  const hairOilMeta = await sharp(hairOilImg).metadata();

  // Sunscreen: height 760px
  const sunscreenImg = await prepareCutout(cutouts.sunscreen, 760);
  const sunscreenMeta = await sharp(sunscreenImg).metadata();

  // Face Wash: height 840px
  const faceWashImg = await prepareCutout(cutouts.faceWash, 840);
  const faceWashMeta = await sharp(faceWashImg).metadata();

  // Lip Balm: height 280px
  const lipBalmImg = await prepareCutout(cutouts.lipBalm, 280);
  const lipBalmMeta = await sharp(lipBalmImg).metadata();

  // Moisturizer: height 400px
  const moisturizerImg = await prepareCutout(cutouts.moisturizer, 400);
  const moisturizerMeta = await sharp(moisturizerImg).metadata();

  // Mobile Baselines:
  const hairOilY = 1110 - hairOilMeta.height; // y = 210
  const sunscreenY = 1110 - sunscreenMeta.height; // y = 350
  const faceWashY = 1110 - faceWashMeta.height; // y = 270
  const lipBalmY = 1240 - lipBalmMeta.height; // y = 960
  const moisturizerY = 1240 - moisturizerMeta.height; // y = 840

  // Mobile Horizontal Centers (all completely inside bounds without clipping):
  const hairOilX = Math.round(540 - hairOilMeta.width / 2);
  const sunscreenX = Math.round(270 - sunscreenMeta.width / 2);
  const faceWashX = Math.round(800 - faceWashMeta.width / 2);
  const lipBalmX = 35; // safe 35px from left edge!
  const moisturizerX = W - moisturizerMeta.width - 35; // safe 35px from right edge!

  // Shadows
  const hairOilShadow = await makeRealisticShadow(hairOilMeta.width, 16, 36, 0.7);
  const sunscreenShadow = await makeRealisticShadow(sunscreenMeta.width, 14, 30, 0.65);
  const faceWashShadow = await makeRealisticShadow(faceWashMeta.width, 16, 34, 0.7);
  const lipBalmShadow = await makeRealisticShadow(lipBalmMeta.width, 18, 38, 0.72);
  const moisturizerShadow = await makeRealisticShadow(moisturizerMeta.width, 20, 42, 0.72);

  const shadowMeta = async (buf) => await sharp(buf).metadata();
  const hoSM = await shadowMeta(hairOilShadow);
  const ssSM = await shadowMeta(sunscreenShadow);
  const fwSM = await shadowMeta(faceWashShadow);
  const lbSM = await shadowMeta(lipBalmShadow);
  const mbSM = await shadowMeta(moisturizerShadow);

  const mobileComposite = await sharp(bgBuffer)
    .composite([
      // 1. Back Shadows
      { input: sunscreenShadow, left: Math.round(270 - ssSM.width / 2), top: 1110 - Math.round(ssSM.height * 0.36) },
      { input: faceWashShadow, left: Math.round(800 - fwSM.width / 2), top: 1110 - Math.round(fwSM.height * 0.36) },
      { input: hairOilShadow, left: Math.round(540 - hoSM.width / 2), top: 1110 - Math.round(hoSM.height * 0.36) },

      // 2. Standing Bottles
      { input: sunscreenImg, left: sunscreenX, top: sunscreenY },
      { input: faceWashImg, left: faceWashX, top: faceWashY },
      { input: hairOilImg, left: hairOilX, top: hairOilY },

      // 3. Front Shadows
      { input: lipBalmShadow, left: Math.round(lipBalmX + lipBalmMeta.width / 2 - lbSM.width / 2), top: 1240 - Math.round(lbSM.height * 0.36) },
      { input: moisturizerShadow, left: Math.round(moisturizerX + moisturizerMeta.width / 2 - mbSM.width / 2), top: 1240 - Math.round(mbSM.height * 0.36) },

      // 4. Front Jars
      { input: lipBalmImg, left: lipBalmX, top: lipBalmY },
      { input: moisturizerImg, left: moisturizerX, top: moisturizerY },
    ])
    .png()
    .toBuffer();

  const mobileWebP = await sharp(mobileComposite)
    .webp({ quality: 57, smartSubsample: true, effort: 6 })
    .toBuffer();

  const mobileAVIF = await sharp(mobileComposite)
    .avif({ quality: 52, effort: 4 })
    .toBuffer();

  fs.writeFileSync('public/images/dr-rias-hero-lineup-mobile.webp', mobileWebP);
  fs.writeFileSync('public/images/dr-rias-hero-lineup-mobile.avif', mobileAVIF);
  fs.writeFileSync('/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c/dr-rias-hero-lineup-mobile.png', mobileComposite);

  console.log(`[Mobile] WebP: ${(mobileWebP.length / 1024).toFixed(1)} KB (target < 90 KB)`);
  console.log(`[Mobile] AVIF: ${(mobileAVIF.length / 1024).toFixed(1)} KB (target < 90 KB)`);

  const hotspots = {
    lipBalm: {
      slug: 'anti-pigmentation-lip-balm',
      name: 'Anti Pigmentation Lip Balm',
      x: ((lipBalmX / W) * 100).toFixed(1),
      y: ((lipBalmY / H) * 100).toFixed(1),
      w: ((lipBalmMeta.width / W) * 100).toFixed(1),
      h: ((lipBalmMeta.height / H) * 100).toFixed(1),
    },
    sunscreen: {
      slug: 'spf-50-pa-sunscreen',
      name: 'SPF-50 PA+++ Sunscreen',
      x: ((sunscreenX / W) * 100).toFixed(1),
      y: ((sunscreenY / H) * 100).toFixed(1),
      w: ((sunscreenMeta.width / W) * 100).toFixed(1),
      h: ((sunscreenMeta.height / H) * 100).toFixed(1),
    },
    hairOil: {
      slug: 'hair-growth-oil',
      name: 'Hair Growth Oil',
      x: ((hairOilX / W) * 100).toFixed(1),
      y: ((hairOilY / H) * 100).toFixed(1),
      w: ((hairOilMeta.width / W) * 100).toFixed(1),
      h: ((hairOilMeta.height / H) * 100).toFixed(1),
    },
    faceWash: {
      slug: 'vita-c-daily-glow-face-wash',
      name: 'Vita C Daily Glow Face Wash',
      x: ((faceWashX / W) * 100).toFixed(1),
      y: ((faceWashY / H) * 100).toFixed(1),
      w: ((faceWashMeta.width / W) * 100).toFixed(1),
      h: ((faceWashMeta.height / H) * 100).toFixed(1),
    },
    moisturizer: {
      slug: 'hydroboost-face-moisturizer',
      name: 'Hydroboost Face Moisturizer',
      x: ((moisturizerX / W) * 100).toFixed(1),
      y: ((moisturizerY / H) * 100).toFixed(1),
      w: ((moisturizerMeta.width / W) * 100).toFixed(1),
      h: ((moisturizerMeta.height / H) * 100).toFixed(1),
    },
  };

  return { composite: mobileComposite, hotspots };
}

async function main() {
  console.log('Generating Razor-Sharp Lineup (Desktop & Mobile)...');
  const desktop = await buildDesktop();
  const mobile = await buildMobile();

  // Generate blurDataURL from desktop image
  const desktopWebPBuf = fs.readFileSync('public/images/dr-rias-hero-lineup-desktop.webp');
  const blurBuffer = await sharp(desktopWebPBuf)
    .resize(32, 18, { fit: 'inside' })
    .webp({ quality: 20 })
    .toBuffer();
  const blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

  const meta = {
    desktopHotspots: desktop.hotspots,
    mobileHotspots: mobile.hotspots,
    blurDataURL,
  };

  fs.writeFileSync('source-images/cutouts/hero-meta.json', JSON.stringify(meta, null, 2));
  console.log('Hero lineup assets and metadata successfully generated!');
  console.log(JSON.stringify(meta, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
