# Overview Proyek — Simulator Differential Relay (ANSI 87)

> **Cara pakai dokumen ini:** AI (atau manusia) yang ingin *debug*, *review*, atau menambah
> fitur cukup baca file ini dulu untuk mendapat peta mental utuh, lalu telusuri bagian
> `differential_relay_simulator.html` yang relevan. Detail model & konvensi: `CLAUDE.md`
> dan `docs/PRD.md` (§5 = sumber kebenaran perhitungan).

## TL;DR

Satu aplikasi browser mandiri dalam **satu file HTML**: `differential_relay_simulator.html`
(markup + CSS + satu blok `<script>`). Tidak ada build system, framework, package manager,
atau backend. Ini simulator **edukasi bahasa Indonesia** untuk *percentage-restrained
differential relay* (ANSI/IEEE 87): memetakan **kurva ambang multi-slope** di bidang
**Iop (arus operasi) vs Irt (arus restraint/bias)**, menilai titik uji TRIP/RESTRAIN, dan
menghitung titik dari arus dua sisi (I1, I2).

**Asal proyek (penting untuk konteks):**
- **Gaya desain, font, struktur single-file, splash, animasi judul, kartu collapse,
  harness/tests** — port 1:1 dari proyek **Simulator Distance Relay** (`New folder/`,
  repo `endetta/distance-relay-simulator`). Jangan regresi seam desain itu (diuji
  `tools/ui.test.js`).
- **Model perhitungan & daftar fitur** — port dari PRD **relay diferensial** lama
  (`diff relay/PRD.md`, salinannya ada di `docs/PRD.md` = sumber kebenaran).
- **Extras v1** (di luar PRD lama): preset cepat (Dual-slope/Multi adaptif), tombol
  skenario arus (Normal/Eksternal/Internal/Saturasi CT), dan tombol animasi sapuan
  *eksternal → internal* (titik berjalan menyeberangi kurva).

## Menjalankan

Buka `differential_relay_simulator.html` langsung di browser (`file:///...`), atau:

```bash
python -m http.server     # lalu browse
```

Satu-satunya dependensi eksternal dari CDN: KaTeX (rumus) + Google Fonts — inti tetap
jalan tanpanya (rumus jatuh ke teks biasa, font ke fallback sistem).

## Peta file

| File | Isi |
|---|---|
| `differential_relay_simulator.html` | Seluruh aplikasi (markup + CSS + `<script>` ≈ 1200 baris). |
| `docs/PRD.md` | PRD lengkap fitur/desain/model **yang lama** — §5 dasar teori & §7 design system **tidak** dipakai (desain mengikuti Distance Relay); §5 model tetap sumber kebenaran hitung. |
| `docs/overview.md` | Dokumen ini. |
| `CLAUDE.md` | Panduan arsitektur/konvensi untuk agen coding. |
| `README.md` | Deskripsi publik + cara menjalankan + validasi. |
| `tools/lens-harness.js` | Harness Node: stub `document`/`window`, jalankan `<script>`, tambahkan `;global.__pub=API;` (daftar ekspor hidup di `const API` akhir script aplikasi — bukan di harness) + elemen tertangkap (`els.<id>.innerHTML`). |
| `tools/model.test.js` | Tes literals model murni (PRD §5). `node tools/model.test.js`. |
| `tools/slope-list.test.js` | Tes properti & literal modul `slopeList` (invariant daftar slope). `node tools/slope-list.test.js`. |
| `tools/ui.test.js` | Tes seam desain (port Distance Relay) + perilaku UI. `node tools/ui.test.js`. |

## Arsitektur isi file HTML (urut dalam `<script>`)

1. **Helper** (`fmt`, `clamp`, `fmtSign`, `niceCeil`/`niceStep` 1-2-5) — dipakai renderer grid.
2. **State global** — satu objek `S`: `S.param` (`P`) = `{pickup, method, slopes[], i1, i2,
   points[], selectedId, probe, probeTrace}`; `S.ui.collapsed` = status collapse kartu.
   Semua kontrol menulis ke `S`/`P`; tidak ada state lain.
3. **Model murni** (dipakai renderer + tes):
   - `iopOf(i1,i2)=|i1−i2|`; `irtOf(i1,i2,method)` = Average `(|i1|+|i2|)/2` atau
     Maximum `max(|i1|,|i2|)`.
   - `slopeLine(pickup,slopes,irt)` = garis slope **kumulatif** (segmen menyambung);
     `thresholdAt(m,irt) = max(pickup, slopeLine)`.
   - `statusOf` = TRIP iff `iop > threshold+1e-12` (tepat di kurva = RESTRAIN);
     `marginOf` = `(iop−threshold)/threshold × 100`.
   - `computeDomain(m)` → `{xMax,yMax}` dari breakpoint terjauh ×1.6 (niceCeil, minimal 5)
     dan puncak kurva ×1.2 (minimal 1). Skala bidang **dari kurva**, bukan dari titik.
   - `curveSample(m,xMax)` — titik sampel ambang per segmen (breakpoint dijaga sebagai
     titik sampel agar kurva tidak membulat di sambungan).
   - `evaluatePoint(m,pt)` — evaluasi DERIVED satu titik thd kurva kini: titik manual
     memakai `{irt,iop}` simpanannya, titik `'calc'`/probe menurunkan koordinat dari
     `{i1,i2}` + metode restraint; hasil `{irt,iop,thr,status,margin}` dipakai
     renderPlane/renderTable/renderSide/tooltip (diuji model.test.js).
   - **Modul `slopeList`** — satu-satunya pemilik invariant daftar slope (percent 1–200;
     breakpoint monoton naik, gap 0.1, pertama ≥0.6, ≤20; slope terakhir open; 1..4;
     Slope 1 tak bisa dihapus; id di-assign internal). Setiap perintah
     (`setPercent/setBreakpoint/add/remove/load`) **menormalkan** → state ilegal tidak
     mungkin ada; `bounds(id)` memberi batas UI; `warnings()` hanya kombinasi "tidak
     umum tapi legal" (slope berikut lebih landai). Diuji properti di
     `tools/slope-list.test.js`.
4. **Binding kontrol**: `bindPair` (slider+number sinkron, dipakai pickup), grup metode
   restraint, slope dinamis (delegasi `input`/`click` di `#slopesContainer`), preset,
   kalkulator I1/I2 + tombol titik, skenario, tombol animasi, collapse, modal "Tentang".
   Semua perubahan → `render()`.
5. **Renderer**: `renderPlane` (SVG #plane adaptif, viewBox = ukuran elemen; grid 1-2-5,
   tick label ber-halo putih, poligon DAERAH TRIP/RESTRAIN, kurva, garis pickup
   putus-putus, marker BP, titik uji, titik+jejak animasi), `renderTable`, `renderSide`
   (status + readout 2 grup + formula KaTeX + edukasi kontekstual), `renderWarnings`.
6. **Interaksi plot**: klik area → tambah titik manual; seret lingkaran → pindah;
   `pointerToPu` memakai `plane._map` + skala `clientWidth/viewBox`.
7. **`render()`** master — satu-satunya entry point: hitung ulang status semua titik thd
   kurva saat ini → render plane/table/side/warnings/preview kalkulator.
8. **Splash IIFE** + **`fitPlane()`** (ResizeObserver) — sama dengan Distance Relay.

## Konvensi & gotcha

- **Slope terakhir tidak punya breakpoint** (`breakpoint:null` → berlaku sampai ∞).
  Marker BP hanya untuk segmen non-terakhir (`BP1`, `BP2`, …).
- **`renderSlopes()` hanya dipanggil saat struktur slope berubah** (init, tambah/hapus
  slope, preset). Perubahan nilai (slider/angka) tidak membangun ulang DOM — kalau tidak,
  drag slider putus di tengah jalan. Nilai yang berubah lewat perintah `slopeList`.
- **Jangan clamp/normalisasi slope di luar `slopeList`** — modul itu satu-satunya pemilik
  invariant; `renderSlopes` membaca batas via `SL.bounds(id)` (tidak menghitung ulang,
  tidak memutasi `breakpoint` saat render).
- **Ekspor utk tes = `const API` di akhir script** — harness hanya menambahkan
  `;global.__pub=API;`; jangan duplikasi daftar fungsi di `tools/lens-harness.js`.
- **Status titik DERIVED via `evaluatePoint(m,pt)`** — titik menyimpan input saja
  (manual: `{irt,iop}` klik/seret; `'calc'`: `{i1,i2}` yang koordinatnya mengikuti
  metode restraint). `thr/status/margin` dihitung tiap render, tidak pernah disimpan →
  status titik tak mungkin basi terhadap perubahan kurva.
- **Dekorasi SVG tidak menangkap pointer**: `#plane line/polygon/polyline/text`
  `pointer-events:none` — kalau dihapus, klik "tambah titik" tidak akan kena kecuali
  tepat di kotak latar `[data-plot-bg]`.
- Elemen yang bisa diklik plot: lingkaran titik (`[data-point]`) dan latar
  (`[data-plot-bg]`).
- Warna/teks semua lewat variabel `:root` / class; label SVG memakai halo
  `paint-order:stroke;stroke:var(--surface)`.
- Teks UI bahasa Indonesia. Nama kunci: TRIP (merah) vs RESTRAIN (hijau) — warna
  semantik, jangan dipakai dekoratif.
- **Animasi sapuan**: `P.probe` = titik live; `P.probeTrace` = jejak (Iop naik);
  saat tombol ditekan lagi / selesai → `stopAnim()`; probe tidak masuk tabel.

## Validasi (tanpa build)

```bash
node tools/model.test.js       # 25 asersi literals model (PRD §5)
node tools/slope-list.test.js  # 18 asersi invariant + literal modul slopeList
node tools/ui.test.js          # 22 asersi seam desain + perilaku UI
```

Harness mengabaikan CSS & tidak punya hirarki DOM anak — teks status dibaca dari
`els.verdictLabel`/`els.marginLabel`; stub tidak membaca atribut `value` markup (set
`els.<id>.value` manual di tes). Semua file tes meng-hard-code nama file HTML — update
jika file di-rename.

## Gaya bahasa & tone

Aplikasi & dokumentasi teknis memakai Bahasa Indonesia untuk label UI. Kode & komentar
campuran Indonesia/Inggris sesuai konteks; usahakan konsisten dengan sekitarnya
(mengikuti gaya `New folder`/Distance Relay).
