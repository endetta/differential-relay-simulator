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
  skenario arus (Normal/Eksternal/Internal/Saturasi CT/Inrush), tombol animasi sapuan
  *eksternal → internal* (titik berjalan menyeberangi kurva), **kartu faktor kesalahan
  pengukuran** (CT per sisi + mismatch rasio → titik sejati vs titik terukur), dan
  **tooltip hover** elemen plot.
- **Revisi desain:** kartu kanan = **nilai langsung** (nilai utama sbg **hero**
  `div.hero-row` — **Iop dulu** dgn tile ber-status: tint lembut + aksen kiri + chip
  TRIP/AMBANG/RESTRAIN; **Irt netral** sbg pembanding — formula, tanpa kalimat
  ringkasan & tanpa kotak edukasi;
  PALSU/TERLEWAT jadi sisipan kecil di baris margin); tooltip hanya untuk elemen yang
  digambar (margin ±10 px), animatif (`@keyframes tipIn`/`qIn`, aksen warna status,
  baris `margin %`/`pita low…top`); **panduan via ikon "?"** (`span.q[data-tip]` →
  tooltip `#qTip`) — teks petunjuk permanen di panel dihapus, ikon melekat pada
  heading/label terkait (`.qrow` yatim dihapus); **pita toleransi ambang SIMETRIS**
  (slider `tol`, keputusan 3 status TRIP/AMBANG/RESTRAIN, pita copper `data-band`
  kedua sisi kurva `kurva×(1±tol/100)` + garis batas `data-band-low`/`data-band-top`);
  **SEMUA titik bisa diedit ulang** (klik → I1/I2 termuat → `commitCalcAdd`);
  **skenario → titik terpilih** (Saturasi CT dsb. dipasang ke titik itu, bergeser
  real-time); **nilai terukur tampil langsung** (label `Iop …` di plot + kolom
  `Sejati` tabel); **mode pengamatan arus sistem** (sweep through-current + saturasi
  dinamis, kartu ke-4); **default error CT non-nol** (5%/5%/+10% = CT 5P + tap, bukan
  0).

## Menjalankan

Buka `differential_relay_simulator.html` langsung di browser (`file:///...`), atau:

```bash
python -m http.server     # lalu browse
```

Satu-satunya dependensi eksternal dari CDN: Google Fonts — inti tetap jalan tanpanya
(font jatuh ke fallback sistem).

## Peta file

| File | Isi |
|---|---|
| `differential_relay_simulator.html` | Seluruh aplikasi (markup + CSS + `<script>` ≈ 1300 baris). |
| `docs/PRD.md` | PRD lengkap fitur/desain/model **yang lama** — §5 dasar teori & §7 design system **tidak** dipakai (desain mengikuti Distance Relay); §5 model tetap sumber kebenaran hitung. |
| `docs/overview.md` | Dokumen ini. |
| `CLAUDE.md` | Panduan arsitektur/konvensi untuk agen coding. |
| `README.md` | Deskripsi publik + cara menjalankan + validasi. |
| `tools/lens-harness.js` | Harness Node: stub `document`/`window`, jalankan `<script>`, tambahkan `;global.__pub=API;` (daftar ekspor hidup di `const API` akhir script aplikasi — bukan di harness) + elemen tertangkap (`els.<id>.innerHTML`). |
| `tools/model.test.js` | Tes literals model murni (PRD §5 + error CT + measuredToTrue + toleransi 3-status + obs, 60 asersi). `node tools/model.test.js`. |
| `tools/slope-list.test.js` | Tes properti & literal modul `slopeList` (invariant daftar slope). `node tools/slope-list.test.js`. |
| `tools/ui.test.js` | Tes seam desain (port Distance Relay) + perilaku UI (94 asersi). `node tools/ui.test.js`. |
| `tools/shoot.js` | Screenshot & laporan tata letak via headless Chrome (CDP, tanpa dependensi): PNG per view + `report.json`/`report.txt` (geometri, tooltip, ikon `?`, overflow, exception) + lembar kontak `index.html` → `tools/shots/` (gitignored). `node tools/shoot.js`; `--check` = verifikasi gerak collapse anti-blink di Chrome sungguhan. |

## Arsitektur isi file HTML (urut dalam `<script>`)

1. **Helper** (`fmt`, `clamp`, `fmtSign`, `niceCeil`/`niceStep` 1-2-5) — dipakai renderer grid.
2. **State global** — satu objek `S`: `S.param` (`P`) = `{pickup, method, tol, slopes[],
   i1, i2, err:{ct1,ct2,mm} (default 5/5/+10 = DEFAULT_ERR), obs:{on,I,dyn,...}, points[],
   selectedId, editId, probe, probeTrace}`; `S.ui.collapsed` = status collapse kartu
   (curve/err/calc/obs). Semua kontrol menulis ke `S`/`P`; tidak ada state lain.
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
   - `measuredPair(i1,i2,err)` — arus yang DILIHAT relay setelah faktor kesalahan:
     `I1m=I1·(1−ct1/100)`, `I2m=I2·(1−ct2/100)·(1+mm/100)` (ct = saturasi/rasio sisi,
     0..95%; mm = mismatch rasio ±30% pd I₂). **`measuredToTrue(irt,iop,method,err)`
     = invers eksak** → SEMUA titik (manual maupun kalkulator/skenario/probe) membawa
     arus SEJATI `i1/i2`: klik/seret = pasang posisi TERUKUR, lalu I₁/I₂ dibalikkan
     → error CT ikut menggeser titik manual real-time. **Default err NON-NOL**
     (`DEFAULT_ERR` 5%/5%/+10% = CT 5P + offset rasio/tap).
   - Mode pengamatan & saturasi dinamis (murni): `satFactor(i,knee,gain)` (faktor ct
     efektif: 1 di bawah knee, linier → gain di 3·knee), `obsEff(m,I)` (pasangan
     terukur + `ct1Eff/ct2Eff` utk arus sistem I; dyn ON = ct×faktor),
     `obsPath(m,I)` (jejak measured 0.2→I). Titik pengamatan `{i1:I,i2:I,obsI:I}` →
     `evaluatePoint` menghitung terukur via `obsEff(m,obsI)` — tak basi thd perubahan
     err/metode.
   - `evaluatePoint(m,pt)` — evaluasi DERIVED satu titik thd kurva kini: SEMUA titik
     menurunkan koordinat dari pasangan TERUKUR `measuredPair` (atau `obsEff` utk
     pengamatan) + metode restraint; objek mentah `{irt,iop}` tanpa `i1/i2` tetap
     dianggap sudah terukur. Hasil `{irt,iop,irtTrue,iopTrue,hasErr,i1m,i2m,thr,
     status,margin,trueStatus}` — keputusan selalu di titik TERUKUR; koordinat/status
     SEJATI dilaporkan untuk ghost & baris/kolom "Sejati". Objek `m` sintetis tanpa
     `err` → dianggap 0 (literal model bebas error). Dipakai
     renderPlane/renderTable/renderSide/tooltip (diuji model.test.js).
   - `hoverInfo(map,irt,iop)` — tooltip murni: hanya ELEMEN yang digambar (titik
     uji/probe, marker BP, garis pickup, kurva ambang), masing-masing dgn margin ±10 px
     data; → `{kind,head,rows}` atau `null`. Titik memuat baris `margin %` (atau
     `dlm pita toleransi ±N%` saat AMBANG); kurva memuat rentang `pita low…top pu`
     saat tol>0 (diuji ui.test.js).
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
   (status box + readout **nilai-langsung** 2 grup `Titik uji`/`Keputusan`; **tanpa**
   `.r-sum`, tanpa `#eduNote` & tanpa footer rumus — blok `#formulaOut`/KaTeX DIHAPUS,
   nilainya dobel dgn hero), `renderWarnings`. Tooltip elemen
   dirender ke `#planeTip` (di dalam `.plane-card`, ikut kursor) via `hoverInfo` —
   tampil via class `.show`, default `display:none` (jangan pakai attr `hidden`:
   kalah oleh CSS `display`, tooltip jadi tidak pernah hilang); **saat titik diseret**
   tooltip disembunyikan saat `pointerdown` lalu dijangkarkan DI SAMPING titik
   (`dragTipPos`, gap 14, kuadran yg muat — tak menutupi titik yg digeser) dan
   kembali ikut kursor setelah `pointerup`; animasi masuk `@keyframes tipIn` (restart
   hanya saat kelas status berubah) + aksen warna status.
   `#qTip` (ikon "?") pakai animasi `@keyframes qIn` + caret. Legenda 4 item saja.
   `updateCalcPreview` juga mengisi `#errOut` (kartu error): `I₁ … → … pu · I₂ … → … pu`
   sebagai bukti visual bahwa error CT benar-benar diterapkan pada arus.
6. **Interaksi plot**: klik area → tambah titik manual; seret lingkaran → pindah
   (handler bernama `planeDown`/`dragMove`/`dragUp`, tooltip `planeHoverMove`);
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
  (SEMUA titik membawa arus SEJATI `{i1,i2}`; manual dibalikkan dari posisi klik via
  `measuredToTrue`). `thr/status/margin` dihitung tiap render, tidak pernah disimpan →
  status titik tak mungkin basi terhadap perubahan kurva/error.
- **Dekorasi SVG tidak menangkap pointer**: `#plane line/polygon/polyline/text` dan
  ghost `circle[data-true-point]` ber-`pointer-events:none` — kalau dihapus, klik
  "tambah titik" tidak akan kena kecuali tepat di kotak latar `[data-plot-bg]`.
- **Kartu kanan = nilai langsung**: jangan kembalikan `.r-sum` / `#eduNote` /
  `renderEdu` (dihapus sesi ini). Penjelasan skenario → `#scenHint` (panel kiri),
  dibuat 1 kalimat singkat. Hint metode/formula tanpa kalimat penjelas.
- **Scrollbar tipis global** lewat `*{scrollbar-width:thin…}` + `*::-webkit-*` 6px —
  jangan mengembalikan scrollbar bawaan browser.
- **SEMUA titik ikut error CT** (kalkulator/skenario/probe/manual): titik manual
  dibalikkan ke I₁/I₂ sejati saat klik/seret, jadi geser slider error = titik bergeser
  real-time. Bukti visual: `#errOut`, ghost titik sejati, kolom `Sejati` tabel, label
  `Iop …` di plot, preview `(terukur …)`.
- Elemen yang bisa diklik plot: lingkaran titik (`[data-point]`) dan latar
  (`[data-plot-bg]`).
- Warna/teks semua lewat variabel `:root` / class; label SVG memakai halo
  `paint-order:stroke;stroke:var(--surface)`.
- Teks UI bahasa Indonesia. Nama kunci: TRIP (merah) vs RESTRAIN (hijau) — warna
  semantik, jangan dipakai dekoratif.
- **Animasi sapuan**: `P.probe` = titik live; `P.probeTrace` = jejak (Iop naik);
  saat tombol ditekan lagi / selesai → `stopAnim()`; probe tidak masuk tabel.
- **Mode pengamatan arus sistem** (kartu ke-4): `I₁=I₂=I` disapu 0.2–12 pu
  (slider/prasetel/▶ ping-pong) dgn error CT aktif; titik `obsI` + jejak
  `polyline[data-obs-path]`; sumbu melebar otomatis (renderPlane); `#obsOut` live
  (nilai + status + ct efektif); eksklusif dgn animasi sapuan. Pelajaran kunci: error
  proporsional → margin % konstan (arus besar TIDAK mendekatkan trip); yang melewati
  slope hanya error yang membesar (toggle saturasi dinamis / ct asimetris).

## Validasi (tanpa build)

```bash
node tools/model.test.js       # 60 asersi literals model (PRD §5 + error + measuredToTrue + toleransi + obs)
node tools/slope-list.test.js  # 18 asersi invariant + literal modul slopeList
node tools/ui.test.js          # 94 asersi seam desain + perilaku UI (hoverInfo, legend,
                               #    errOut, tooltip .show & vs-seret, scrollbar, collapse, obs)
node tools/shoot.js            # screenshot semua view → tools/shots/*.png + report.json/txt
node tools/shoot.js --check    # gerak collapse anti-blink (buka/ciut dari semua-ciut)
```

Harness mengabaikan CSS & tidak punya hirarki DOM anak — teks status dibaca dari
`els.verdictLabel`/`els.marginLabel`; stub tidak membaca atribut `value` markup (set
`els.<id>.value` manual di tes). Semua file tes meng-hard-code nama file HTML — update
jika file di-rename.

## Gaya bahasa & tone

Aplikasi & dokumentasi teknis memakai Bahasa Indonesia untuk label UI. Kode & komentar
campuran Indonesia/Inggris sesuai konteks; usahakan konsisten dengan sekitarnya
(mengikuti gaya `New folder`/Distance Relay).
