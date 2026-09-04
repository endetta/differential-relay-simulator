#!/usr/bin/env node
/* tools/shoot.js — screenshot & layout-report harness untuk Differential Relay Simulator.
   ============================================================================
   Menjalankan headless Chrome (TANPA dependensi npm) via Chrome DevTools Protocol
   (WebSocket native, Node >= 22), memuat file HTML lokal, menerapkan state/view
   tertentu per screenshot, lalu:
     - tools/shots/<view>.png        — tangkapan layar penuh (PNG)
     - tools/shots/report.json       — geometri & gaya elemen kunci per view
     - tools/shots/report.txt        — versi terbaca (utk agent "melihat" UI)
     - tools/shots/index.html        — lembar kontak semua PNG (buka di browser)
   Gunakan oleh agent/developer untuk memeriksa UI tanpa membuka browser.

   Usage:
     node tools/shoot.js                    # semua view + laporan
     node tools/shoot.js --view points      # satu view saja
     node tools/shoot.js --out DIR          # folder output (default tools/shots)
     node tools/shoot.js --wait-ms 2400     # waktu tunggu splash (default 2400)
     CHROME=/path/to/chrome node tools/shoot.js

   Catatan penting:
   - Halaman punya SPLASH pembuka + `.wrap{opacity:0}` sampai `#root.ready` → semua
     screenshot menunggu ~2.4 s setelah load (sesuaikan --wait-ms bila perlu).
   - Font dari CDN; offline → fallback (tidak menggagalkan screenshot).
   - PNG tidak bisa "dibaca" agent → report.json/txt adalah mata utamanya: rect,
     status tooltip, ikon '?' + label induknya, overflow horizontal, error konsol.
   ============================================================================ */
'use strict';
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HTML_NAME = 'differential_relay_simulator.html';
const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, HTML_NAME);
const DEFAULT_OUT = path.join(ROOT, 'tools', 'shots');

/* ---------- argumen ---------- */
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const onlyView = arg('--view', null);
const outDir = path.resolve(arg('--out', DEFAULT_OUT));
const waitMs = parseInt(arg('--wait-ms', '2400'), 10);

/* ---------- cari Chrome ---------- */
function resolveChrome() {
  const cands = [];
  if (process.env.CHROME) cands.push(process.env.CHROME);
  if (process.platform === 'win32') {
    const pf = process.env['ProgramFiles'] || 'C:/Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';
    const la = process.env.LOCALAPPDATA || '';
    cands.push(
      path.join(pf, 'Google/Chrome/Application/chrome.exe'),
      path.join(pf86, 'Google/Chrome/Application/chrome.exe'),
      path.join(la, 'Google/Chrome/Application/chrome.exe'),
      path.join(la, 'Chromium/Application/chrome.exe'),
    );
  } else if (process.platform === 'darwin') {
    cands.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium');
  } else {
    cands.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  for (const c of cands) if (c && fs.existsSync(c)) return c;
  // fallback: cari di PATH
  try { return execFileSync(process.platform === 'win32' ? 'where' : 'which',
    [process.platform === 'win32' ? 'chrome' : 'google-chrome']).toString().trim().split(/\r?\n/)[0]; }
  catch { /* lanjut */ }
  throw new Error('Chrome tidak ditemukan. Set CHROME=/path/to/chrome');
}

/* ---------- CDP mini (tanpa dependensi) ---------- */
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = {};
    this.errors = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id) {
        const p = this.pending.get(m.id);
        if (p) { this.pending.delete(m.id);
          m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      } else if (m.method) {
        (this.events[m.method] || []).forEach((fn) => fn(m.params));
        if (m.method === 'Runtime.exceptionThrown')
          this.errors.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text);
      }
    };
  }
  send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  on(method, fn) { (this.events[method] = this.events[method] || []).push(fn); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchChrome(chromePath) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'drl-shoot-'));
  const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'];
  const proc = spawn(chromePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let port = null, stderr = '';
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && port == null) {
    stderr += proc.stderr.read() || '';
    const m = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
    if (m) port = Number(m[1]);
    if (proc.exitCode != null) break;
    await sleep(100);
  }
  if (port == null) { proc.kill(); throw new Error('Chrome tidak membuka port CDP: ' + stderr.slice(0, 300)); }
  // target halaman
  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* poll */ }
    if (!target) await sleep(100);
  }
  if (!target) { proc.kill(); throw new Error('Target halaman CDP tidak muncul'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  return { cdp: new CDP(ws), proc, profile };
}

/* ---------- file URL ---------- */
function fileUrl(p) {
  const abs = path.resolve(p).replace(/\\/g, '/');
  return 'file:///' + abs.split('/').map((seg) => encodeURIComponent(seg)).join('/');
}

/* ---------- evaluasi JS di halaman ---------- */
async function evalJs(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' — ' + (r.exceptionDetails.exception || {}).description);
  return r.result && r.result.value;
}

/* ---------- laporan tata letak (geometri + gaya) — dipanggil di halaman ---------- */
const REPORT_JS = `(() => {
  const R = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  };
  const vis = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return { display: cs.display, opacity: cs.opacity, shown: cs.display !== 'none' && +cs.opacity > 0 && b.width > 0, rect: { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } };
  };
  const cards = Array.from(document.querySelectorAll('.card')).map((c) => {
    const b = c.getBoundingClientRect();
    return { card: c.dataset.card, collapsed: c.classList.contains('collapsed'),
      rect: { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } };
  });
  const qIcons = Array.from(document.querySelectorAll('.q[data-tip]')).map((q) => {
    const b = q.getBoundingClientRect();
    const parent = q.parentElement;
    const label = (parent ? parent.textContent : '').replace('?', '').trim().slice(0, 44);
    return { tip: q.dataset.tip.slice(0, 44), label, orphan: label === '',
      rect: { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } };
  });
  const pp = document.querySelector('.params-panel');
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight,
      scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight },
    hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    plane: R('#plane'), planeCard: R('.plane-card'), sideCard: R('.side-card'), pointsCard: R('.points-card'),
    legend: R('#legend'),
    legendItems: Array.from(document.querySelectorAll('#legend span')).map((s) => s.textContent.trim()),
    status: { rect: R('.status'), text: (document.querySelector('.status .zlabel') || {}).textContent || '' },
    hero: !!document.querySelector('.hero-row'),
    readoutRect: R('#readout'),
    paramsPanel: pp ? { clientH: pp.clientHeight, scrollH: pp.scrollHeight,
      scrollable: pp.scrollHeight > pp.clientHeight + 1 } : null,
    cards, qIcons,
    planeTip: vis('#planeTip'), qTip: vis('#qTip'),
    obsDynText: (document.querySelector('#obsDyn') || {}).textContent || null,
    state: (() => { try {
      return { err: { ct1: P.err.ct1, ct2: P.err.ct2, mm: P.err.mm },
        obs: { on: P.obs.on, I: P.obs.I, dyn: P.obs.dyn },
        probe: P.probe ? { i1: P.probe.i1, i2: P.probe.i2, obsI: P.probe.obsI } : null };
    } catch (e) { return 'ERR ' + e.message; } })()
  };
})()`;

/* ---------- definisi view (state JS per screenshot) ---------- */
const VIEWS = [
  { name: 'default', w: 1440, h: 1000, js: '' },
  { name: 'points', w: 1440, h: 1000, js: `
    addPoint('manual',1.0,2.0,null,null);
    addPoint('manual',2.0,0.55,null,null);
    addPoint('calc',0,0,4,2,null);
    render(); selectPoint(P.points[0].id);` },
  { name: 'band', w: 1440, h: 1000, js: `
    P.tol=30; P.pickup=0.30; render();
    addPoint('manual',2.0,0.55,null,null); render();` },
  { name: 'err', w: 1440, h: 1000, js: `
    runScenario('satct'); addPoint('calc',0,0,5,5,null); render(); selectPoint(P.points[0].id);` },
  { name: 'obs', w: 1440, h: 1000, js: `
    applyErr(0,20,0); P.obs.dyn=true; applyObs(12);` },       // saturasi dinamis: titik melengkung → TRIP di arus tinggi
  { name: 'obs-lin', w: 1440, h: 1000, js: `
    applyErr(0,20,0); P.obs.dyn=false; applyObs(12);` },     // error proporsional: jejak lurus, RESTRAIN walau 12×
  { name: 'tooltip', w: 1440, h: 1000, wait: 300, js: `
    addPoint('manual',1.0,2.0,null,null); render();
    (() => { const d = evaluatePoint(P, P.points[0]); const map = plane._map; const rect = plane.getBoundingClientRect();
      const px = map.padL + (d.irt / map.xMax) * map.plotW, py = map.padT + (1 - d.iop / map.yMax) * map.plotH;
      plane.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + px, clientY: rect.top + py, bubbles: true })); })();` },
  { name: 'qtip', w: 1440, h: 1000, wait: 300, js: `
    document.querySelector('#errNoteQ').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));` },
  { name: 'collapsed', w: 1440, h: 1000, wait: 600, js: `   // tunggu transisi collapse 0.35s selesai
    document.querySelectorAll('.card-h').forEach((h) => h.click());
    syncCollapsedCentering();` },
  { name: 'mobile', w: 900, h: 840, js: '' },
];

/* ---------- ambil screenshot penuh satu view ---------- */
async function shootView(cdp, view) {
  const { w, h } = view;
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const loaded = new Promise((r) => cdp.on('Page.loadEventFired', r));
  await cdp.send('Page.navigate', { url: fileUrl(HTML_PATH) });
  await loaded;
  await sleep(waitMs);                       // splash + `#root.ready` + font
  if (view.js) await evalJs(cdp, view.js);   // atur state view
  if (view.wait) await sleep(view.wait);     // biarkan animasi tooltip selesai
  const report = await evalJs(cdp, REPORT_JS);
  const lm = await cdp.send('Page.getLayoutMetrics');
  const cs = lm.cssContentSize || lm.contentSize;
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: Math.max(1, Math.ceil(cs.width)),
    height: Math.max(1, Math.ceil(cs.height)), deviceScaleFactor: 1, mobile: false });
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const png = Buffer.from(shot.data, 'base64');
  return { report, png };
}

/* ---------- render laporan teks ---------- */
function renderTxt(report, name) {
  const L = [];
  L.push(`== ${name} ==`);
  const v = report.viewport;
  L.push(`  viewport ${v.w}x${v.h} (scroll ${v.scrollW}x${v.scrollH}) ${report.hOverflow ? '⚠ H-OVERFLOW' : ''}`);
  const fmt = (o) => o ? `${o.w}x${o.h} @(${o.x},${o.y})` : '—';
  L.push(`  plane ${fmt(report.plane)} · plane-card ${fmt(report.planeCard)}`);
  L.push(`  side-card ${fmt(report.sideCard)} · points-card ${fmt(report.pointsCard)} · legend ${fmt(report.legend)}`);
  if (report.legendItems.length) L.push(`  legend: ${report.legendItems.join(' | ')}`);
  L.push(`  status: "${report.status.text}" ${report.hero ? '· hero ✓' : ''}`);
  L.push(`  state ${JSON.stringify(report.state)} · obsDyn "${report.obsDynText}"`);
  L.push(`  params-panel ${report.paramsPanel ? `scroll ${report.paramsPanel.scrollH}px (client ${report.paramsPanel.clientH}) ${report.paramsPanel.scrollable ? '→ scroll internal' : ''}` : '—'}`);
  report.cards.forEach((c) => L.push(`  card ${c.card} ${c.collapsed ? '✂' : ''} ${fmt(c.rect)}`));
  report.qIcons.forEach((q) => L.push(`  ? ${q.orphan ? '⚠ ORPHAN ' : ''}label="${q.label}" tip="${q.tip}" ${fmt(q.rect)}`));
  L.push(`  planeTip ${JSON.stringify(report.planeTip)}`);
  L.push(`  qTip ${JSON.stringify(report.qTip)}`);
  return L.join('\n');
}

/* ---------- main ---------- */
(async () => {
  if (!fs.existsSync(HTML_PATH)) throw new Error('File tidak ada: ' + HTML_PATH);
  fs.mkdirSync(outDir, { recursive: true });
  const chromePath = resolveChrome();
  const { cdp, proc, profile } = await launchChrome(chromePath);
  const views = onlyView ? VIEWS.filter((v) => v.name === onlyView) : VIEWS;
  if (!views.length) throw new Error('View tidak dikenal: ' + onlyView);
  const reportAll = { generated: new Date().toISOString(), html: HTML_NAME, node: process.version,
    chrome: path.basename(chromePath), views: {} };
  const imgs = [];
  try {
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    for (const view of views) {
      const { report, png } = await shootView(cdp, view);
      const pngPath = path.join(outDir, view.name + '.png');
      fs.writeFileSync(pngPath, png);
      reportAll.views[view.name] = report;
      imgs.push({ name: view.name, bytes: png.length, pngPath });
      console.log(`  [${view.name}] ${png.length} bytes ${png.length < 15000 ? '⚠ KECIL (mungkin blank)' : ''}`);
    }
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(reportAll, null, 1));
    const lines = ['# Differential Relay Simulator — laporan tata letak', ''];
    views.forEach((v) => { lines.push(renderTxt(reportAll.views[v.name], v.name), ''); });
    const errs = cdp.errors;
    if (errs.length) { lines.push('⚠ exception konsol:'); errs.forEach((e) => lines.push('  ' + e)); }
    fs.writeFileSync(path.join(outDir, 'report.txt'), lines.join('\n'));
    /* lembar kontak HTML */
    const rel = (f) => './' + path.basename(f);
    const idx = `<!doctype html><html><head><meta charset="utf-8"><title>Shots — Differential Relay Simulator</title>
<style>body{font-family:system-ui;background:#11141c;color:#eee;margin:0;padding:24px}h1{font-size:18px}
.view{margin:0 0 28px}h2{font-size:14px;color:#9fb6d4;margin:6px 0}img{max-width:100%;border:1px solid #333;border-radius:8px;background:#fff}</style></head>
<body><h1>Shots — Differential Relay Simulator (${views.length} view)</h1>
${imgs.map((i) => `<div class="view"><h2>${i.name} · ${(i.bytes / 1024).toFixed(1)} KB</h2><img src="${rel(i.pngPath)}" alt="${i.name}"></div>`).join('')}
</body></html>`;
    fs.writeFileSync(path.join(outDir, 'index.html'), idx);
  } finally {
    proc.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ok */ }
  }
  console.log(`\nSelesai → ${outDir}`);
  console.log(`  PNG   : ${imgs.map((i) => i.name + '.png').join(', ')}`);
  console.log(`  report: report.json · report.txt · index.html`);
})().catch((e) => { console.error('GAGAL: ' + e.message); process.exit(1); });