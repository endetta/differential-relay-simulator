/* Harness mock-DOM utk menjalankan <script> differential_relay_simulator.html di Node.
   Pola tools/lens-harness.js proyek Distance Relay: stub document/window dgn elemen
   yang menangkap innerHTML, jalankan isi <script> via new Function. Daftar fungsi yang
   diekspor TIDAK dikelola di sini — aplikasi sendiri mempublikasikan `const API` di
   akhir script-nya; harness cukup menambahkan `;global.__pub=API;` (satu sumber kebenaran).
   Seam yang diuji: string SVG #plane + nilai model murni. Elemen & window/document
   menangkap listener (addEventListener) — loadSimulator mengembalikan fireEl/fireWindow/
   fireDoc utk memicu event sintetis (tes perilaku interaksi, mis. drag titik). */
'use strict';
const fs = require('fs');
const path = require('path');

function makeEl(id) {
  const listeners = {};
  const el = {
    id,
    innerHTML: '',
    textContent: '',
    title: '',
    value: '',
    checked: true,
    style: {},
    dataset: {},
    attrs: {},
    classList: (() => { const s = new Set(); return {
      add(c){ s.add(c); },
      remove(c){ s.delete(c); },
      toggle(c, force){ const on = force === undefined ? !s.has(c) : !!force; on ? s.add(c) : s.delete(c); return on; },
      contains(c){ return s.has(c); },
    }; })(),
    addEventListener(type, fn){ (listeners[type] = listeners[type] || []).push(fn); },
    _fire(type, evt){ (listeners[type] || []).forEach(fn => fn(evt)); },
    setAttribute(k, v){ this.attrs[k] = String(v); },
    getAttribute(k){ return this.attrs[k] === undefined ? null : this.attrs[k]; },
    querySelectorAll: () => [],
    querySelector: () => makeEl('q'),
    appendChild() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 440 }),
    closest() { return null; },
    hasAttribute(k){ return Object.prototype.hasOwnProperty.call(this.attrs, k) || Object.prototype.hasOwnProperty.call(this, k); },
  };
  return el;
}

function loadSimulator(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('script block not found');
  const code = m[1];

  const elements = {};
  const getEl = id => (elements[id] = elements[id] || makeEl(id));
  const qsa = sel => {
    if (sel.startsWith('#')) return [getEl(sel.slice(1))];
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (cls === 'card-h') return ['curve', 'err', 'calc'].map(c => makeEl('h-' + c));
      if (sel === '.card[data-card]') return ['curve', 'err', 'calc'].map(c => {
        const el = makeEl('card-' + c);
        el.dataset.card = c;
        return el;
      });
      if (sel === '.plane-card') return [makeEl('plane-card')];
      if (sel === 'input[name="method"]') return [];
      return [];
    }
    return [];
  };
  const documentStub = {
    getElementById: getEl,
    querySelectorAll: qsa,
    querySelector: sel => {
      if (sel === '.main') return makeEl('main');
      if (sel === '.plane-card') return makeEl('plane-card');
      return makeEl('q');
    },
    createElement: tag => makeEl('dyn-' + tag),
  };
  const docLs = {}, winLs = {};
  documentStub.addEventListener = (t, f) => { (docLs[t] = docLs[t] || []).push(f); };
  global.document = documentStub;
  global.window = global;
  global.addEventListener = (t, f) => { (winLs[t] = winLs[t] || []).push(f); };
  global.removeEventListener = () => {};
  global.matchMedia = () => ({ matches: false });
  global.ResizeObserver = class { observe() {} };

  new Function(code + ';global.__pub=API;')();

  const pub = global.__pub;
  if (!pub || !pub.render) throw new Error('simulator did not export __pub');
  return {
    pub,
    els: elements,
    fireWindow: (t, e) => (winLs[t] || []).forEach(f => f(e)),
    fireDoc: (t, e) => (docLs[t] || []).forEach(f => f(e)),
    fireEl: (id, t, e) => { const el = elements[id]; if (el && el._fire) el._fire(t, e); },
  };
}

function planeSvg(ctx) { return ctx.els.plane.innerHTML; }

module.exports = { loadSimulator, planeSvg };
