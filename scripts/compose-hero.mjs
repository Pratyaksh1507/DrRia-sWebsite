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
async function makeRealisticShadow(baseWidth, contactHeight = 16, ambientHeight = 36, opacity = 0.6) {
  const w = Math.round(baseWidth * 1.3);
  const h = Math.round(ambientHeight * 2);
  
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Intense tight contact shadow directly under base -->
        <radialGradient id="contactG" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#26170A" stop-opacity="${opacity}" />
          <stop offset="50%" stop-color="#26170A" stop-opacity="${opacity * 0.5}" />
          <stop offset="100%" stop-color="#26170A" stop-opacity="0" />
        </radialGradient>
        <!-- Soft diffuse ambient bounce shadow -->
        <radialGradient id="ambientG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#4A3018" stop-opacity="${opacity * 0.35}" />
          <stop offset="70%" stop-color="#4A3018" stop-opacity="${opacity * 0.1}" />
          <stop offset="100%" stop-color="#4A3018" stop-opacity="0" />
        </radialGradient>
      </defs>
      <!-- Ambient layer -->
      <ellipse cx="${w / 2}" cy="${h * 0.55}" rx="${w * 0.48}" ry="${ambientHeight * 0.65}" fill="url(#ambientG)" />
      <!-- Contact layer -->
      <ellipse cx="${w / 2}" cy="${h * 0.35}" rx="${baseWidth * 0.46}" ry="${contactHeight * 0.5}" fill="url(#contactG)" />
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .blur(5)
    .png()
    .toBuffer();
}

// ----------------------------------------------------------------------------
// 1. DESKTOP HERO (2400 x 1350)
// ----------------------------------------------------------------------------
async function buildDesktop() {
  const W = 2400;
  const H = 1350;

  // Background with stone podium structure
  // Top tier pedestal at y = 960 for bottles
  // Lower tier at y = 1060 for front jars
  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="deskStudioLight" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="35%" stop-color="#FCFAF5" />
          <stop offset="70%" stop-color="#F7EFE3" />
          <stop offset="100%" stop-color="#EFE2D0" />
        </radialGradient>
        
        <!-- Stone Plinth Top Surface (Travertine / warm sandstone) -->
        <linearGradient id="plinthTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F2E8DC" />
          <stop offset="50%" stop-color="#EAE0D2" />
          <stop offset="100%" stop-color="#E2D6C6" />
        </linearGradient>
        
        <!-- Plinth Bevel Edge -->
        <linearGradient id="plinthBevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#D6C7B2" />
          <stop offset="100%" stop-color="#C2B29C" />
        </linearGradient>

        <!-- Lower Platform Top Surface -->
        <linearGradient id="lowerPlatform" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ECE1D3" />
          <stop offset="100%" stop-color="#DFD2C1" />
        </linearGradient>

        <linearGradient id="podiumShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#2D1C0E" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#2D1C0E" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Seamless Warm Studio Backdrop -->
      <rect width="${W}" height="${H}" fill="url(#deskStudioLight)" />

      <!-- Upper Tier Architectural Pedestal for standing bottles (y: 960) -->
      <path d="M 680 960 L 1720 960 L 1680 995 L 720 995 Z" fill="url(#plinthTop)" />
      <path d="M 720 995 L 1680 995 L 1680 1007 L 720 1007 Z" fill="url(#plinthBevel)" />
      <rect x="700" y="1007" width="1000" height="40" fill="url(#podiumShadow)" />

      <!-- Lower Stepped Platform for front jars and floor (y: 1060) -->
      <path d="M 220 1060 L 2180 1060 L 2140 1095 L 260 1095 Z" fill="url(#lowerPlatform)" opacity="0.85" />
      <path d="M 260 1095 L 2140 1095 L 2140 1105 L 260 1105 Z" fill="url(#plinthBevel)" opacity="0.7" />
      <rect x="240" y="1105" width="1920" height="50" fill="url(#podiumShadow)" opacity="0.6" />

      <!-- Floor base gradient -->
      <rect x="0" y="1100" width="${W}" height="250" fill="#E8DDD0" opacity="0.5" />
    </svg>
  `;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // Resize products maintaining true luxury cosmetic scale:
  // Hair Growth Oil (tallest center bottle): height 880px
  const hairOilImg = await sharp(cutouts.hairOil).resize({ height: 880 }).toBuffer();
  const hairOilMeta = await sharp(hairOilImg).metadata();

  // SPF-50 Sunscreen (standing left bottle): height 740px
  const sunscreenImg = await sharp(cutouts.sunscreen).resize({ height: 740 }).toBuffer();
  const sunscreenMeta = await sharp(sunscreenImg).metadata();

  // Vita C Face Wash (standing right bottle): height 820px
  const faceWashImg = await sharp(cutouts.faceWash).resize({ height: 820 }).toBuffer();
  const faceWashMeta = await sharp(faceWashImg).metadata();

  // Lip Balm (small 15g front-left jar): height 270px
  const lipBalmImg = await sharp(cutouts.lipBalm).resize({ height: 270 }).toBuffer();
  const lipBalmMeta = await sharp(lipBalmImg).metadata();

  // Hydroboost (open 50g front-right jar): height 380px
  const moisturizerImg = await sharp(cutouts.moisturizer).resize({ height: 380 }).toBuffer();
  const moisturizerMeta = await sharp(moisturizerImg).metadata();

  // Vertical Baselines:
  // Upper tier baseline: y = 970
  // Lower tier baseline: y = 1070

  const hairOilY = 970 - hairOilMeta.height; // y = 90
  const sunscreenY = 970 - sunscreenMeta.height; // y = 230
  const faceWashY = 970 - faceWashMeta.height; // y = 150
  const lipBalmY = 1070 - lipBalmMeta.height; // y = 800
  const moisturizerY = 1070 - moisturizerMeta.height; // y = 690

  // Horizontal X Centers:
  // Center: Hair Oil at X = 1200
  const hairOilX = Math.round(1200 - hairOilMeta.width / 2); // ~1058

  // Sunscreen at X = 900 (generous gap from hair oil, completely unobstructed!)
  const sunscreenX = Math.round(900 - sunscreenMeta.width / 2); // ~798

  // Face Wash at X = 1500 (generous gap from hair oil, completely unobstructed!)
  const faceWashX = Math.round(1500 - faceWashMeta.width / 2); // ~1368

  // Lip Balm at X = 560 (foreground left, completely unobscuring Sunscreen!)
  const lipBalmX = Math.round(560 - lipBalmMeta.width / 2); // ~400

  // Hydroboost Moisturizer at X = 1840 (foreground right, completely unobscuring Face Wash!)
  const moisturizerX = Math.round(1840 - moisturizerMeta.width / 2); // ~1650

  // Realistic contact shadows:
  const hairOilShadow = await makeRealisticShadow(hairOilMeta.width, 16, 38, 0.65);
  const sunscreenShadow = await makeRealisticShadow(sunscreenMeta.width, 14, 32, 0.6);
  const faceWashShadow = await makeRealisticShadow(faceWashMeta.width, 16, 36, 0.65);
  const lipBalmShadow = await makeRealisticShadow(lipBalmMeta.width, 18, 42, 0.7);
  const moisturizerShadow = await makeRealisticShadow(moisturizerMeta.width, 22, 48, 0.7);

  const shadowMeta = async (buf) => await sharp(buf).metadata();
  const hoSM = await shadowMeta(hairOilShadow);
  const ssSM = await shadowMeta(sunscreenShadow);
  const fwSM = await shadowMeta(faceWashShadow);
  const lbSM = await shadowMeta(lipBalmShadow);
  const mbSM = await shadowMeta(moisturizerShadow);

  const desktopComposite = await sharp(bgBuffer)
    .composite([
      // 1. Back Shadows (Upper Pedestal at y=970)
      { input: sunscreenShadow, left: Math.round(900 - ssSM.width / 2), top: 970 - Math.round(ssSM.height * 0.35) },
      { input: faceWashShadow, left: Math.round(1500 - fwSM.width / 2), top: 970 - Math.round(fwSM.height * 0.35) },
      { input: hairOilShadow, left: Math.round(1200 - hoSM.width / 2), top: 970 - Math.round(hoSM.height * 0.35) },

      // 2. Standing Bottles
      { input: sunscreenImg, left: sunscreenX, top: sunscreenY },
      { input: faceWashImg, left: faceWashX, top: faceWashY },
      { input: hairOilImg, left: hairOilX, top: hairOilY },

      // 3. Front Shadows (Lower Pedestal at y=1070)
      { input: lipBalmShadow, left: Math.round(560 - lbSM.width / 2), top: 1070 - Math.round(lbSM.height * 0.35) },
      { input: moisturizerShadow, left: Math.round(1840 - mbSM.width / 2), top: 1070 - Math.round(mbSM.height * 0.35) },

      // 4. Front Jars
      { input: lipBalmImg, left: lipBalmX, top: lipBalmY },
      { input: moisturizerImg, left: moisturizerX, top: moisturizerY },
    ])
    .png()
    .toBuffer();

  // Export Desktop WebP & AVIF (< 150 KB)
  const desktopWebP = await sharp(desktopComposite)
    .webp({ quality: 84, effort: 6 })
    .toBuffer();

  const desktopAVIF = await sharp(desktopComposite)
    .avif({ quality: 78, effort: 6 })
    .toBuffer();

  fs.writeFileSync('public/images/dr-rias-hero-lineup-desktop.webp', desktopWebP);
  fs.writeFileSync('public/images/dr-rias-hero-lineup-desktop.avif', desktopAVIF);
  fs.writeFileSync('/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c/dr-rias-hero-lineup-desktop.png', desktopComposite);

  console.log(`[Desktop] WebP: ${(desktopWebP.length / 1024).toFixed(1)} KB`);
  console.log(`[Desktop] AVIF: ${(desktopAVIF.length / 1024).toFixed(1)} KB`);

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
        <radialGradient id="mobStudioLight" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="35%" stop-color="#FCFAF5" />
          <stop offset="70%" stop-color="#F7EFE3" />
          <stop offset="100%" stop-color="#EFE2D0" />
        </radialGradient>
        
        <linearGradient id="mobPlinthTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F2E8DC" />
          <stop offset="100%" stop-color="#E2D6C6" />
        </linearGradient>
        
        <linearGradient id="mobPlinthBevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#D6C7B2" />
          <stop offset="100%" stop-color="#C2B29C" />
        </linearGradient>

        <linearGradient id="mobLowerPlatform" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ECE1D3" />
          <stop offset="100%" stop-color="#DFD2C1" />
        </linearGradient>

        <linearGradient id="mobPodiumShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#2D1C0E" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#2D1C0E" stop-opacity="0" />
        </linearGradient>
      </defs>

      <rect width="${W}" height="${H}" fill="url(#mobStudioLight)" />

      <!-- Back tier for 3 standing bottles (y: 970) -->
      <path d="M 120 970 L 960 970 L 930 1005 L 150 1005 Z" fill="url(#mobPlinthTop)" />
      <path d="M 150 1005 L 930 1005 L 930 1017 L 150 1017 Z" fill="url(#mobPlinthBevel)" />
      <rect x="140" y="1017" width="800" height="35" fill="url(#mobPodiumShadow)" />

      <!-- Lower tier for front jars (y: 1060) -->
      <path d="M 30 1060 L 1050 1060 L 1020 1095 L 60 1095 Z" fill="url(#mobLowerPlatform)" opacity="0.85" />
      <path d="M 60 1095 L 1020 1095 L 1020 1105 L 60 1105 Z" fill="url(#mobPlinthBevel)" opacity="0.7" />
      
      <rect x="0" y="1100" width="${W}" height="250" fill="#E8DDD0" opacity="0.5" />
    </svg>
  `;

  const bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // Mobile product sizing:
  // Hair Oil: height 780px
  const hairOilImg = await sharp(cutouts.hairOil).resize({ height: 780 }).toBuffer();
  const hairOilMeta = await sharp(hairOilImg).metadata();

  // Sunscreen: height 660px
  const sunscreenImg = await sharp(cutouts.sunscreen).resize({ height: 660 }).toBuffer();
  const sunscreenMeta = await sharp(sunscreenImg).metadata();

  // Face Wash: height 730px
  const faceWashImg = await sharp(cutouts.faceWash).resize({ height: 730 }).toBuffer();
  const faceWashMeta = await sharp(faceWashImg).metadata();

  // Lip Balm: height 240px
  const lipBalmImg = await sharp(cutouts.lipBalm).resize({ height: 240 }).toBuffer();
  const lipBalmMeta = await sharp(lipBalmImg).metadata();

  // Moisturizer: height 340px
  const moisturizerImg = await sharp(cutouts.moisturizer).resize({ height: 340 }).toBuffer();
  const moisturizerMeta = await sharp(moisturizerImg).metadata();

  // Mobile Baselines:
  // Upper tier: y = 980
  // Lower tier: y = 1070

  const hairOilY = 980 - hairOilMeta.height;
  const sunscreenY = 980 - sunscreenMeta.height;
  const faceWashY = 980 - faceWashMeta.height;
  const lipBalmY = 1070 - lipBalmMeta.height;
  const moisturizerY = 1070 - moisturizerMeta.height;

  // Horizontal positions across 1080px (well-proportioned, zero cutoffs):
  const hairOilX = Math.round(540 - hairOilMeta.width / 2); // Center ~414
  const sunscreenX = Math.round(330 - sunscreenMeta.width / 2); // ~239
  const faceWashX = Math.round(750 - faceWashMeta.width / 2); // ~633
  const lipBalmX = 70; // ~70..356 (low front left)
  const moisturizerX = 670; // ~670..1004 (low front right)

  // Shadows
  const hairOilShadow = await makeRealisticShadow(hairOilMeta.width, 14, 34, 0.65);
  const sunscreenShadow = await makeRealisticShadow(sunscreenMeta.width, 12, 28, 0.6);
  const faceWashShadow = await makeRealisticShadow(faceWashMeta.width, 14, 32, 0.65);
  const lipBalmShadow = await makeRealisticShadow(lipBalmMeta.width, 16, 38, 0.7);
  const moisturizerShadow = await makeRealisticShadow(moisturizerMeta.width, 20, 42, 0.7);

  const shadowMeta = async (buf) => await sharp(buf).metadata();
  const hoSM = await shadowMeta(hairOilShadow);
  const ssSM = await shadowMeta(sunscreenShadow);
  const fwSM = await shadowMeta(faceWashShadow);
  const lbSM = await shadowMeta(lipBalmShadow);
  const mbSM = await shadowMeta(moisturizerShadow);

  const mobileComposite = await sharp(bgBuffer)
    .composite([
      // 1. Back Shadows
      { input: sunscreenShadow, left: Math.round(330 - ssSM.width / 2), top: 980 - Math.round(ssSM.height * 0.35) },
      { input: faceWashShadow, left: Math.round(750 - fwSM.width / 2), top: 980 - Math.round(fwSM.height * 0.35) },
      { input: hairOilShadow, left: Math.round(540 - hoSM.width / 2), top: 980 - Math.round(hoSM.height * 0.35) },

      // 2. Standing Bottles
      { input: sunscreenImg, left: sunscreenX, top: sunscreenY },
      { input: faceWashImg, left: faceWashX, top: faceWashY },
      { input: hairOilImg, left: hairOilX, top: hairOilY },

      // 3. Front Shadows
      { input: lipBalmShadow, left: Math.round(lipBalmX + lipBalmMeta.width / 2 - lbSM.width / 2), top: 1070 - Math.round(lbSM.height * 0.35) },
      { input: moisturizerShadow, left: Math.round(moisturizerX + moisturizerMeta.width / 2 - mbSM.width / 2), top: 1070 - Math.round(mbSM.height * 0.35) },

      // 4. Front Jars
      { input: lipBalmImg, left: lipBalmX, top: lipBalmY },
      { input: moisturizerImg, left: moisturizerX, top: moisturizerY },
    ])
    .png()
    .toBuffer();

  const mobileWebP = await sharp(mobileComposite)
    .webp({ quality: 80, effort: 6 })
    .toBuffer();

  const mobileAVIF = await sharp(mobileComposite)
    .avif({ quality: 74, effort: 6 })
    .toBuffer();

  fs.writeFileSync('public/images/dr-rias-hero-lineup-mobile.webp', mobileWebP);
  fs.writeFileSync('public/images/dr-rias-hero-lineup-mobile.avif', mobileAVIF);
  fs.writeFileSync('/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c/dr-rias-hero-lineup-mobile.png', mobileComposite);

  console.log(`[Mobile] WebP: ${(mobileWebP.length / 1024).toFixed(1)} KB`);
  console.log(`[Mobile] AVIF: ${(mobileAVIF.length / 1024).toFixed(1)} KB`);

  const mobileHotspots = {
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

  return { composite: mobileComposite, hotspots: mobileHotspots };
}

async function main() {
  console.log('Generating refined Desktop Hero...');
  const desktop = await buildDesktop();

  console.log('Generating refined Mobile Hero...');
  const mobile = await buildMobile();

  const blurBase64Desktop = (
    await sharp(desktop.composite).resize(20).webp({ quality: 20 }).toBuffer()
  ).toString('base64');

  const blurBase64Mobile = (
    await sharp(mobile.composite).resize(20).webp({ quality: 20 }).toBuffer()
  ).toString('base64');

  const metaData = {
    desktop: {
      width: 2400,
      height: 1350,
      hotspots: desktop.hotspots,
      blurDataURL: `data:image/webp;base64,${blurBase64Desktop}`,
    },
    mobile: {
      width: 1080,
      height: 1350,
      hotspots: mobile.hotspots,
      blurDataURL: `data:image/webp;base64,${blurBase64Mobile}`,
    },
  };

  fs.writeFileSync('source-images/cutouts/hero-meta.json', JSON.stringify(metaData, null, 2));
  console.log('\nMetadata and hotspots saved to source-images/cutouts/hero-meta.json');
}

main().catch(console.error);
