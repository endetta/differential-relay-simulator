# Simulator Differential Relay (ANSI 87)

Simulator **pendidikan** untuk memahami *percentage-restrained differential relay*
(relay diferensial persentase, ANSI/IEEE 87) pada proteksi transformator/feeder.
Berjalan sepenuhnya di browser — satu file HTML mandiri, tanpa build, tanpa framework,
tanpa backend.

Simulator memetakan **karakteristik multi-slope** pada bidang **Iop–Irt**: arus operasi
`Iop = |I1 − I2|` vs arus restraint `Irt` (Average `(|I1|+|I2|)/2` atau Maximum
`max(|I1|,|I2|)`), dan menilai setiap titik uji terhadap kurva ambang
`max(pickup, Σ slope)` dengan **3 status**: **RESTRAIN**, **AMBANG** (di dalam pita
toleransi), atau **TRIP** — toleransi ambang bisa diatur (0–50%).

## Menjalankan

Buka `differential_relay_simulator.html` langsung di browser (double-click, atau
`file:///...`). Static server juga bisa:

```bash
python -m http.server
# atau
npx serve
```

Dependensi eksternal hanya dari CDN (KaTeX untuk rumus, Google Fonts) — fungsionalitas
inti tetap berjalan tanpanya.

## Fitur

- **Kurva karakteristik multi-slope** (maks. 4 segmen): minimum pickup, slope 1..N,
  breakpoint — digambar live, daerah **TRIP** (merah) vs **RESTRAIN** (hijau) +
  **pita toleransi AMBANG** (copper) di atas kurva
- **Dua metode restraint**: Average atau Maximum (titik dari kalkulator mengikuti)
- **Titik uji**: klik langsung di plot / seret untuk memindah; hitung dari **I1 & I2**
  lewat kalkulator arus; **SEMUA titik bisa diedit ulang** (klik titik → I1/I2 termuat
  → "Perbarui titik #N") — nilai terukur tampil langsung (label `Iop …` di plot +
  kolom **Sejati** di tabel)
- **Tooltip interaktif**: arahkan kursor ke elemen plot (titik uji, marker breakpoint,
  garis pickup, kurva ambang) — tooltip nilai muncul mengikuti kursor
- **Faktor kesalahan pengukuran**: error/saturasi CT per sisi + mismatch rasio —
  **SEMUA titik ikut error** (titik klik dibalikkan ke I₁/I₂ sejati → geser error =
  titik bergeser real-time), titik **sejati vs titik terukur** ditandai langsung;
  default realistis **5%/5%/+10%** (CT 5P + tap) — bukan 0
- **Mode pengamatan arus sistem**: sapu arus gangguan eksternal/beban transformator
  `I₁=I₂=I` (0.2–12 pu) dengan error CT aktif — amati apakah titik terukur melewati
  slope saat arus membesar/mengecil; tersedia saturasi CT **dinamis** (error efektif
  membesar di arus tinggi), jejak + sumbu otomatis
- **Panduan via ikon "?"**: teks petunjuk permanen diganti tooltip saat hover
- **Daftar titik uji**: tabel Irt/Iop terukur + kolom **Sejati**, badge status
  TRIP/AMBANG/RESTRAIN, margin (%), hapus, sorot, bersihkan
- **Kartu kanan nilai-langsung**: kotak status + nilai utama sbg **hero** (Iop dulu,
  tile ber-status: tint + aksen + chip TRIP/AMBANG/RESTRAIN; Irt netral) + formula
  KaTeX — tanpa kalimat panjang; legenda plot sederhana (4 item); scrollbar tipis global
- **Skenario & animasi**: preset kurva (Dual-slope / Multi adaptif), skenario arus
  (Normal, Eksternal, Internal, Saturasi CT, **Inrush** sbg pembanding) — dengan titik
  TERPILIH, skenario dipasang ke titik itu (bergeser real-time); animasi sapuan
  *eksternal → internal* dengan titik berjalan menyeberangi kurva
- **Peringatan non-blocking** untuk kombinasi tak lazim
- **Gaya desain "Simulator Distance Relay"**: splash krem, judul animasi, kartu
  collapse, label ber-halo, mode tampilan bahasa Indonesia

## Struktur

- `differential_relay_simulator.html` — seluruh aplikasi (markup + CSS + JS)
- `docs/PRD.md` — spesifikasi produk & model perhitungan (sumber kebenaran)
- `docs/overview.md` — orientasi cepat untuk pengembang
- `CLAUDE.md` — panduan arsitektur untuk agen coding
- `tools/` — harness + tes Node (tanpa build)

## Validasi

```bash
node tools/model.test.js       # model: threshold, status, margin, error CT, measuredToTrue, toleransi, obs (60 asersi)
node tools/slope-list.test.js  # modul slopeList: invariant properti + literal (18 asersi)
node tools/ui.test.js          # seam desain + perilaku UI, incl. hoverInfo + obs + titik-ikut-error (88 asersi)
node tools/shoot.js            # screenshot semua view → tools/shots/*.png + report.json/txt
```

Kedua tes memakai harness mock-DOM kecil (`tools/lens-harness.js`) yang menjalankan
`<script>` aplikasi di Node dan mengukur string SVG/HTML yang dihasilkan — pola yang
sama dengan proyek **Simulator Distance Relay**.
