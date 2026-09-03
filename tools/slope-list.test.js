/* Tes MODUL slopeList — satu-satunya pemilik invariant kurva multi-slope.
   Jalankan: node tools/slope-list.test.js
   Pola: properti (setelah urutan perintah acak-terkendali, daftar SELALU legal)
   + literal kasus tepi (no-op, clamp, warisan breakpoint saat hapus). */
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
const { slopeList } = ctx.pub;
const MAX_BP = 20, MAX_SLOPES = 4;

/* ---------- properti ---------- */
function assertLegal(m, ctxLabel) {
  const a = m.items;
  const n = a.length;
  if (n < 1 || n > MAX_SLOPES) throw new Error(`${ctxLabel}: jumlah ${n} di luar 1..${MAX_SLOPES}`);
  const ids = a.map(s => s.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${ctxLabel}: id tidak unik`);
  a.forEach((s, i) => {
    if (!(s.percent >= 1 && s.percent <= 200)) throw new Error(`${ctxLabel}: percent slope ${i + 1} = ${s.percent}`);
    if (i === n - 1) {
      if (s.breakpoint !== null) throw new Error(`${ctxLabel}: slope terakhir harus open`);
    } else {
      if (s.breakpoint === null) throw new Error(`${ctxLabel}: slope ${i + 1} (bukan terakhir) harus tertutup`);
      const lo = i === 0 ? 0.6 : a[i - 1].breakpoint + 0.1;
      const hi = i < n - 2 ? a[i + 1].breakpoint - 0.1 : MAX_BP;
      if (s.breakpoint < lo - 1e-9 || s.breakpoint > hi + 1e-9)
        throw new Error(`${ctxLabel}: bp slope ${i + 1} = ${s.breakpoint} di luar [${lo}, ${hi}]`);
      if (Math.abs(s.breakpoint * 10 - Math.round(s.breakpoint * 10)) > 1e-9)
        throw new Error(`${ctxLabel}: bp slope ${i + 1} bukan kelipatan 0.1`);
    }
  });
  /* bounds() konsisten dgn tetangga */
  a.forEach((s, i) => {
    const b = m.bounds(s.id);
    if (i === n - 1) { if (b !== null) throw new Error(`${ctxLabel}: bounds slope terakhir harus null`); return; }
    if (!b) throw new Error(`${ctxLabel}: bounds slope ${i + 1} hilang`);
    if (s.breakpoint < b.min - 1e-9 || s.breakpoint > b.max + 1e-9)
      throw new Error(`${ctxLabel}: bp di luar bounds sendiri`);
  });
  /* warnings = tepat pasangan yg merata (slope berikut lebih landai) */
  const manual = [];
  for (let i = 0; i < n - 1; i++) if (a[i + 1].percent < a[i].percent) manual.push(i);
  const got = m.warnings();
  if (got.length !== manual.length) throw new Error(`${ctxLabel}: warnings ${got.length}, harap ${manual.length}`);
}

/* RNG deterministik (mulberry32) */
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('slope-list.test.js — modul daftar slope (properti + literal)');

/* properti: urutan perintah acak tak pernah menghasilkan daftar ilegal */
check('properti: 400 perintah acak → daftar selalu legal', () => {
  const rand = rng(20260903);
  const arr = [];
  const m = slopeList(arr);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  for (let k = 0; k < 400; k++) {
    const op = Math.floor(rand() * 5);
    const n = m.items.length;
    const pick = () => m.items[Math.floor(rand() * n)].id;
    if (op === 0) m.setPercent(pick(), rand() * 300 - 30);          // ekstrem & normal
    else if (op === 1) m.setBreakpoint(pick(), rand() * 30);
    else if (op === 2) m.add(Math.floor(rand() * 260));
    else if (op === 3) m.remove(pick());
    else m.load([{ percent: 10 + rand() * 100, breakpoint: null }]);
    assertLegal(m, `iterasi ${k}`);
  }
});

/* ---------- literal ---------- */
check('load default: slope1 25%@2.0 tertutup + slope2 65% open', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  const a = m.items;
  if (a.length !== 2) throw new Error('panjang 2');
  approx(a[0].percent, 25, 1e-9, 's1 %'); approx(a[0].breakpoint, 2.0, 1e-9, 's1 bp');
  approx(a[1].percent, 65, 1e-9, 's2 %'); if (a[1].breakpoint !== null) throw new Error('s2 harus open');
  if (a[0].id === a[1].id) throw new Error('id harus unik');
});
check('add dari dual → slope2 tertutup @3.0, slope3 open 50%', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  m.add(50);
  const a = m.items;
  if (a.length !== 3) throw new Error('panjang 3');
  approx(a[1].breakpoint, 3.0, 1e-9, 'split 1.5×2');      // 2.0×1.5 = 3.0
  if (a[2].breakpoint !== null) throw new Error('s3 open'); approx(a[2].percent, 50, 1e-9, 's3 %');
});
check('add dari SINGLE open (tanpa bp) → split fallback 2.0', () => {
  const m = slopeList([]);
  m.load([{ percent: 65, breakpoint: null }]);
  m.add(40);
  approx(m.items[0].breakpoint, 2.0, 1e-9, 'fallback split');
  if (m.items[1].breakpoint !== null) throw new Error('s2 open');
});
check('add pada kapasitas (4) → no-op', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 1.5 }, { percent: 40, breakpoint: 4 }, { percent: 60, breakpoint: 9 }, { percent: 80, breakpoint: null }]);
  m.add();
  if (m.items.length !== 4) throw new Error('harus tetap 4');
});
check('add tanpa ruang (bp terakhir sudah 20) → no-op, rantai tetap legal', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 20 }, { percent: 65, breakpoint: null }]);
  m.add();
  if (m.items.length !== 2) throw new Error('tak boleh menambah (perlu bp > 20)');
  if (m.items[0].breakpoint !== 20) throw new Error('s1 bp tetap 20');
  if (m.items[1].breakpoint !== null) throw new Error('s2 tetap open');
  assertLegal(m, 'after add-no-room');
});
check('add dgn ruang tersisa 0.1 (prev 19.9) → split 20', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 19.9 }, { percent: 65, breakpoint: null }]);
  m.add();
  if (m.items.length !== 3) throw new Error('harus bertambah');
  approx(m.items[1].breakpoint, 20, 1e-9, 'split maks 20');
  assertLegal(m, 'after add-room-01');
});
check('remove slope 1 → no-op (dilindungi)', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  m.remove(m.items[0].id);
  if (m.items.length !== 2) throw new Error('slope 1 tak boleh hilang');
});
check('remove slope terakhir → pred menjadi open', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: 3.0 }, { percent: 50, breakpoint: null }]);
  m.remove(m.items[2].id);
  const a = m.items;
  if (a.length !== 2) throw new Error('panjang 2');
  if (a[1].breakpoint !== null) throw new Error('s2 (kini terakhir) harus open');
  approx(a[0].breakpoint, 2.0, 1e-9, 's1 bp tak berubah');
});
check('remove segmen tengah → pred mewarisi bp (rantai tetap legal)', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: 3.0 }, { percent: 50, breakpoint: null }]);
  m.remove(m.items[1].id);                                 // hapus 65%@3.0
  const a = m.items;
  if (a.length !== 2) throw new Error('panjang 2');
  approx(a[0].breakpoint, 3.0, 1e-9, 's1 mewarisi bp 3.0');
  if (a[1].breakpoint !== null) throw new Error('s2 open'); approx(a[1].percent, 50, 1e-9, 's2 %');
  assertLegal(m, 'after remove middle');
});
check('setBreakpoint pada slope open (terakhir) → no-op', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  m.setBreakpoint(m.items[1].id, 7.5);
  if (m.items[1].breakpoint !== null) throw new Error('open slope tak boleh dapat bp');
});
check('setBreakpoint clamp: di bawah 0.6 → 0.6; di atas MAX_BP → 20', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  m.setBreakpoint(m.items[0].id, 0.1);
  approx(m.items[0].breakpoint, 0.6, 1e-9, 'floor pertama');
  m.setBreakpoint(m.items[0].id, 99);
  approx(m.items[0].breakpoint, MAX_BP, 1e-9, 'cap 20');
});
check('setBreakpoint clamp: tidak boleh menyalip breakpoint berikutnya', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: 4.0 }, { percent: 50, breakpoint: null }]);
  m.setBreakpoint(m.items[0].id, 99);                       // next = 4.0 → max 3.9
  approx(m.items[0].breakpoint, 3.9, 1e-9, 'max = next − 0.1');
});
check('setPercent clamp: 0 → 1; 250 → 200', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  m.setPercent(m.items[0].id, 0);
  approx(m.items[0].percent, 1, 1e-9, 'min 1');
  m.setPercent(m.items[0].id, 250);
  approx(m.items[0].percent, 200, 1e-9, 'max 200');
});
check('warnings: slope berikut lebih landai → teks "tidak umum" + indeks', () => {
  const m = slopeList([]);
  m.load([{ percent: 80, breakpoint: 2.0 }, { percent: 20, breakpoint: null }]);
  const w = m.warnings();
  if (w.length !== 1) throw new Error('1 warning');
  if (!w[0].includes('tidak umum') || !w[0].includes('Slope 2 (20%) lebih kecil dari Slope 1 (80%)'))
    throw new Error('teks literal: ' + w[0]);
});
check('warnings: landai beruntun → tiap pasangan berdekatan dilaporkan', () => {
  const m = slopeList([]);
  m.load([{ percent: 90, breakpoint: 2 }, { percent: 60, breakpoint: 5 }, { percent: 30, breakpoint: null }]);
  if (m.warnings().length !== 2) throw new Error('2 pasangan (90>60, 60>30)');
});
check('warnings: kurva legal (default dual) → kosong', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 2.0 }, { percent: 65, breakpoint: null }]);
  if (m.warnings().length !== 0) throw new Error('default harus tanpa warning');
});
check('load menormalkan spesifikasi tak-teratur (bp menurun) menjadi legal', () => {
  const m = slopeList([]);
  m.load([{ percent: 25, breakpoint: 9 }, { percent: 65, breakpoint: 2 }, { percent: 50, breakpoint: null }]);
  assertLegal(m, 'after load messy');
  /* urutan posisi dipertahankan; bp s1 di-clamp naik ke s0+0.1 (bukan ditukar) */
  if (!(m.items[1].breakpoint > m.items[0].breakpoint)) throw new Error('bp harus monoton naik setelah normalisasi');
  approx(m.items[0].breakpoint, 9.0, 1e-9, 's0 bp tetap 9.0');
  approx(m.items[1].breakpoint, 9.1, 1e-9, 's1 bp naik ke 9.1 (prev+0.1)');
});

console.log(`\n${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);
