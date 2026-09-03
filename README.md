# Simulator Differential Relay (ANSI 87)

Simulator **pendidikan** untuk memahami *percentage-restrained differential relay*
(relay diferensial persentase, ANSI/IEEE 87) pada proteksi transformator/feeder.
Berjalan sepenuhnya di browser — satu file HTML mandiri, tanpa build, tanpa framework,
tanpa backend.

Simulator memetakan **karakteristik multi-slope** pada bidang **Iop–Irt**: arus operasi
`Iop = |I1 − I2|` vs arus restraint `Irt` (Average `(|I1|+|I2|)/2` atau Maximum
`max(|I1|,|I2|)`), dan menilai setiap titik uji sebagai **TRIP** atau **RESTRAIN**
terhadap kurva ambang `max(pickup, Σ slope)`.

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
  breakpoint — digambar live, daerah **TRIP** (merah) vs **RESTRAIN** (hijau)
- **Dua metode restraint**: Average atau Maximum (titik dari kalkulator mengikuti)
- **Titik uji**: klik langsung di plot / seret untuk memindah, tooltip koordinat +
  status + margin; atau hitung dari **I1 & I2** lewat kalkulator arus
- **Daftar titik uji**: tabel dengan badge status TRIP/RESTRAIN, margin (%), hapus,
  sorot, bersihkan
- **Skenario & animasi**: preset kurva (Dual-slope / Multi adaptif), skenario arus
  (Normal, Eksternal, Internal, Saturasi CT), animasi sapuan *eksternal → internal*
  dengan titik berjalan menyeberangi kurva
- **Peringatan non-blocking** untuk kombinasi tak lazim + **kartu edukasi kontekstual**
  yang menjelaskan pickup/slope/breakpoint/restraint saat disentuh
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
node tools/model.test.js   # model: threshold multi-slope, status, margin (25 asersi)
node tools/ui.test.js      # seam desain + perilaku UI (22 asersi)
```

Kedua tes memakai harness mock-DOM kecil (`tools/lens-harness.js`) yang menjalankan
`<script>` aplikasi di Node dan mengukur string SVG/HTML yang dihasilkan — pola yang
sama dengan proyek **Simulator Distance Relay**.
