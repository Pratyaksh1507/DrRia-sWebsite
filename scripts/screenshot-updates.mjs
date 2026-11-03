import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c';

async function main() {
  const port = 9222;
  const chrome = spawn(CHROME_PATH, [
    '--headless',
    '--remote-debugging-port=' + port,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');
  const pageWsUrl = pageTarget ? pageTarget.webSocketDebuggerUrl : wsUrl;

  const ws = new WebSocket(pageWsUrl);
  let idCounter = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');

  // 1. Desktop Header (Signed Out) - 1440px
  console.log('Capturing Desktop Header (Signed Out)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise((r) => setTimeout(r, 2000));

  // Get header bounding box
  const headerRes = await send('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('header');
      const rect = el.getBoundingClientRect();
      JSON.stringify({
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height
      });
    `,
    returnByValue: true,
  });
  const headerBox = JSON.parse(headerRes.result.value);

  const shotSignedOut = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: headerBox.x,
      y: headerBox.y,
      width: headerBox.width,
      height: headerBox.height,
      scale: 1,
    },
    captureBeyondViewport: true,
  });
  await fs.writeFile(
    path.join(ARTIFACT_DIR, 'header-signed-out-desktop.png'),
    Buffer.from(shotSignedOut.data, 'base64')
  );
  console.log('✓ Saved header-signed-out-desktop.png');

  // 2. Mobile Header (360px)
  console.log('Capturing Mobile Header (360px)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 740,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise((r) => setTimeout(r, 2000));

  const mobileHeaderRes = await send('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('header');
      const rect = el.getBoundingClientRect();
      JSON.stringify({
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height
      });
    `,
    returnByValue: true,
  });
  const mobileHeaderBox = JSON.parse(mobileHeaderRes.result.value);

  const shotMobile = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: mobileHeaderBox.x,
      y: mobileHeaderBox.y,
      width: mobileHeaderBox.width,
      height: mobileHeaderBox.height,
      scale: 1,
    },
    captureBeyondViewport: true,
  });
  await fs.writeFile(
    path.join(ARTIFACT_DIR, 'header-signed-out-mobile-360.png'),
    Buffer.from(shotMobile.data, 'base64')
  );
  console.log('✓ Saved header-signed-out-mobile-360.png');

  // 3. Footer Credit Close-Up
  console.log('Capturing Footer Credit...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise((r) => setTimeout(r, 1500));

  // Scroll to footer credit
  await send('Runtime.evaluate', {
    expression: `
      const credit = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Website designed & developed by'));
      if (credit) credit.scrollIntoView({ behavior: 'instant', block: 'center' });
    `,
  });
  await new Promise((r) => setTimeout(r, 500));

  const creditRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const credit = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Website designed & developed by'));
        const rect = credit ? credit.getBoundingClientRect() : document.querySelector('footer').getBoundingClientRect();
        const pad = 30;
        return JSON.stringify({
          x: Math.max(0, rect.x + window.scrollX - pad),
          y: Math.max(0, rect.y + window.scrollY - pad),
          width: rect.width + pad * 2,
          height: rect.height + pad * 2
        });
      })()
    `,
    returnByValue: true,
  });
  const creditBox = JSON.parse(creditRes.result.value);

  const shotCredit = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: creditBox.x,
      y: creditBox.y,
      width: creditBox.width,
      height: creditBox.height,
      scale: 1,
    },
    captureBeyondViewport: true,
  });
  await fs.writeFile(
    path.join(ARTIFACT_DIR, 'footer-credit-closeup.png'),
    Buffer.from(shotCredit.data, 'base64')
  );
  console.log('✓ Saved footer-credit-closeup.png');

  // 4. Desktop Header (Signed In)
  console.log('Simulating signed-in state for header screenshot...');
  // We can inject a mock user directly into React or DOM for visual verification
  await send('Runtime.evaluate', {
    expression: `
      // Render the signed-in UserNav state in place
      const userNavContainer = document.querySelector('header nav + div');
      const signInLink = document.querySelector('a[aria-label="Sign in"]');
      if (signInLink) {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative';
        wrapper.innerHTML = \`
          <button type="button" aria-expanded="true" aria-haspopup="true" aria-label="Account" class="group relative min-w-[44px] min-h-[44px] p-2.5 rounded-full text-[#5C3D1E] hover:text-[#C9952A] hover:bg-[#F3EBDD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#3A7D44] ring-2 ring-[#FBF6EE]" aria-hidden="true"></span>
          </button>
          <div role="menu" aria-label="Account options" class="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8E0D5] shadow-xl p-2 z-50 text-xs space-y-1">
            <div class="px-3 py-2 border-b border-[#F3EBDD]">
              <p class="font-semibold text-[#1A1A1A] truncate">Dr Ria Patron</p>
              <p class="text-[11px] text-[#6B6B6B] truncate">patron@drrias.in</p>
            </div>
            <a href="/account#orders" role="menuitem" class="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1A1A] hover:bg-[#FDFBF7] hover:text-[#5C3D1E] transition-colors">
              <svg class="w-4 h-4 text-[#C9952A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              <span>My Orders</span>
            </a>
            <a href="/account" role="menuitem" class="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1A1A] hover:bg-[#FDFBF7] hover:text-[#5C3D1E] transition-colors">
              <svg class="w-4 h-4 text-[#4A7FA5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              <span>Profile</span>
            </a>
            <div class="pt-1 border-t border-[#F3EBDD]">
              <button type="button" role="menuitem" class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-left font-medium">
                <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        \`;
        signInLink.replaceWith(wrapper);
      }
    `,
  });
  await new Promise((r) => setTimeout(r, 500));

  const shotSignedIn = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: headerBox.x,
      y: headerBox.y,
      width: headerBox.width,
      height: 280, // capture dropdown as well
      scale: 1,
    },
    captureBeyondViewport: true,
  });
  await fs.writeFile(
    path.join(ARTIFACT_DIR, 'header-signed-in-desktop.png'),
    Buffer.from(shotSignedIn.data, 'base64')
  );
  console.log('✓ Saved header-signed-in-desktop.png');

  ws.close();
  chrome.kill();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
