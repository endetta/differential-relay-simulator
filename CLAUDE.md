# CLAUDE.md

File ini memberi panduan kepada agen coding (Claude Code / Codebuff / dll.) saat bekerja
dengan kode di repositori ini.

## Project overview

Satu file mandiri: **`differential_relay_simulator.html`** — simulator edukasi **relay
diferensial persentase (ANSI/IEEE 87)** yang berjalan penuh di browser. Plotnya adalah
bidang **Iop–Irt** (arus operasi vs arus restraint/bias): kurva ambang **multi-slope**
(pickup, slope 1..N, breakpoint), daerah TRIP/RESTRAIN, titik uji (klik/seret + dari
kalkulator I1/I2), kartu **faktor kesalahan pengukuran** (error/saturasi CT per sisi +
mismatch rasio → titik sejati vs titik terukur), tooltip hover elemen plot, plus preset,
skenario arus (incl. Inrush sbg pembanding), dan animasi sapuan *eksternal → internal*.
Untuk orientasi cepat (TL;DR, peta file, gotcha) baca `docs/overview.md`; **model &
rumus**: `docs/PRD.md` §5 (sumber kebenaran — jangan ubah rumus inti tanpa memperbarui
dokumen itu juga).

**Dua induk desain yang wajib dijaga:**
1. **Gaya visual/struktur** = port dari proyek **Simulator Distance Relay**
   (`endetta/distance-relay-simulator`): splash krem/ivory, judul bergantian
   `.tt-a`↔`.tt-b` + kilau, palet `--ink/--copper/--blue/--teal`, font Space
   Grotesk/Inter/JetBrains Mono, kartu collapse `.card-b-i`, lock tinggi desktop,
   label SVG ber-halo, KaTeX. Jangan mengubah seam ini seenaknya — diuji
   `tools/ui.test.js`.
2. **Model perhitungan/fitur** = port dari PRD `diff relay/` (salinan: `docs/PRD.md`).

Tidak ada build system / package manager / framework. Satu-satunya dependensi eksternal:
KaTeX + Google Fonts via CDN (opsional; inti jalan tanpanya).

## Menjalankan

Buka `.html` langsung di browser (`file:///...`), atau static server
(`python -m http.server`, `npx serve`). Tidak ada perintah lint/build.

Tes dijalankan dengan Node (harness stub-DOM — pola sama dgn Distance Relay):

```bash
node tools/model.test.js       # 42 asersi literals model murni (PRD §5 + error CT)
node tools/slope-list.test.js  # 18 asersi invariant + literal modul slopeList
node tools/ui.test.js          # 53 asersi seam desain & perilaku UI
```

Semua file tes meng-hard-code nama file HTML di `fs.readFileSync`/path-nya — update jika
file di-rename.

## Git & GitHub

Repo: `https://github.com/endetta/differential-relay-simulator` (remote `origin`,
branch `main`, akun `endetta` via `gh` CLI). Identitas git **repo-lokal**
(`user.name=endetta`, `user.email=endetta@users.noreply.github.com`); jika `.git/config`
hilang, ulangi dua baris `git config` itu (lihat sesi pembuatan repo). Setelah satu
perubahan yang koheren selesai, **commit dan push ke `origin/main` di sesi yang sama**.
Peringatan LF→CRLF saat `git add` di Windows benign — abaikan.

## Arsitektur (urut dalam `<script>`)

1. **Helper** — `fmt`, `clamp`, `fmtSign`, `niceCeil`/`niceStep` (grid 1-2-5).
2. **State global** `S` — `S.param` (`P`): `pickup`, `method` (`'average'|'maximum'`),
   `slopes[]` (`{id,percent,breakpoint}`; **slope terakhir `breakpoint:null`** = sampai
   ∞), `i1`/`i2`, `err` = `{ct1,ct2,mm}` (faktor kesalahan %, lihat model), `points[]`
   (`{id,source:'manual'|'calc',irt,iop,i1,i2}`), `selectedId`, `probe`/`probeTrace`
   (animasi). `S.ui.collapsed`. Semua kontrol menulis ke `S`; tidak ada state lain.
3. **Model murni** — `iopOf`, `irtOf`, `slopeLine` (kumulatif), `thresholdAt
   = max(pickup, slopeLine)`, `statusOf` (TRIP iff `iop > threshold+1e-12` — tepat di
   kurva = RESTRAIN), `marginOf`, `computeDomain`, `curveSample`. Konvensi: fungsi
   memakai `m={pickup,method,slopes}` supaya bisa diuji dengan objek sintetis.
   **Faktor kesalahan pengukuran** (di luar PRD §5): `measuredPair(i1,i2,err)` = arus
   yang DILIHAT relay — `I1m=I1·(1−ct1/100)`, `I2m=I2·(1−ct2/100)·(1+mm/100)` (ct
   saturasi 0..95% mengecilkan; mm mismatch ±30% faktor pada I₂). `evaluatePoint` untuk
   titik `i1/i2` memakai pasangan TERUKUR ini sebagai keputusan, dan melaporkan juga
   koordinat sejati: `{irt,iop,irtTrue,iopTrue,hasErr,i1m,i2m,thr,status,margin,
   trueStatus}` (`hasErr` = koordinat bergeser). `err` default 0 → semua literal lama
   tetap berlaku; objek `m` sintetis tanpa `err` aman (dianggap 0).
   Daftar slope diurus **modul `slopeList`** (`SL` membungkus `P.slopes`): satu-satunya
   pemilik invariant & clamp (percent 1–200; bp monoton naik gap 0.1, pertama ≥0.6,
   ≤20; terakhir open; 1..4; Slope 1 dilindungi; id internal). Perintah
   `setPercent/setBreakpoint/add/remove/load` selalu menormalkan; `bounds(id)` untuk
   UI; `warnings()` = kombinasi "tidak umum tapi legal" saja.
4. **Binding kontrol** → `render()`. Semua perubahan state lewat satu entry point.
5. **Renderer murni per bagian** — `renderPlane` (SVG `#plane` **adaptif**: `viewBox` =
   ukuran elemen aktual `clientWidth/Height`, fallback `640×440` untuk tes; grid+tick
   ber-halo putih `paint-order:stroke`; poligon DAERAH TRIP/RESTRAIN pakai
   `var(--red-soft)`/`var(--green-soft)`; kurva `stroke:var(--ink)`; pickup putus-putus
   copper; marker `BPn`   teal; **ghost titik sejati** (`circle[data-true-point]` + garis putus
   `line[data-err-link]`) hanya saat `hasErr`), `renderTable`, `renderSide` (status box
   + readout **nilai-langsung** 2 grup `Titik uji`/`Keputusan` + formula KaTeX — TANPA
   kalimat ringkasan & TANPA kotak edukasi; indikator PALSU/TERLEWAT = sisipan kecil di
   baris margin kotak status), `renderWarnings` (peringatan non-blocking PRD §5.6).
   **Tooltip hover** (elemen saja, margin ±10 px): `hoverInfo(map,irt,iop)` murni →
   `{kind:'point'|'bp'|'pickup'|'curve', head, rows}`; `#planeTip` ikut kursor —
   **default `display:none`, tampil via class `.show`** (JANGAN pakai attr `hidden`:
   CSS `display` menimpanya → tooltip tak pernah hilang — bug lama). Legenda di bawah
   kurva **3 item saja** (titik TRIP / RESTRAIN / sejati) — info lain sudah berlabel
   di kurva. Scrollbar tipis GLOBAL via `*{scrollbar-width:thin…}` + `::-webkit-*` 6px.
6. **Interaksi plot** — `pointerToPu` memakai `plane._map` (di-set renderPlane) +
   skala `clientWidth/viewBox`; elemen dekoratif SVG `pointer-events:none` (lihat
   gotcha di bawah).
7. **`render()`** master: render plane → tabel → sisi → warnings → preview kalkulator.
   Tak ada status titik yang disimpan — renderer menurunkannya sendiri via
   `evaluatePoint` thd kurva saat ini.
8. **Splash IIFE** + **`fitPlane()`** (ResizeObserver + `plane._dims` guard).

## Gotcha yang sering menggigit

- **Slope dinamis — jangan bangun ulang DOM `#slopesContainer` pada tiap `input`**
  (drag slider putus). `renderSlopes()` hanya di init, tambah/hapus slope, dan preset;
  perubahan nilai ditulis langsung ke `P.slopes`, lalu `render()`.
- **Jangan pernah menormalkan/clamp slope di luar `slopeList`** — modul itu satu-satunya
  pemilik invariant. `renderSlopes` membaca batas via `SL.bounds(id)` (tidak menghitung
  ulang, tidak memutasi `breakpoint` saat render); handler input cukup memanggil
  perintah modul lalu `render()`. Melewati modul (mutasi `P.slopes` langsung) = di luar
  kontrak — state bisa jadi ilegal.
- **Status titik DERIVED, jangan disimpan di objek titik.** `evaluatePoint(m, pt)`
  menghitung `{irt,iop,thr,status,margin}` thd kurva saat ini; titik manual menyimpan
  `{irt,iop}` hasil klik/seret, titik `'calc'` menyimpan `{i1,i2}` (koordinat mengikuti
  metode restraint). Karena tak pernah ditulis, status tidak mungkin basi — jangan
  memperkenalkan kembali field cache `thr/status/margin` pada titik.
- **`pointer-events` SVG**: line/polygon/polyline/text diberi `pointer-events:none`
  (CSS `#plane …{pointer-events:none}`) agar klik/seret hanya kena lingkaran titik
  (`[data-point]`) atau kotak latar `[data-plot-bg]`. Jangan hapus.
- Jangan simpan state UI di luar `S` (kecuali hal sepele seperti `animTimer`).
- **Kartu kanan = nilai langsung saja**: jangan kembalikan kalimat ringkasan (`.r-sum`)
  atau kotak edukasi kontekstual (`#eduNote`/`renderEdu`) — keduanya DIHAPUS atas
  permintaan desain (revisi sesi ini). Penjelasan skenario → 1 hint singkat di bawah
  tombol skenario (`#scenHint`, panel kiri).
- KaTeX: cek `typeof katex==='function'` sebelum `katex.render` (fallback teks biasa).
- Label/teks SVG selalu ber-halo (`paint-order:stroke` + `stroke:var(--surface)`) agar
  terbaca di atas kurva/daerah.
- Warna pakai variabel `:root`; TRIP=merah & RESTRAIN=hijau adalah warna **semantik**
  status — jangan dipakai dekoratif di tempat lain.

## Editing conventions

- Teks UI & dokumentasi: Bahasa Indonesia (konsisten dgn Distance Relay).
- Model 1 file; renderer murni memakai string SVG → mudah diuji lewat harness.
- Tambah fungsi baru yang perlu diuji → cukup daftarkan di **`const API`** di akhir
  script aplikasi (dekat definisinya). Harness (`tools/lens-harness.js`) hanya
  menambahkan `;global.__pub=API;` — daftar ekspor TIDAK boleh diduplikasi di harness.
  Contoh terpasang: `slopeList` (fabrik — tes membuat instance sintetis sendiri) dan
  `SL` (instance aplikasi — tes DOM melewatinya).
- File tes meng-hard-code nama HTML — update bila rename.
