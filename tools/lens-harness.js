/* Harness mock-DOM utk menjalankan <script> differential_relay_simulator.html di Node.
   Pola tools/lens-harness.js proyek Distance Relay: stub document/window dgn elemen
   yang menangkap innerHTML, jalankan isi <script> via new Function, lalu ekspor
   __pub{render,S,P,thresholdAt,statusOf,marginOf,iopOf,irtOf,computeDomain,curveSample}.
   Seam yang diuji: string SVG #plane + nilai model murni. */
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
    addEventListener() {},
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
      if (cls === 'card-h') return ['curve', 'calc'].map(c => makeEl('h-' + c));
      if (sel === '.card[data-card]') return ['curve', 'calc'].map(c => {
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
  global.document = documentStub;
  global.window = global;
  global.addEventListener = () => {};
  global.matchMedia = () => ({ matches: false });
  global.ResizeObserver = class { observe() {} };
  global.katex = { render() {} };

  new Function(code + ';global.__pub={render,S,P,thresholdAt,statusOf,marginOf,iopOf,irtOf,evaluatePoint,computeDomain,curveSample,slopeLine,slopeList,SL,syncCollapsedCentering,addPoint,selectPoint,clearPoints,renderPlane,setMethod,stopAnim,removePoint};')();

  const pub = global.__pub;
  if (!pub || !pub.render) throw new Error('simulator did not export __pub');
  return { pub, els: elements };
}

function planeSvg(ctx) { return ctx.els.plane.innerHTML; }

module.exports = { loadSimulator, planeSvg };
