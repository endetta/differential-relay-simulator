/* Tes MODEL murni (PRD §5) — nilai literal hasil hitung tangan.
   Jalankan: node tools/model.test.js
   Harness: tools/lens-harness.js (stub DOM → jalankan <script> → ekspor __pub). */
'use strict';
const path = require('path');
const HTML = path.join(__dirname, '..', 'differential_relay_simulator.html');
const { loadSimulator } = require('./lens-harness.js');

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
function approx(act, exp, tol, ctx) {
  tol = tol === undefined ? 1e-9 : tol;
  if (Math.abs(act - exp) > tol) throw new Error(`${ctx}: aktual ${act}, harap ${exp} (±${tol})`);
}

const ctx = loadSimulator(HTML);
const { iopOf, irtOf, slopeLine, thresholdAt, statusOf, marginOf, evaluatePoint, measuredPair, computeDomain, render } = ctx.pub;

/* Konfigurasi default PRD §5.5: pickup 0.30, s1 25% @ 2.0, s2 65% → ∞ */
const M = { pickup: 0.30, method: 'average', slopes: [
  { percent: 25, breakpoint: 2.0 },
  { percent: 65, breakpoint: null } ] };

console.log('model.test.js — literals model (PRD §5.2–§5.4)');

/* §5.2 besaran dasar */
check('Iop = |I1−I2| (5 vs 0 → 5)', () => approx(iopOf(5, 0), 5, 1e-9, 'iop internal'));
check('Iop = |I1−I2| (5 vs 4.75 → 0.25)', () => approx(iopOf(5, 4.75), 0.25, 1e-9, 'iop eksternal'));
check('Irt Average = (|I1|+|I2|)/2', () => approx(irtOf(5, 4.75, 'average'), 4.875, 1e-9, 'irt avg'));
check('Irt Maximum = max(|I1|,|I2|)', () => approx(irtOf(5, 4.75, 'maximum'), 5, 1e-9, 'irt max'));
check('Irt Average 1.2/0.6 → 0.9', () => approx(irtOf(1.2, 0.6, 'average'), 0.9, 1e-9, 'irt default'));

/* §5.3 garis slope kumulatif & ambang = max(pickup, slope) */
check('threshold(0) = pickup 0.30', () => approx(thresholdAt(M, 0), 0.3, 1e-9, 'thr@0'));
check('threshold(1) = pickup (0.25 < 0.30)', () => approx(thresholdAt(M, 1), 0.3, 1e-9, 'thr@1'));
check('threshold(2) = 0.25·2 = 0.5 (breakpoint 1)', () => approx(thresholdAt(M, 2), 0.5, 1e-9, 'thr@2'));
check('threshold(3) = 0.5 + 0.65·1 = 1.15 (slope 2)', () => approx(thresholdAt(M, 3), 1.15, 1e-9, 'thr@3'));
check('threshold(5) = 0.5 + 0.65·3 = 2.45', () => approx(thresholdAt(M, 5), 2.45, 1e-9, 'thr@5'));
check('slopeLine murni (tanpa pickup) @1 = 0.25', () => approx(slopeLine(M.pickup, M.slopes, 1), 0.25, 1e-9, 'slopeLine@1'));

/* §5.4 keputusan trip */
check('internal 5/0 → TRIP', () => {
  if (statusOf(M, iopOf(5, 0), irtOf(5, 0, 'average')) !== 'TRIP') throw new Error('harus TRIP');
});
check('eksternal 5/4.75 → RESTRAIN (stabilitas through-fault)', () => {
  if (statusOf(M, iopOf(5, 4.75), irtOf(5, 4.75, 'average')) !== 'RESTRAIN') throw new Error('harus RESTRAIN');
});
check('saturasi CT 5/3 → TRIP (Iop 2 > ambang 1.8)', () => {
  if (statusOf(M, iopOf(5, 3), irtOf(5, 3, 'average')) !== 'TRIP') throw new Error('harus TRIP');
});
check('tepat PADA ambang → RESTRAIN (iop > thr, bukan ≥)', () => {
  if (statusOf(M, 0.5, 2) !== 'RESTRAIN') throw new Error('tepat di kurva harus RESTRAIN');
  if (statusOf(M, 0.5 + 1e-6, 2) !== 'TRIP') throw new Error('di atas kurva harus TRIP');
});
check('margin internal (5,0): Iop 5, thr 0.825 → +506.1%', () => {
  approx(marginOf(M, 5, 2.5), 506.0606, 1e-3, 'margin internal');   // (5−0.825)/0.825
});
check('margin saturasi CT (5,3): (2−1.8)/1.8 = +11.1%', () => {
  approx(marginOf(M, 2, 4), 11.1111, 1e-3, 'margin satct');
});
check('margin eksternal negatif: (0.25−2.36875)/2.36875 = −89.4%', () => {
  approx(marginOf(M, 0.25, 4.875), -89.4459, 1e-3, 'margin eksternal');
});

/* §5.2/§5.4 — evaluatePoint: DERIVED, tidak disimpan di objek titik */
check('evaluatePoint manual {irt:1,iop:2} → TRIP + margin 566.7%', () => {
  const d = evaluatePoint(M, { irt: 1, iop: 2 });
  approx(d.irt, 1, 1e-9, 'd.irt'); approx(d.iop, 2, 1e-9, 'd.iop');
  approx(d.thr, 0.3, 1e-9, 'd.thr (pickup dominan)');
  if (d.status !== 'TRIP') throw new Error('status harus TRIP');
  approx(d.margin, 566.6667, 1e-3, 'd.margin');
});
check('evaluatePoint calc {5,4.75} Average → irt 4.875, RESTRAIN', () => {
  const d = evaluatePoint(M, { i1: 5, i2: 4.75 });
  approx(d.irt, 4.875, 1e-9, 'd.irt'); approx(d.iop, 0.25, 1e-9, 'd.iop');
  approx(d.thr, 2.36875, 1e-9, 'd.thr');
  if (d.status !== 'RESTRAIN') throw new Error('harus RESTRAIN');
});
check('evaluatePoint calc {5,4.75} Maximum → irt 5 (ikut metode restraint)', () => {
  const d = evaluatePoint({ pickup: 0.3, method: 'maximum', slopes: M.slopes }, { i1: 5, i2: 4.75 });
  approx(d.irt, 5, 1e-9, 'd.irt max');
  if (d.status !== 'RESTRAIN') throw new Error('harus RESTRAIN');
  approx(d.thr, 2.45, 1e-9, 'd.thr @5');
});
check('evaluatePoint internal {5,0} → TRIP', () => {
  const d = evaluatePoint(M, { i1: 5, i2: 0 });
  approx(d.irt, 2.5, 1e-9, 'd.irt'); if (d.status !== 'TRIP') throw new Error('harus TRIP');
});
check('evaluatePoint mengabaikan field basi di objek titik (stale unrepresentable)', () => {
  /* field status/margin lama di objek TIDAK dibaca — selalu dihitung dari kurva kini */
  const stale = { id: 1, source: 'calc', i1: 5, i2: 4.75, status: 'TRIP', margin: 999, thr: 0 };
  const d = evaluatePoint(M, stale);
  if (d.status !== 'RESTRAIN') throw new Error('field stale tak boleh dipakai');
  approx(d.margin, -89.4459, 1e-3, 'margin dihitung ulang');
});

/* §5.5 + preset multi-slope (3 segmen) */
const MM = { pickup: 0.20, method: 'average', slopes: [
  { percent: 25, breakpoint: 1.5 },
  { percent: 40, breakpoint: 4.0 },
  { percent: 80, breakpoint: null } ] };
check('multi: threshold(0)=pickup 0.20', () => approx(thresholdAt(MM, 0), 0.2, 1e-9, 'multi@0'));
check('multi: threshold(1)=0.25 (slope1)', () => approx(thresholdAt(MM, 1), 0.25, 1e-9, 'multi@1'));
check('multi: threshold(3)=0.375+0.60=0.975 (slope2)', () => approx(thresholdAt(MM, 3), 0.975, 1e-9, 'multi@3'));
check('multi: threshold(5)=0.375+1.0+0.80=2.175 (slope3)', () => approx(thresholdAt(MM, 5), 2.175, 1e-9, 'multi@5'));

/* rentang sumbu */
check('domain default = 5 × 5 pu', () => {
  const d = computeDomain(M);
  if (d.xMax !== 5 || d.yMax !== 5) throw new Error(`xMax/yMax = ${d.xMax}/${d.yMax}, harap 5/5`);
});
check('single slope rendah → yMax tetap ≥ 1', () => {
  const d = computeDomain({ pickup: 0.1, method: 'average', slopes: [{ percent: 5, breakpoint: null }] });
  if (d.yMax < 1) throw new Error('yMax harus minimal 1');
});

/* simulator ikut render tanpa error */
check('render() default jalan (tanpa error)', () => { render(); });

/* ===== fitur: faktor kesalahan pengukuran (CT per sisi + mismatch rasio) =====
   Relay melihat arus TERUKUR: I1m = I1·(1−ct1/100); I2m = I2·(1−ct2/100)·(1+mm/100).
   Keputusan diambil pada titik terukur; koordinat sejati tetap dilaporkan. */
check('measuredPair tanpa err = identitas (ct/mm default 0)', () => {
  const a = measuredPair(5, 4.75);
  approx(a.i1m, 5, 1e-9, 'i1m'); approx(a.i2m, 4.75, 1e-9, 'i2m');
  const b = measuredPair(5, 4.75, { ct1: 0, ct2: 0, mm: 0 });
  approx(b.i1m, 5, 1e-9, 'i1m eksplisit'); approx(b.i2m, 4.75, 1e-9, 'i2m eksplisit');
});
check('measuredPair ct2=50 → I2 terukur 2.5 (CT jenuh mengecilkan)', () => {
  const a = measuredPair(5, 5, { ct1: 0, ct2: 50, mm: 0 });
  approx(a.i1m, 5, 1e-9, 'i1m'); approx(a.i2m, 2.5, 1e-9, 'i2m');
});
check('measuredPair ct1=20 & ct2=50 → 4 & 2.5', () => {
  const a = measuredPair(5, 5, { ct1: 20, ct2: 50, mm: 0 });
  approx(a.i1m, 4, 1e-9, 'i1m'); approx(a.i2m, 2.5, 1e-9, 'i2m');
});
check('measuredPair mm=+20 → I2 ×1.2 = 5.7', () => {
  const a = measuredPair(5, 4.75, { ct1: 0, ct2: 0, mm: 20 });
  approx(a.i2m, 5.7, 1e-9, 'i2m mm+20');
});
check('measuredPair mm=−30 → I2 ×0.7 = 3.325', () => {
  const a = measuredPair(5, 4.75, { ct1: 0, ct2: 0, mm: -30 });
  approx(a.i2m, 3.325, 1e-9, 'i2m mm-30');
});
check('measuredPair kombinasikan ct2+mm: 4.75·0.8·1.25 = 4.75', () => {
  const a = measuredPair(5, 4.75, { ct1: 0, ct2: 20, mm: 25 });
  approx(a.i2m, 4.75, 1e-9, 'i2m gabungan');
});
check('measuredPair clamp ct ≥ 95% & arus tak negatif', () => {
  const a = measuredPair(5, 5, { ct1: 95, ct2: 200, mm: 0 });
  approx(a.i1m, 0.25, 1e-9, 'i1m 5% sisa'); approx(a.i2m, 0.25, 1e-9, 'i2m clamp 95');
});

/* evaluatePoint — keputusan pada titik TERUKUR, koordinat sejati tetap dilaporkan */
const E5 = { pickup: 0.30, method: 'average', slopes: M.slopes, err: { ct1: 0, ct2: 50, mm: 0 } };
check('evaluatePoint eksternal 5/5 + ct2=50 → TRIP PALSU (sejati RESTRAIN)', () => {
  const d = evaluatePoint(E5, { i1: 5, i2: 5 });
  approx(d.irt, 3.75, 1e-9, 'irt terukur'); approx(d.iop, 2.5, 1e-9, 'iop terukur');
  approx(d.irtTrue, 5, 1e-9, 'irt sejati'); approx(d.iopTrue, 0, 1e-9, 'iop sejati');
  approx(d.thr, 1.6375, 1e-9, 'thr @3.75 = 0.5+0.65·1.75');
  if (d.status !== 'TRIP') throw new Error('relay melihat TRIP (2.5 > 1.6375)');
  if (d.trueStatus !== 'RESTRAIN') throw new Error('kondisi sejati harus RESTRAIN');
  if (!d.hasErr) throw new Error('harus ditandai bergeser');
  approx(d.margin, 52.6718, 1e-3, 'margin (2.5−1.6375)/1.6375');
});
check('evaluatePoint saturasi SIMETRIS ct1=ct2=50 → RESTRAIN (Iop tetap 0, Irt ikut mengecil)', () => {
  const d = evaluatePoint({ ...E5, err: { ct1: 50, ct2: 50, mm: 0 } }, { i1: 5, i2: 5 });
  approx(d.irt, 2.5, 1e-9, 'irt terukur (restraint dari arus terukur)'); approx(d.iop, 0, 1e-9, 'iop');
  approx(d.irtTrue, 5, 1e-9, 'irt sejati');
  if (d.status !== 'RESTRAIN') throw new Error('dua sisi jenuh sama → tak ada diff PALSU');
  if (d.trueStatus !== 'RESTRAIN') throw new Error('sejati juga RESTRAIN');
  if (!d.hasErr) throw new Error('titik bergeser horizontal (Irt 5 → 2.5)');
});
check('evaluatePoint internal 5/0 + ct1=50 → TRIP melemah tapi tetap TRIP', () => {
  const d = evaluatePoint({ ...E5, err: { ct1: 50, ct2: 0, mm: 0 } }, { i1: 5, i2: 0 });
  approx(d.irt, 1.25, 1e-9, 'irt'); approx(d.iop, 2.5, 1e-9, 'iop terukur');
  approx(d.thr, 0.3125, 1e-9, 'thr @1.25 = 0.25·1.25');
  if (d.status !== 'TRIP') throw new Error('masih TRIP');
  if (d.trueStatus !== 'TRIP') throw new Error('sejati juga TRIP');
  approx(d.margin, 700, 1e-3, 'margin (2.5−0.3125)/0.3125');
});
check('evaluatePoint under-reach: internal 2/0 + ct1=90 → relay RESTRAIN, sejati TRIP', () => {
  const d = evaluatePoint({ ...E5, err: { ct1: 90, ct2: 0, mm: 0 } }, { i1: 2, i2: 0 });
  approx(d.irt, 0.1, 1e-9, 'irt'); approx(d.iop, 0.2, 1e-9, 'iop');
  approx(d.thr, 0.3, 1e-9, 'thr = pickup (0.25·0.1 < 0.3)');
  if (d.status !== 'RESTRAIN') throw new Error('di bawah pickup → RESTRAIN');
  if (d.trueStatus !== 'TRIP') throw new Error('kondisi sejati TRIP (Iop 2)');
  approx(d.margin, -33.3333, 1e-3, 'margin (0.2−0.3)/0.3');
});
check('evaluatePoint manual tak terpengaruh error (hasErr false)', () => {
  const d = evaluatePoint(E5, { irt: 1, iop: 2 });
  if (d.hasErr) throw new Error('titik manual = bidang terukur, tanpa pergeseran');
  approx(d.irtTrue, 1, 1e-9, 'irtTrue = irt'); approx(d.iopTrue, 2, 1e-9, 'iopTrue = iop');
  if (d.status !== 'TRIP') throw new Error('harus TRIP');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
