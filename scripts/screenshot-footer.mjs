import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/pratyakshkalsi/.gemini/antigravity/brain/3c0cd920-eab0-491c-b94a-20728975b82c';

async function capture() {
  console.log('Launching headless Chrome with CDP...');
  const port = 9222;
  const chrome = spawn(CHROME_PATH, [
    '--headless',
    '--remote-debugging-port=' + port,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ]);

  // Wait for Chrome to listen on port
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

  if (!wsUrl) {
    chrome.kill();
    throw new Error('Failed to connect to Chrome debugging port');
  }

  // Query targets to get the page target
  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');
  const pageWsUrl = pageTarget ? pageTarget.webSocketDebuggerUrl : wsUrl;

  console.log('Connecting to page CDP at', pageWsUrl);
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

  await new Promise((resolve) => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Create new target for desktop
  console.log('Navigating to http://localhost:3000 on desktop (1440x900)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });

  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise((r) => setTimeout(r, 2000));

  // Scroll to footer to ensure lazy loaded images load
  console.log('Scrolling to footer...');
  await send('Runtime.evaluate', {
    expression: 'document.querySelector("footer").scrollIntoView({ behavior: "instant" });',
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Get footer bounding box
  const evalRes = await send('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('footer');
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

  const box = JSON.parse(evalRes.result.value);
  console.log('Footer rect:', box);

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      scale: 1,
    },
    captureBeyondViewport: true,
  });

  const buf = Buffer.from(shot.data, 'base64');
  const desktopOutPath = path.join(ARTIFACT_DIR, 'footer-transparent-desktop.png');
  await fs.writeFile(desktopOutPath, buf);
  console.log('✓ Desktop footer screenshot saved to:', desktopOutPath);

  // Now mobile (390px)
  console.log('Capturing mobile footer (390px)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise((r) => setTimeout(r, 2000));

  await send('Runtime.evaluate', {
    expression: 'document.querySelector("footer").scrollIntoView({ behavior: "instant" });',
  });
  await new Promise((r) => setTimeout(r, 1500));

  const mobileEvalRes = await send('Runtime.evaluate', {
    expression: `
      const el = document.querySelector('footer');
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

  const mobileBox = JSON.parse(mobileEvalRes.result.value);
  console.log('Mobile footer rect:', mobileBox);

  const mobileShot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: mobileBox.x,
      y: mobileBox.y,
      width: mobileBox.width,
      height: mobileBox.height,
      scale: 1,
    },
    captureBeyondViewport: true,
  });

  const mobileBuf = Buffer.from(mobileShot.data, 'base64');
  const mobileOutPath = path.join(ARTIFACT_DIR, 'footer-transparent-mobile.png');
  await fs.writeFile(mobileOutPath, mobileBuf);
  console.log('✓ Mobile footer screenshot saved to:', mobileOutPath);

  ws.close();
  chrome.kill();
}

capture().catch((err) => {
  console.error('Screenshot failed:', err);
  process.exit(1);
});
