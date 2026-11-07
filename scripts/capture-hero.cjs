const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const TARGET_URL = 'https://hahahah-web.vercel.app/';
const OUTPUT_FILE = path.resolve(__dirname, '../web/public/og-hero.png');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log('1. Launching headless Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1200,630',
    '--hide-scrollbars',
    'about:blank'
  ]);

  chrome.on('error', (err) => console.error('Chrome error:', err));

  // Wait for Chrome to open debugging port
  let targets = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        targets = await res.json();
        break;
      }
    } catch (e) {
      // waiting
    }
  }

  if (!targets || targets.length === 0) {
    console.error('Failed to connect to Chrome CDP.');
    chrome.kill();
    process.exit(1);
  }

  console.log('2. Creating tab pointing to:', TARGET_URL);
  const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(TARGET_URL)}`, { method: 'PUT' });
  const tab = await newTabRes.json();
  const wsUrl = tab.webSocketDebuggerUrl;

  console.log('3. Connecting to WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    const id = idCounter++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        p.reject(new Error(msg.error.message));
      } else {
        p.resolve(msg.result);
      }
    }
  };

  console.log('4. Initializing page & viewport (1200x630)...');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 630,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('5. Waiting 4.5 seconds for Doodle crew and animations to finish stamping...');
  await sleep(4500);

  console.log('6. Capturing screenshot...');
  const screenshotRes = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: 0,
      y: 0,
      width: 1200,
      height: 630,
      scale: 1
    }
  });

  const buffer = Buffer.from(screenshotRes.data, 'base64');
  fs.writeFileSync(OUTPUT_FILE, buffer);
  console.log('7. Saved screenshot to:', OUTPUT_FILE, `(${buffer.length} bytes)`);

  ws.close();
  chrome.kill();
  console.log('Done!');
}

capture().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
