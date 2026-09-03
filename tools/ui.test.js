/* Tes seam UI & desain (port dari Simulator Distance Relay) + perilaku kartu kanan.
   Jalankan: node tools/ui.test.js
   Seam yang diperiksa: splash, judul .tt-a/.tt-b, collapse .card-b-i, SVG #plane
   (daerah TRIP/RESTRAIN, kurva, pickup, marker BP, halo tick), readout 2 grup,
   tabel titik, peringatan non-blocking, syncCollapsedCentering. */
'use strict';
const fs = require('fs');
const path = require('path');
const HTML = path.join(__dirname, '..', 'differential_relay_simulator.html');
const src = fs.readFileSync(HTML, 'utf8');
const { loadSimulator } = require('./lens-harness.js');

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
function contains(hay, needle, ctx) {
  if (!hay.includes(needle)) throw new Error(`${ctx}: tidak mengandung \`${needle}\``);
}

console.log('ui.test.js — seam desain & perilaku UI');

/* ---------- desain (file mentah, pola title-anim.test.js) ---------- */
check('palet :root dari Distance Relay (--copper-deep dst.)', () => {
  contains(src, '--copper-deep:#8C4E16', ':root');
  contains(src, '--bg:#F1F3F0', ':root');
  contains(src, '--ink:#16233A', ':root');
});
check('font Google: Space Grotesk + Inter + JetBrains Mono', () => {
  contains(src, 'family=Space+Grotesk', 'link fonts');
  contains(src, 'family=Inter', 'link fonts');
  contains(src, 'family=JetBrains+Mono', 'link fonts');
});
check('judul bergantian .tt-a ↔ .tt-b + kilau ttShine', () => {
  contains(src, 'Simulator Differential Relay', 'tt-a');
  contains(src, 'by Sheva - Endetta', 'tt-b');
  contains(src, '@keyframes ttShine', 'css');
  contains(src, '@keyframes ttSwapA', 'css');
  contains(src, '@keyframes ttSwapB', 'css');
  contains(src, 'prefers-reduced-motion', 'css');
});
check('collapse animasi .card-b-i grid 1fr→0fr (bukan display:none)', () => {
  contains(src, '.card-b-i', 'css');
  contains(src, 'grid-template-rows:0fr', 'css');
  contains(src, 'syncCollapsedCentering', 'js');
  contains(src, 'all-collapsed', 'css');
});
check('splash: #splash krem + judul + S H E V A + .wrap opacity 0', () => {
  contains(src, 'id="splash"', 'markup');
  contains(src, 'Differential Relay Simulator', 'sp-title');
  contains(src, '<span>S</span><span>H</span><span>E</span><span>V</span><span>A</span>', 'sp-letters');
  contains(src, '.wrap{opacity:0;}', 'css');
  contains(src, '#root.ready .wrap', 'css');
  contains(src, '@keyframes spUp', 'css');
});
check('KaTeX terpasang (CSS + JS CDN)', () => {
  contains(src, 'katex.min.css', 'head');
  contains(src, 'katex.min.js', 'head');
});
check('lock tinggi desktop ≥921×600 + scrollbar tipis params', () => {
  contains(src, 'min-width:921px', 'css');
  contains(src, 'scrollbar-width:thin', 'css');
});
check('label ber-halo dipakai di SVG plane', () => {
  contains(src, 'paint-order="stroke"', 'js renderPlane');
  contains(src, 'stroke="var(--surface)" stroke-width="3" paint-order', 'js renderPlane');
});
check('PRD terhubung: model & fitur dijamin di docs/PRD.md (markup kunci hadir)', () => {
  contains(src, 'Minimum pickup', 'markup');
  contains(src, 'Metode restraint', 'markup');
  contains(src, 'Tambahkan titik ke plot', 'markup');
  contains(src, 'Skenario', 'markup');
  contains(src, 'Tentang model ini', 'modal');
});

/* ---------- perilaku (harness) ---------- */
const ctx = loadSimulator(HTML);
const E = ctx.els;
const pub = ctx.pub;
const { render, P, S, thresholdAt, statusOf, iopOf, irtOf, addPoint, selectPoint, clearPoints, setMethod, syncCollapsedCentering } = pub;
render();
const svg = () => E.plane.innerHTML;

check('SVG plane: label DAERAH TRIP & RESTRAIN + sumbu', () => {
  contains(svg(), 'DAERAH TRIP', 'svg');
  contains(svg(), 'DAERAH RESTRAIN', 'svg');
  contains(svg(), 'Irt — arus restraint (pu)', 'svg');
  contains(svg(), 'Iop — arus operasi (pu)', 'svg');
});
check('SVG plane: poligon daerah pakai variabel semantik', () => {
  contains(svg(), 'fill="var(--red-soft)"', 'daerah trip');
  contains(svg(), 'fill="var(--green-soft)"', 'daerah restrain');
  contains(svg(), 'stroke="var(--ink)"', 'kurva');
});
check('SVG plane: garis pickup putus-putus copper + label', () => {
  contains(svg(), 'stroke="var(--copper)" stroke-width="1.4" stroke-dasharray', 'pickup');
  contains(svg(), 'pickup', 'label');
});
check('SVG plane: marker breakpoint BP1 (bukan BP2 — slope terakhir tanpa bp)', () => {
  contains(svg(), 'BP1', 'svg');
  if (svg().includes('BP2')) throw new Error('slope terakhir tidak boleh punya marker BP2');
});
check('dekorasi SVG tidak menangkap pointer (klik jatuh ke titik/bg)', () => {
  contains(src, '#plane line,#plane polygon,#plane polyline,#plane text{pointer-events:none;}', 'css');
});

/* titik: manual di atas kurva → TRIP */
addPoint('manual', 1.0, 2.0, null, null);
render();
check('titik manual TRIP: badge tabel + status box', () => {
  contains(E.ptsBody.innerHTML, '>TRIP</span>', 'badge tabel');
  contains(E.readout.innerHTML, 'TRIP', 'readout');
  if (E.verdictLabel.textContent !== 'TRIP') throw new Error('verdict harus TRIP');
  if (!E.marginLabel.textContent.includes('margin')) throw new Error('marginLabel kosong');
  contains(E.readout.innerHTML, '<div class="rgroup-title">Titik uji</div>', 'grup 1');
  contains(E.readout.innerHTML, '<div class="rgroup-title">Keputusan</div>', 'grup 2');
  contains(svg(), 'data-point', 'titik di plot');
});

/* titik dari kalkulator: eksternal → RESTRAIN, ikut metode restraint */
addPoint('calc', irtOf(5, 4.75, 'average'), iopOf(5, 4.75), 5, 4.75);
selectPoint(P.points[1].id);
render();
check('titik kalkulator eksternal → RESTRAIN', () => {
  if (E.verdictLabel.textContent !== 'RESTRAIN') throw new Error('verdict harus RESTRAIN');
  contains(E.ptsBody.innerHTML, '>RESTRAIN</span>', 'badge tabel');
});
check('ganti metode → Average→Maximum mengubah Irt titik kalkulator', () => {
  E.i1.value = '5'; E.i2.value = '4.75';   // stub DOM tidak membaca atribut markup — isi manual
  setMethod('maximum');
  render();
  const pt = P.points.find(p => p.source === 'calc');
  if (Math.abs(pt.irt - 5) > 1e-9) throw new Error('Irt harus max(|5|,|4.75|)=5, dapat ' + pt.irt);
  contains(E.calcOut.innerHTML, 'Irt = <b>5.00</b> pu', 'preview kalkulator');
});

/* peringatan non-blocking untuk konfigurasi aneh (PRD §5.6) */
check('warnings: slope2 < slope1 → badge tidak umum (non-blocking)', () => {
  S.param.slopes = [{ id: 1, percent: 80, breakpoint: 2 }, { id: 2, percent: 20, breakpoint: null }];
  render();
  contains(E.warnings.innerHTML, 'tidak umum', 'warnings');
});
check('warnings: slope < 1% → peringatan', () => {
  S.param.slopes = [{ id: 1, percent: 0.5, breakpoint: null }];
  render();
  contains(E.warnings.innerHTML, 'di bawah 1%', 'warnings');
});

/* pemusatan saat semua kartu diciutkan */
check('syncCollapsedCentering: semua ciut → .all-collapsed', () => {
  S.ui.collapsed.curve = true; S.ui.collapsed.calc = true;
  syncCollapsedCentering();
  if (!E.paramsPanel.classList.contains('all-collapsed')) throw new Error('paramsPanel harus all-collapsed');
  S.ui.collapsed.curve = false; S.ui.collapsed.calc = false;
  syncCollapsedCentering();
  if (E.paramsPanel.classList.contains('all-collapsed')) throw new Error('all-collapsed harus dilepas');
});

/* animasi & presets: tombol hadir + stopAnim aman */
check('tombol animasi sapuan hadir (eksternal → internal)', () => {
  contains(src, '▶ Animasikan: eksternal → internal', 'tombol');
  contains(src, 'stopAnim', 'js');
});
check('preset cepat & skenario hadir', () => {
  contains(src, 'data-preset="dual"', 'preset dual');
  contains(src, 'data-preset="multi"', 'preset multi');
  ['normal', 'external', 'internal', 'satct'].forEach(v => contains(src, `data-v="${v}"`, `skenario ${v}`));
  contains(src, 'SCENARIOS', 'js');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
