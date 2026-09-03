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
const { iopOf, irtOf, slopeLine, thresholdAt, statusOf, marginOf, computeDomain, render } = ctx.pub;

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

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
