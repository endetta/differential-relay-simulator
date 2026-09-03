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
const { render, P, S, thresholdAt, statusOf, iopOf, irtOf, evaluatePoint, addPoint, selectPoint, clearPoints, setMethod, syncCollapsedCentering, SL } = pub;
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
  const d = evaluatePoint(P, pt);           // koordinat DERIVED — titik tak menyimpan irt
  if (Math.abs(d.irt - 5) > 1e-9) throw new Error('Irt harus max(|5|,|4.75|)=5, dapat ' + d.irt);
  contains(E.calcOut.innerHTML, 'Irt = <b>5.00</b> pu', 'preview kalkulator');
});
check('regresi basi: kurva berubah → status titik ikut tanpa menyentuh titik (derived)', () => {
  /* manual (1.0, 0.29): dgn pickup 0.30 → RESTRAIN; pickup 0.20 → ambang turun → TRIP */
  P.pickup = 0.30;
  addPoint('manual', 1.0, 0.29, null, null);
  render();
  if (E.verdictLabel.textContent !== 'RESTRAIN') throw new Error('harus RESTRAIN dulu (pickup 0.30)');
  P.pickup = 0.20;
  render();                                  // tanpa menyentuh titik sama sekali
  if (E.verdictLabel.textContent !== 'TRIP') throw new Error('harus TRIP setelah pickup 0.20');
  contains(E.ptsBody.innerHTML, '>TRIP</span>', 'badge tabel ikut berubah');
  P.pickup = 0.30;
  render();
});

/* peringatan non-blocking (PRD §5.6) — keadaan ilegal tak mungkin ada karena
   modul slopeList menormalkan tiap perintah; tersisa kombinasi "tidak umum". */
check('warnings (via modul): slope2 < slope1 → badge tidak umum', () => {
  pub.SL.load([{ percent: 80, breakpoint: 2.0 }, { percent: 20, breakpoint: null }]);
  render();
  contains(E.warnings.innerHTML, 'tidak umum', 'warnings');
  contains(E.warnings.innerHTML, 'Slope 2 (20%) lebih kecil dari Slope 1 (80%)', 'teks warnings');
});
check('warnings: kurva legal → kosong (modul mengembalikan [])', () => {
  pub.SL.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  render();
  if (E.warnings.innerHTML !== '') throw new Error('default harus tanpa warning');
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

/* ===== revisi: tinggi kartu titik terkunci + skeleton kosong ===== */
check('kartu titik: tinggi TERKUNCI (px tetap) + scroll internal table-wrap', () => {
  const m = src.match(/\.points-card\{[^}]*height:\s*\d+px[^}]*\}/);
  if (!m) throw new Error('rule .points-card dgn height px tetap tidak ditemukan');
  contains(src, '.table-wrap{overflow:auto', 'table-wrap scroll internal');
  contains(src, '.skel', 'css skeleton');
  contains(src, '.sk-bar', 'css skeleton bar');
});
check('tabel kosong → skeleton (.skel), tanpa data-row', () => {
  clearPoints();
  render();
  contains(E.ptsBody.innerHTML, 'class="skel"', 'baris skeleton');
  if (E.ptsBody.innerHTML.includes('data-row')) throw new Error('tidak boleh ada baris titik saat kosong');
});
check('setelah titik ditambah → skeleton diganti baris asli', () => {
  addPoint('manual', 1.0, 2.0, null, null);
  render();
  contains(E.ptsBody.innerHTML, 'data-row', 'baris asli muncul');
  if (E.ptsBody.innerHTML.includes('class="skel"')) throw new Error('skeleton harus hilang saat ada titik');
  contains(E.ptsBody.innerHTML, '>TRIP</span>', 'badge tetap benar');
});

/* ===== revisi: hint chip dihapus ===== */
check('hint chip dihapus: #planeHint / .hint-chip / teks seret-pindah tak ada', () => {
  if (src.includes('planeHint')) throw new Error('planeHint masih ada');
  if (src.includes('hint-chip')) throw new Error('hint-chip masih ada');
  if (src.includes('seret → pindah')) throw new Error('teks hint masih ada');
});

/* ===== revisi: label daerah dipindah (TRIP kiri-atas, RESTRAIN kanan-bawah) ===== */
check('DAERAH TRIP label kiri-atas (x=60 anchor start), RESTRAIN kanan-bawah (x=618 anchor end)', () => {
  render();
  const sv = svg();
  const trip = sv.match(/<text x="([\d.]+)" y="([\d.]+)" text-anchor="start"[^>]*>DAERAH TRIP<\/text>/);
  if (!trip) throw new Error('TRIP label ber-anchor start tidak ditemukan');
  if (trip[1] !== '60') throw new Error('TRIP harus di x=60 (kiri), dapat ' + trip[1]);
  if (parseFloat(trip[2]) > 200) throw new Error('TRIP harus di atas (y=' + trip[2] + ')');
  const rest = sv.match(/<text x="([\d.]+)" y="([\d.]+)" text-anchor="end"[^>]*>DAERAH RESTRAIN<\/text>/);
  if (!rest) throw new Error('RESTRAIN label ber-anchor end tidak ditemukan');
  if (rest[1] !== '618') throw new Error('RESTRAIN harus di x=618 (kanan), dapat ' + rest[1]);
  if (parseFloat(rest[2]) < 300) throw new Error('RESTRAIN harus di bawah (y=' + rest[2] + ')');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
