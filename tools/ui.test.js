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
const { render, P, S, thresholdAt, statusOf, iopOf, irtOf, evaluatePoint, addPoint, selectPoint, clearPoints, setMethod, syncCollapsedCentering, SL, zeroErrors } = pub;
render();
const svg = () => E.plane.innerHTML;

/* default error CT NON-NOL (keputusan sesi): ct1=5% ct2=5% mm=+10% — kelas akurasi
   5P per sisi + offset rasio/tap ~10%. Setelah asersi, suite lama dinolkan agar
   literal lama (err=0) tetap berlaku. */
check('default error CT realistis (5%/5%/+10%) — bukan nol, sesuai CT 5P + tap', () => {
  if (Math.abs(pub.P.err.ct1 - 5) > 1e-9 || Math.abs(pub.P.err.ct2 - 5) > 1e-9 || Math.abs(pub.P.err.mm - 10) > 1e-9)
    throw new Error('default err harus 5/5/10: ' + JSON.stringify(pub.P.err));
  contains(src, 'value="5"', 'slider error default 5%');
  contains(src, 'value="10"', 'slider mismatch default 10%');
  contains(src, 'DEFAULT_ERR', 'konstanta DEFAULT_ERR');
  zeroErrors(); render();   // literal suite lama diasumsikan err = 0
});

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
  contains(src, '#plane line,#plane polygon,#plane polyline,#plane text', 'css');
  contains(src, 'pointer-events:none;', 'css');
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
  /* pita tol DINONAKTIFKAN dulu agar flip RESTRAIN→TRIP bersih (dgn pita ±10% titik
     dekat kurva = AMBANG). manual (1.0, 0.29): pickup 0.30 → RESTRAIN; pickup 0.20
     → ambang turun ke 0.25 → TRIP */
  P.tol = 0;
  P.pickup = 0.30;
  addPoint('manual', 1.0, 0.29, null, null);
  render();
  if (E.verdictLabel.textContent !== 'RESTRAIN') throw new Error('harus RESTRAIN dulu (pickup 0.30)');
  P.pickup = 0.20;
  render();                                  // tanpa menyentuh titik sama sekali
  if (E.verdictLabel.textContent !== 'TRIP') throw new Error('harus TRIP setelah pickup 0.20');
  contains(E.ptsBody.innerHTML, '>TRIP</span>', 'badge tabel ikut berubah');
  P.pickup = 0.30; P.tol = 10;
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

/* pemusatan saat semua kartu diciutkan (4 kartu: curve/err/calc/obs) */
check('syncCollapsedCentering: semua ciut → .all-collapsed (4 kartu)', () => {
  S.ui.collapsed.curve = true; S.ui.collapsed.calc = true; S.ui.collapsed.err = true; S.ui.collapsed.obs = true;
  syncCollapsedCentering();
  if (!E.paramsPanel.classList.contains('all-collapsed')) throw new Error('paramsPanel harus all-collapsed');
  S.ui.collapsed.curve = false; S.ui.collapsed.calc = false; S.ui.collapsed.err = false; S.ui.collapsed.obs = false;
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
  ['normal', 'external', 'internal', 'satct', 'inrush'].forEach(v => contains(src, `data-v="${v}"`, `skenario ${v}`));
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

/* ===== fitur: faktor kesalahan pengukuran (CT per sisi + mismatch rasio) ===== */
check('kartu Faktor kesalahan hadir (slider ct1/ct2/mm + reset)', () => {
  contains(src, 'data-card="err"', 'kartu error');
  contains(src, 'Faktor kesalahan pengukuran', 'judul kartu');
  ['err-ct1', 'err-ct1n', 'err-ct2', 'err-ct2n', 'err-mm', 'errReset', 'errv-ct1'].forEach(id => contains(src, 'id="' + id + '"', id));
  contains(src, 'zeroErrors', 'js zeroErrors');
  contains(src, 'runScenario', 'js runScenario');
});
check('kartu error di antara kurva & kalkulator (collapse ke-3)', () => {
  const iCurve = src.indexOf('data-card="curve"'), iErr = src.indexOf('data-card="err"'), iCalc = src.indexOf('data-card="calc"');
  if (!(iCurve < iErr && iErr < iCalc)) throw new Error('urutan kartu harus kurva < err < calc');
  contains(src, 'collapsed:{curve:false,err:false,calc:false,obs:false}', 'state collapse 4 kartu');
});
check('skenario Inrush hadir (pembanding: kurva saja belum cukup)', () => {
  contains(src, 'data-v="inrush"', 'tombol inrush');
  contains(src, 'harmonik ke-2', 'desc inrush menyebut restraint harmonik');
});

/* titik sejati vs titik terukur — keputusan selalu pada yang DILIHAT relay.
   Konteks metode di-set average (sisa maximum dari tes 'ganti metode'): dgn
   maximum + pita toleransi default 10%, titik 5/5+ct2=50 jatuh di AMBANG; demo
   trip PALSU butuh irt rata-rata agar margin jelas di atas pita. */
clearPoints(); pub.P.err.ct1 = 0; pub.P.err.ct2 = 0; pub.P.err.mm = 0;
P.method = 'average';
addPoint('calc', 0, 0, 5, 5);
render();
check('err=0: titik calc 5/5 RESTRAIN, tanpa penanda sejati', () => {
  if (E.verdictLabel.textContent !== 'RESTRAIN') throw new Error('verdict harus RESTRAIN');
  if (svg().includes('data-true-point')) throw new Error('tanpa error tak boleh ada titik sejati');
  if (svg().includes('data-err-link')) throw new Error('tanpa error tak boleh ada garis error');
});
pub.P.err.ct2 = 50; pub.P.err.ct1 = 0; pub.P.err.mm = 0;
render();
check('ct2=50 pd 5/5 → titik sejati + garis error + TRIP PALSU', () => {
  contains(svg(), 'data-true-point', 'ghost titik sejati');
  contains(svg(), 'data-err-link', 'garis penghubung error');
  if (E.verdictLabel.textContent !== 'TRIP') throw new Error('relay melihat TRIP');
  contains(E.ptsBody.innerHTML, '>TRIP</span>', 'badge tabel TRIP');
  contains(E.marginLabel.textContent, 'PALSU', 'indikator PALSU di baris margin');
  contains(E.marginLabel.textContent, 'sejati RESTRAIN', 'status sejati di baris margin');
  contains(E.readout.innerHTML, 'Status sejati', 'readout baris status sejati');
  contains(E.readout.innerHTML, '>RESTRAIN</span>', 'nilai status sejati RESTRAIN');
});
pub.zeroErrors();
render();
check('zeroErrors → penanda hilang, kembali RESTRAIN', () => {
  if (svg().includes('data-true-point')) throw new Error('penanda harus hilang setelah reset');
  if (svg().includes('data-err-link')) throw new Error('garis harus hilang setelah reset');
  if (E.verdictLabel.textContent !== 'RESTRAIN') throw new Error('verdict kembali RESTRAIN');
});

/* preview kalkulator: nilai TERUKUR saat error aktif */
P.method = 'average';
E.i1.value = '5'; E.i2.value = '5';
pub.P.err.ct2 = 50; pub.P.err.ct1 = 0; pub.P.err.mm = 0;
render();
check('preview kalkulator menampilkan nilai TERUKUR saat error aktif', () => {
  contains(E.calcOut.innerHTML, '(terukur', 'suffix terukur');
  contains(E.calcOut.innerHTML, 'Iop = <b>2.50</b> pu', 'iop terukur 2.5');
  contains(E.calcOut.innerHTML, 'Irt = <b>3.75</b> pu', 'irt terukur 3.75');
  contains(E.calcOut.innerHTML, 'sejati Iop 0.00 / Irt 5.00', 'sejati dicantumkan');
});
pub.zeroErrors();
render();
check('preview kembali tanpa suffix saat error 0', () => {
  if (E.calcOut.innerHTML.includes('terukur')) throw new Error('tanpa error tak ada suffix terukur');
  contains(E.calcOut.innerHTML, 'Iop = <b>0.00</b> pu', 'iop 5/5 = 0');
});

/* skenario mengatur kartu error & Inrush auto-add titik demo */
check('runScenario satct → arus sejati 5/5 & ct2=45 (kartu error ikut terisi)', () => {
  pub.P.err.ct2 = 0;
  pub.runScenario('satct');
  if (Math.abs(pub.P.err.ct2 - 45) > 1e-9) throw new Error('ct2 harus 45, dapat ' + pub.P.err.ct2);
  if (pub.P.err.ct1 !== 0 || pub.P.err.mm !== 0) throw new Error('ct1/mm harus 0');
  if (E.i1.value !== '5' || E.i2.value !== '5') throw new Error('arus sejati harus 5/5');
  contains(E.scenQ.dataset.tip, 'TRIP PALSU', 'desc skenario di tip ikon ?');
});
check('runScenario inrush → isi arus 5/0.05 + auto-add titik demo TRIP', () => {
  clearPoints();
  const n = pub.P.points.length;
  pub.runScenario('inrush');
  if (pub.P.points.length !== n + 1) throw new Error('harus menambah 1 titik demo');
  if (E.i1.value !== '5' || Math.abs(parseFloat(E.i2.value) - 0.05) > 1e-9) throw new Error('arus inrush 5/0.05');
  const pt = pub.P.points[pub.P.points.length - 1];
  if (Math.abs(pt.i1 - 5) > 1e-9 || Math.abs(pt.i2 - 0.05) > 1e-9) throw new Error('titik demo harus 5/0.05');
  if (E.verdictLabel.textContent !== 'TRIP') throw new Error('kurva magnitudo → TRIP (pembanding)');
  contains(E.scenQ.dataset.tip, 'harmonik', 'catatan harmonik di tip ikon ?');
});
check('runScenario inrush dua kali → titik demo tak diduplikasi', () => {
  const n = pub.P.points.length;
  pub.runScenario('inrush');
  if (pub.P.points.length !== n) throw new Error('titik demo tak boleh diduplikasi');
});

/* ===== revisi: kartu kanan nilai-langsung (hapus kalimat & kotak edukasi) ===== */
check('kartu kanan: ringkasan kalimat & edu-note DIHAPUS (markup, css, js)', () => {
  if (/class="r-sum"|\.r-sum\{|r-sum\)/.test(src)) throw new Error('sisa .r-sum ditemukan');
  if (src.includes('edu-note')) throw new Error('edu-note masih ada');
  if (src.includes('renderEdu')) throw new Error('renderEdu masih ada');
});
check('kartu kanan: hero Irt/Iop (nilai utama di-highlight) + baris nilai lain', () => {
  clearPoints(); zeroErrors();
  addPoint('manual', 1.0, 2.0, null, null);
  render();
  if (E.readout.innerHTML.includes('r-sum')) throw new Error('r-sum masih dirender');
  if (E.readout.innerHTML.includes('berada di <b>atas</b> ambang')) throw new Error('kalimat ringkasan masih ada');
  contains(E.readout.innerHTML, '<div class="rgroup-title">Titik uji</div>', 'grup 1');
  contains(E.readout.innerHTML, '<div class="rgroup-title">Keputusan</div>', 'grup 2');
  contains(E.readout.innerHTML, '<div class="hero-row">', 'hero-row');
  contains(E.readout.innerHTML, '<span class="h-l">Irt — restraint</span>', 'label hero Irt');
  contains(E.readout.innerHTML, '<span class="h-l">Iop — operasi</span>', 'label hero Iop');
  contains(E.readout.innerHTML, '<span class="h-v">1.00</span>', 'nilai hero Irt');
  contains(E.readout.innerHTML, '<span class="h-v">2.00</span>', 'nilai hero Iop');
  if (E.readout.innerHTML.includes('Irt (restraint)')) throw new Error('baris Irt lama harus diganti hero');
  if (E.readout.innerHTML.includes('Iop (operasi)</span><span>')) throw new Error('baris Iop lama harus diganti hero');
  contains(E.readout.innerHTML, '<span>Ambang kurva</span><span>0.30 pu</span>', 'nilai ambang');
  /* revisi visual: Iop dulu (nilai keputusan), chip status, aksen & tint status */
  const h = E.readout.innerHTML;
  const iIop = h.indexOf('<span class="h-l">Iop — operasi</span>');
  const iIrt = h.indexOf('<span class="h-l">Irt — restraint</span>');
  if (!(iIop >= 0 && iIrt >= 0 && iIop < iIrt)) throw new Error('Iop harus tampil lebih dulu (nilai keputusan)');
  contains(h, '<div class="hero trip">', 'tile Iop berkelas status');
  contains(h, '<span class="h-chip">TRIP</span>', 'chip status TRIP di tile Iop');
  contains(h, '<span class="h-top">', 'baris atas hero (label+chip)');
  contains(h, '<span class="h-val">', 'baris nilai hero');
  if (h.indexOf('<span class="h-chip">') < iIop || h.indexOf('<span class="h-chip">') > iIop + 200)
    throw new Error('chip status harus di dalam tile Iop');
  contains(src, '.readout .hero::before', 'garis aksen status');
  contains(src, '.readout .hero.trip{background:var(--red-soft)', 'tile Iop tinted status');
  contains(src, '.readout .hero .h-chip', 'css chip');
});

/* ===== fitur: tooltip elemen (hanya yg digambar, dgn margin ±10 px) ===== */
check('tooltip: markup .tip + id planeTip hadir', () => {
  contains(src, 'id="planeTip"', 'elemen tooltip');
  contains(src, '.plane-card .tip', 'css tooltip');
  contains(src, 'hoverInfo', 'js hoverInfo');
});
check('hoverInfo: titik uji (di atas kurva) → kind point + nilai', () => {
  clearPoints(); zeroErrors();
  pub.SL.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  P.pickup = 0.30; P.method = 'average';
  addPoint('manual', 1.0, 2.0, null, null);
  render();
  const map = E.plane._map; if (!map) throw new Error('map tidak ada');
  const h = pub.hoverInfo(map, 1.0, 2.0);
  if (!h || h.kind !== 'point') throw new Error('harus kind point, dapat ' + (h && h.kind));
  contains(h.head, 'TRIP', 'head status');
  contains(h.rows[0], 'Irt 1.00 pu', 'baris Irt');
  contains(h.rows[1], 'Iop 2.00 pu', 'baris Iop');
});
check('hoverInfo: breakpoint BP1 (2.0, 0.5) → kind bp + slope 25%', () => {
  const map = E.plane._map;
  const h = pub.hoverInfo(map, 2.0, 0.5);
  if (!h || h.kind !== 'bp') throw new Error('harus kind bp, dapat ' + (h && h.kind));
  contains(h.head, 'Breakpoint 1', 'head bp');
  if (!h.rows.join('|').includes('slope 25%')) throw new Error('slope 25% harus ada: ' + h.rows);
});
check('hoverInfo: kurva ambang di (3, 1.2) → kind curve + ambang 1.15', () => {
  const map = E.plane._map;
  const h = pub.hoverInfo(map, 3.0, 1.2);
  if (!h || h.kind !== 'curve') throw new Error('harus kind curve, dapat ' + (h && h.kind));
  if (!h.rows.join('|').includes('ambang 1.15 pu')) throw new Error('ambang harus 1.15: ' + h.rows);
  if (!h.rows.join('|').includes('di atas kurva')) throw new Error('kursor di atas kurva');
});
check('hoverInfo: garis pickup (0.5, 0.30) → kind pickup; area kosong → null', () => {
  const map = E.plane._map;
  const h = pub.hoverInfo(map, 0.5, 0.30);
  if (!h || h.kind !== 'pickup') throw new Error('harus kind pickup, dapat ' + (h && h.kind));
  if (!h.rows.join('|').includes('Iop 0.30 pu')) throw new Error('pickup 0.30: ' + h.rows);
  const empty = pub.hoverInfo(map, 1.0, 3.5);
  if (empty) throw new Error('area kosong harus null, dapat ' + empty.kind);
});

/* ===== revisi: tooltip hilang saat kursor lepas (bug hidden kalah CSS display) ===== */
check('tooltip: class show (display:none default) — bug hidden CSS diperbaiki', () => {
  const tipRule = src.match(/\.plane-card \.tip\{[^}]*\}/);
  if (!tipRule) throw new Error('rule .plane-card .tip tidak ditemukan');
  if (!tipRule[0].includes('display:none')) throw new Error('default .tip harus display:none (hidden attr kalah CSS display:flex)');
  contains(src, '.plane-card .tip.show', 'css .show');
  contains(src, "tip.classList.add('show')", 'js show');
  contains(src, "tip.classList.remove('show')", 'js hide');
  if (src.includes('tip.hidden')) throw new Error('jangan pakai tip.hidden — CSS display:flex menimpanya');
  if (src.includes('planeTip" hidden')) throw new Error('markup tak boleh memakai hidden attr');
});

/* ===== revisi: legenda sederhana (3 item saja) ===== */
check('legenda: hanya titik TRIP/RESTRAIN/sejati — tanpa item lain', () => {
  render();
  const lg = E.legend.innerHTML;
  contains(lg, 'titik TRIP', 'legenda TRIP');
  contains(lg, 'titik RESTRAIN', 'legenda RESTRAIN');
  contains(lg, 'titik sejati', 'legenda sejati');
  ['kurva ambang', 'daerah TRIP', 'pickup'].forEach(w => {
    if (lg.includes(w)) throw new Error('legenda tak boleh memuat: ' + w);
  });
});

/* ===== revisi: scrollbar tipis GLOBAL (bukan bawaan browser) ===== */
check('scrollbar tipis global: * scrollbar-width + ::-webkit-scrollbar 6px', () => {
  contains(src, '*{scrollbar-width:thin', 'scrollbar-width global');
  contains(src, 'scrollbar-color:var(--line) transparent', 'scrollbar-color');
  contains(src, '*::-webkit-scrollbar{width:6px', 'webkit global');
  contains(src, 'scrollbar-gutter:stable', 'gutter tetap');
});

/* ===== revisi: kartu error — hint singkat + baris live errOut ===== */
check('kartu error: penjelasan hanya via ikon ? — teks panduan permanen hilang', () => {
  contains(src, 'id="errOut"', 'errOut markup');
  if (/class="hint"/.test(src)) throw new Error('masih ada elemen .hint berisi teks permanen');
  if (!/id="errNoteQ"[^>]*data-tip="[^"]*keputusan di titik terukur/.test(src)) throw new Error('ikon ? harus membawa penjelasan keputusan-di-titik-terukur');
  if (src.includes('arus sekunder yang DILIHAT relay mengecil')) throw new Error('paragraf panjang masih ada');
});
check('errOut live: ct2=50 → I₂ 5.00 → 2.50 pu; tanpa error → identitas', () => {
  E.i1.value = '5'; E.i2.value = '5';
  pub.P.err.ct1 = 0; pub.P.err.ct2 = 50; pub.P.err.mm = 0;
  render();
  contains(E.errOut.textContent, 'I₂ 5.00 → 2.50 pu', 'errOut terukur');
  contains(E.errOut.textContent, 'I₁ 5.00 → 5.00 pu', 'errOut sisi 1 tetap');
  pub.zeroErrors(); render();
  contains(E.errOut.textContent, 'I₂ 5.00 → 5.00 pu', 'errOut tanpa error');
});

/* ===== revisi: keterangan ringkas (metode & skenario) ===== */
check('metode restraint: penjelasan via ikon ? — teks permanen & #methodHint DIHAPUS', () => {
  if (src.includes('id="methodHint"')) throw new Error('methodHint harus dihapus');
  contains(src, 'class="q" data-tip="Rata-rata: Irt=(|I₁|+|I₂|)/2 · Maximum: Irt=max(|I₁|,|I₂|)"', 'tip ikon metode memuat kedua rumus');
  if (src.includes('— konservatif')) throw new Error('kalimat metode masih ada');
});
check('skenario: deskripsi lewat ikon ? (#scenQ data-tip) — #scenHint DIHAPUS', () => {
  if (src.includes('id="scenHint"')) throw new Error('scenHint harus dihapus');
  if (!src.includes('id="scenQ"')) throw new Error('ikon ? skenario (#scenQ) harus ada');
  pub.runScenario('satct');
  if (!(E.scenQ && E.scenQ.dataset.tip && E.scenQ.dataset.tip.includes('TRIP PALSU'))) throw new Error('tip satct: ' + (E.scenQ && E.scenQ.dataset.tip));
  pub.runScenario('inrush');
  if (!(E.scenQ && E.scenQ.dataset.tip && E.scenQ.dataset.tip.includes('harmonik'))) throw new Error('tip inrush: ' + (E.scenQ && E.scenQ.dataset.tip));
});


/* ===== fitur baru: pita toleransi ambang (keputusan 3 status: TRIP/AMBANG/RESTRAIN) ===== */
check('kontrol Toleransi ambang hadir (slider tol + angka, default 10%)', () => {
  contains(src, 'id="tol"', 'slider tol');
  contains(src, 'id="tolNum"', 'angka tol');
  contains(src, 'id="tolv"', 'nilai tol di label');
  contains(src, 'id="tol" min="0" max="50" step="1" value="10"', 'default 10%');
  contains(src, 'tol:10,', 'state default 10');
});
check('P.tol>0 → pita data-band digambar; titik dalam pita = AMBANG (badge/verdict/readout)', () => {
  clearPoints(); zeroErrors();
  P.tol = 30; P.pickup = 0.30;
  pub.SL.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  render();
  contains(svg(), 'data-band', 'pita toleransi harus digambar');
  addPoint('manual', 2.0, 0.55, null, null);   // ambang 0.5, pita 0.5..0.65
  render();
  if (E.verdictLabel.textContent !== 'AMBANG') throw new Error('verdict harus AMBANG: ' + E.verdictLabel.textContent);
  if (E.verdictLabel.style.color !== 'var(--copper)') throw new Error('warna AMBANG harus copper: ' + E.verdictLabel.style.color);
  contains(E.ptsBody.innerHTML, '>AMBANG</span>', 'badge tabel AMBANG');
  contains(E.marginLabel.textContent, 'di dalam pita toleransi', 'wording marginLabel');
  contains(svg(), 'fill="var(--copper)"', 'lingkaran titik AMBANG copper');
  P.tol = 10; render();
});
check('P.tol=0 → pita hilang (data-band tak ada)', () => {
  P.tol = 0; render();
  if (svg().includes('data-band')) throw new Error('tol=0 tak boleh ada pita');
  P.tol = 10; render();
});
check('pita SIMETRIS: batas bawah data-band-low digambar saat tol>0; hilang saat 0', () => {
  clearPoints(); zeroErrors();
  P.tol = 30; P.pickup = 0.30;
  pub.SL.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  render();
  contains(svg(), 'data-band', 'pita harus digambar');
  contains(svg(), 'data-band-low', 'batas bawah pita harus digambar');
  P.tol = 0; render();
  if (svg().includes('data-band-low')) throw new Error('tol=0 tak boleh ada batas bawah pita');
  P.tol = 10; render();
});
check('legenda: item titik AMBANG (copper) ditambahkan', () => {
  render();
  const lg = E.legend.innerHTML;
  contains(lg, 'titik AMBANG', 'legenda AMBANG');
  contains(lg, 'background:var(--copper)', 'swatch copper');
});
check('kartu kanan: baris Pita toleransi (kurva×(1±tol)) saat tol>0; hilang saat 0', () => {
  clearPoints();
  P.tol = 10;
  addPoint('manual', 1.0, 2.0, null, null);
  render();
  contains(E.readout.innerHTML, '<span>Pita toleransi (tol ±10%)</span>', 'label pita');
  contains(E.readout.innerHTML, '<span>0.27 – 0.33 pu</span>', 'pita irt=1: 0.3×0.9 .. 0.3×1.1');
  P.tol = 0; render();
  if (E.readout.innerHTML.includes('Pita toleransi')) throw new Error('tol=0 tak boleh ada baris pita');
  P.tol = 10; render();
});

/* ===== fitur baru: ikon "?" untuk panduan (qTip) — semua teks petunjuk ke tooltip ===== */
check('ikon ? hadir (metode/toleransi/error/skenario) + #qTip', () => {
  contains(src, 'id="qTip"', 'kotak tooltip qTip');
  contains(src, 'class="q" data-tip="Rata-rata: Irt=(|I₁|+|I₂|)/2', 'ikon metode');
  contains(src, 'data-tip="Pita toleransi SIMETRIS di kedua sisi kurva ambang', 'ikon toleransi');
  contains(src, 'data-tip="CT sisi 1 jenuh', 'ikon error sisi 1');
  contains(src, 'data-tip="CT sisi 2 jenuh', 'ikon error sisi 2');
  contains(src, 'data-tip="Mismatch rasio', 'ikon mismatch');
  contains(src, 'id="scenQ"', 'ikon skenario');
  if (!/#qTip\{[^}]*display:none/.test(src)) throw new Error('default #qTip harus display:none');
  contains(src, '#qTip.show', 'css show');
});
check('qTip: delegasi hover .q[data-tip] membaca data-tip (bukan teks permanen)', () => {
  contains(src, "closest('.q[data-tip]')", 'delegasi pointerover');
  contains(src, 'dataset.tip', 'baca data-tip');
});

/* ===== fitur baru: edit titik dari kalkulator (klik → muat I₁/I₂ → perbarui) ===== */
check('klik titik kalkulator → mode edit: I₁/I₂ termuat + tombol Perbarui titik #N', () => {
  clearPoints();
  P.editId = null;
  addPoint('calc', 0, 0, 4, 2);
  if (E.addPointBtn.textContent !== 'Perbarui titik #1') throw new Error('tombol: ' + E.addPointBtn.textContent);
  if (E.i1.value !== '4' || E.i2.value !== '2') throw new Error('I₁/I₂ harus termuat: ' + E.i1.value + '/' + E.i2.value);
  if (P.editId !== P.points[0].id) throw new Error('editId harus menunjuk titik tsb');
});
check('commitCalcAdd mengedit (perbarui) titik, tidak menambah baru', () => {
  E.i1.value = '5'; E.i2.value = '3';
  pub.commitCalcAdd();
  if (P.points.length !== 1) throw new Error('panjang harus tetap 1: ' + P.points.length);
  const pt = P.points[0];
  if (pt.i1 !== 5 || pt.i2 !== 3) throw new Error('titik harus diperbarui ke 5/3: ' + pt.i1 + '/' + pt.i2);
  if (P.editId != null) throw new Error('editId harus dibersihkan');
  if (E.addPointBtn.textContent !== 'Tambahkan titik ke plot') throw new Error('tombol kembali: ' + E.addPointBtn.textContent);
  render();
});
check('titik manual tak masuk mode edit; commitCalcAdd saat tak edit = tambah baru', () => {
  clearPoints(); P.editId = null;
  addPoint('manual', 1.0, 2.0, null, null);
  if (E.addPointBtn.textContent !== 'Tambahkan titik ke plot') throw new Error('manual tak boleh edit: ' + E.addPointBtn.textContent);
  if (P.editId != null) throw new Error('manual tak boleh set editId');
  E.i1.value = '7'; E.i2.value = '1';
  pub.commitCalcAdd();
  if (P.points.length !== 2) throw new Error('harus tambah 1 titik: ' + P.points.length);
  if (P.points[1].i1 !== 7 || P.points[1].i2 !== 1) throw new Error('titik baru harus 7/1');
});


/* ===== fitur: mode pengamatan arus sistem (through-sweep I₁=I₂=I) ===== */
check('kartu Pengamatan arus sistem (obs) hadir — setelah kalkulator; kontrol lengkap', () => {
  const iCalc = src.indexOf('data-card="calc"'), iObs = src.indexOf('data-card="obs"');
  if (!(iCalc > 0 && iObs > iCalc)) throw new Error('kartu obs harus setelah kalkulator');
  ['obsI', 'obsIn', 'obsIv', 'obsDyn', 'obsPlay', 'obsOut', 'obsPreset'].forEach(id => contains(src, 'id="' + id + '"', id));
  contains(src, 'Pengamatan arus sistem', 'judul kartu');
  contains(src, 'Saturasi CT dinamis', 'tombol dyn');
  contains(src, 'collapsed:{curve:false,err:false,calc:false,obs:false}', 'collapse key obs');
});
check('skenario Normal memakai DEFAULT error (5/5/10) — slider tak melompat ke 0', () => {
  pub.P.err.ct1 = 0; pub.P.err.ct2 = 0; pub.P.err.mm = 0;
  pub.runScenario('normal');
  if (pub.P.err.ct1 !== 5 || pub.P.err.ct2 !== 5 || pub.P.err.mm !== 10) throw new Error('normal harus DEFAULT_ERR: ' + JSON.stringify(pub.P.err));
});
check('applyObs: probe I₁=I₂=I, jejak data-obs-path, sumbu melebar utk arus besar', () => {
  clearPoints();
  pub.P.err.ct1 = 0; pub.P.err.ct2 = 0; pub.P.err.mm = 10;
  pub.P.obs.dyn = false; pub.P.obs.on = false;
  pub.applyObs(6);
  if (!pub.P.obs.on) throw new Error('obs harus on setelah applyObs');
  if (!pub.P.probe || Math.abs(pub.P.probe.i1 - 6) > 1e-9 || Math.abs(pub.P.probe.i2 - 6) > 1e-9)
    throw new Error('probe harus 6/6: ' + JSON.stringify(pub.P.probe));
  render();
  contains(svg(), 'data-obs-path', 'jejak pengamatan digambar');
  const d = pub.evaluatePoint(pub.P, pub.P.probe);
  if (d.status !== 'RESTRAIN') throw new Error('6× dgn mm10 harus RESTRAIN: ' + d.status);
  pub.applyObs(12); render();
  contains(svg(), '>20</text>', 'sumbu melebar (tick 20 ada) saat I=12');
  if (svg().includes('data-obs-path') === false) throw new Error('jejak tetap ada');
  pub.P.obs.on = false; pub.P.probe = null;
  pub.P.err.ct1 = 0; pub.P.err.ct2 = 0; pub.P.err.mm = 0;
  render();
});
check('sweep proporsional (dyn off): rasio Iop/Irt KONSTAN utk arus besar (tak makin dekat trip)', () => {
  pub.P.err.ct1 = 5; pub.P.err.ct2 = 5; pub.P.err.mm = 10;
  pub.P.obs.dyn = false;
  pub.applyObs(6); const d6 = pub.evaluatePoint(pub.P, pub.P.probe);
  pub.applyObs(8); const d8 = pub.evaluatePoint(pub.P, pub.P.probe);
  const r6 = d6.iop / d6.irt, r8 = d8.iop / d8.irt;
  if (Math.abs(r6 - r8) > 1e-9) throw new Error('rasio harus konstan: ' + r6 + ' vs ' + r8);
  if (d6.status !== 'RESTRAIN' || d8.status !== 'RESTRAIN') throw new Error('harus RESTRAIN di 6×/8×');
  if (!(d8.margin < 0)) throw new Error('margin negatif');
});
check('saturasi dinamis: di arus tinggi error efektif membesar → titik melewati slope (TRIP)', () => {
  pub.P.err.ct1 = 0; pub.P.err.ct2 = 20; pub.P.err.mm = 0;
  pub.P.obs.dyn = true;
  pub.applyObs(4);
  const d4 = pub.evaluatePoint(pub.P, pub.P.probe);   // ct2 eff 20% → RESTRAIN
  if (d4.status !== 'RESTRAIN') throw new Error('4× harus RESTRAIN: ' + d4.status);
  pub.applyObs(12);
  const d12 = pub.evaluatePoint(pub.P, pub.P.probe);  // ct2 eff 50% → TRIP
  if (d12.status !== 'TRIP') throw new Error('12× dgn saturasi dinamis harus TRIP: ' + d12.status);
  if (!(d12.margin > 0)) throw new Error('margin harus positif: ' + d12.margin);
  contains(E.obsOut.innerHTML, 'TRIP', 'obsOut menampilkan status');
});
check('obsDyn nonaktif = error statis di arus berapa pun', () => {
  pub.P.err.ct1 = 0; pub.P.err.ct2 = 20; pub.P.err.mm = 0;
  pub.P.obs.dyn = false;
  pub.applyObs(4); const e4 = pub.obsEff(pub.P, 4);
  pub.applyObs(12); const e12 = pub.obsEff(pub.P, 12);
  if (Math.abs(e4.ct2Eff - 20) > 1e-9 || Math.abs(e12.ct2Eff - 20) > 1e-9) throw new Error('dyn off harus 20% selalu');
  const d12 = pub.evaluatePoint(pub.P, pub.P.probe);
  if (d12.status !== 'RESTRAIN') throw new Error('dyn off → 12× RESTRAIN: ' + d12.status);
  /* bersihkan: default err + dyn on + obs off */
  pub.applyErr(5, 5, 10);
  pub.P.obs.dyn = true;
  pub.P.obs.on = false; pub.P.probe = null;
  render();
});

/* ===== hasil audit: fix B1–B3 + U1 + C1–C2 (regresi) ===== */
check('B1: clearPoints menghentikan animasi sapuan (stopAnim dipanggil, tombol kembali)', () => {
  pub.startAnim();
  if (E.animateBtn.textContent !== '⏸ Hentikan animasi') throw new Error('animasi harus jalan: ' + E.animateBtn.textContent);
  pub.clearPoints();
  if (E.animateBtn.textContent !== '▶ Animasikan: eksternal → internal') throw new Error('tombol harus kembali: ' + E.animateBtn.textContent);
  if (pub.P.probe != null) throw new Error('probe harus null setelah clear');
  pub.stopAnim();   // no-op aman bila animTimer sudah null
});
check('B2: applyObs(NaN) ditolak — state & label tak jadi NaN', () => {
  pub.P.obs.on = false; pub.P.probe = null;
  pub.applyObs(1);
  const before = pub.P.obs.I;
  pub.applyObs(NaN);
  if (Math.abs(pub.P.obs.I - before) > 1e-9) throw new Error('I harus tetap ' + before + ': ' + pub.P.obs.I);
  if (E.obsIv.textContent.includes('NaN')) throw new Error('label NaN: ' + E.obsIv.textContent);
  pub.applyObs(6); pub.P.obs.on = false; pub.P.probe = null; render();
});
check('B3: removePoint membersihkan mode edit (editId + tombol)', () => {
  clearPoints(); P.editId = null;
  addPoint('calc', 0, 0, 4, 2);            // auto-select → mode edit
  if (P.editId == null) throw new Error('harus mode edit dulu');
  if (E.addPointBtn.textContent !== 'Perbarui titik #1') throw new Error('tombol edit: ' + E.addPointBtn.textContent);
  pub.removePoint(P.points[0].id);
  if (P.editId != null) throw new Error('editId harus dibersihkan: ' + P.editId);
  if (E.addPointBtn.textContent !== 'Tambahkan titik ke plot') throw new Error('tombol harus kembali: ' + E.addPointBtn.textContent);
});
check('U1: klik ikon ? di heading kartu tidak boleh collapse (guard .q di handler card-h)', () => {
  const m = src.match(/\.card-h'\)\.forEach\(h=>h\.addEventListener\('click',e=>\{[\s\S]*?setCollapsed\(card,!S\.ui\.collapsed\[card\]/);
  if (!m) throw new Error('handler card-h tidak ditemukan');
  contains(m[0], "closest('.q')", 'guard ikon bantuan');
  contains(m[0], 'return', 'abaikan klik di ikon ?');
});
check('C1: helper lama X/Y/px2 dihapus (dead code)', () => {
  if (src.includes('const X=m=>')) throw new Error('X masih ada');
  if (src.includes('const Y=m=>')) throw new Error('Y masih ada');
  if (src.includes('const px2=')) throw new Error('px2 masih ada');
});
check('C2: planeHoverPos memakai pointerToPu (satu sumber konversi px→pu)', () => {
  contains(src, 'return pointerToPu(e);', 'planeHoverPos delegasi ke pointerToPu');
  contains(src, 'role="img" aria-label="Diagram Iop-Irt', 'svg punya role img (a11y)');
});

/* ===== revisi: tanda tanya yatim pindah ke heading terkait (.qrow DIHAPUS) ===== */
check('tanda tanya: .qrow yatim DIHAPUS — errNoteQ di card-h err, slope-last di slope-h', () => {
  if (src.includes('class="qrow"')) throw new Error('.qrow masih ada (ikon yatim)');
  contains(src, 'Faktor kesalahan pengukuran<span class="q" id="errNoteQ"', 'errNoteQ di heading kartu error');
  contains(src, '${isLast?`<span class="q" data-tip="Slope terakhir', 'ikon slope-last di baris heading slope');
});

/* ===== revisi: tooltip lebih animatif & bermanfaat (planeTip + qTip) ===== */
check('tooltip animatif: @keyframes tipIn + .plane-card .tip.show pakai animation', () => {
  contains(src, '@keyframes tipIn', 'keyframes tipIn');
  const showRule = src.match(/\.plane-card \.tip\.show\{[^}]*\}/);
  if (!showRule) throw new Error('rule .plane-card .tip.show tidak ditemukan');
  if (!showRule[0].includes('animation:tipIn')) throw new Error('.show harus pakai animation:tipIn: ' + showRule[0]);
});
check('qTip animatif: @keyframes qIn + #qTip.show pakai animation', () => {
  contains(src, '@keyframes qIn', 'keyframes qIn');
  const showRule = src.match(/#qTip\.show\{[^}]*\}/);
  if (!showRule) throw new Error('rule #qTip.show tidak ditemukan');
  if (!showRule[0].includes('animation:qIn')) throw new Error('.show harus pakai animation:qIn: ' + showRule[0]);
});
check('renderTip: kelas status di wadah (trip/ambang/restrain) utk aksen warna', () => {
  contains(src, 'tip.className', 'renderTip menulis className');
  contains(src, "'tip show'", 'kelas dasar wadah');
});
check('hoverInfo bermanfaat: TRIP → baris margin %; AMBANG → catatan pita; kurva (tol>0) → baris pita', () => {
  clearPoints(); zeroErrors();
  P.tol = 20; P.pickup = 0.30;
  pub.SL.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  addPoint('manual', 1.0, 2.0, null, null);        // TRIP (ambang 0.3, pita 0.24..0.36)
  addPoint('manual', 2.0, 0.55, null, null);       // AMBANG (ambang 0.5, pita 0.4..0.6)
  render();
  const map = E.plane._map; if (!map) throw new Error('map tidak ada');
  const h = pub.hoverInfo(map, 1.0, 2.0);
  if (!h || h.kind !== 'point') throw new Error('harus point TRIP: ' + (h && h.kind));
  if (!h.rows.join('|').includes('margin +')) throw new Error('baris margin: ' + h.rows);
  const a = pub.hoverInfo(map, 2.0, 0.55);
  if (!a || a.kind !== 'point') throw new Error('harus point AMBANG: ' + (a && a.kind));
  if (!a.rows.join('|').includes('dlm pita toleransi ±20%')) throw new Error('catatan AMBANG: ' + a.rows);
  const c = pub.hoverInfo(map, 3.0, 1.15);          // kurva @3 = 1.15, pita 0.92..1.38
  if (!c || c.kind !== 'curve') throw new Error('harus curve: ' + (c && c.kind));
  if (!c.rows.join('|').includes('pita 0.92…1.38 pu')) throw new Error('baris pita kurva: ' + c.rows);
  P.tol = 10; render();
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
