# PRD — Simulator Karakteristik Differential Relay (ANSI 87)

**Nama proyek:** Differential Relay Characteristic Simulator
**Versi dokumen:** 1.0
**Tipe produk:** Web app edukasi, single-page, client-side (tanpa backend)
**Status:** Draft final — siap implementasi

---

## 1. Ringkasan Proyek

Simulator interaktif berbasis web untuk membantu mahasiswa/insinyur memahami **karakteristik operasi relay diferensial persentase (percentage-restrained differential relay, ANSI/IEEE 87)**, khususnya bagaimana parameter setting — minimum pickup, slope 1, slope 2 (dan slope tambahan), serta breakpoint — membentuk kurva batas trip/restrain pada bidang **Iop (arus operasi) vs Irt (arus restraint/bias)**.

Pengguna dapat:
1. Mengubah parameter kurva secara real-time dan langsung melihat perubahan bentuk kurva.
2. Menambah/menghapus segmen slope (kurva multi-slope, bukan cuma dual-slope).
3. Menempatkan titik uji (titik gangguan/kondisi operasi) langsung di atas kurva, atau menghitungnya dari arus dua sisi (I1, I2), lalu melihat apakah titik tersebut jatuh di **daerah TRIP** atau **daerah RESTRAIN**.

Proyek ini murni **alat bantu belajar/visualisasi konsep**, bukan pengganti software setting relay komersial (SEL AcSELerator, ETAP, dsb).

---

## 2. Tujuan & Sasaran Pembelajaran

Setelah menggunakan simulator ini, pengguna diharapkan bisa menjawab secara intuitif:

- Apa itu arus operasi (Iop) dan arus restraint (Irt), dan kenapa relay diferensial memakai rasio keduanya, bukan nilai arus diferensial mentah?
- Kenapa dibutuhkan **slope 1** (sensitivitas terhadap fault kecil, mengakomodasi error CT & tap changer) dan **slope 2** (stabilitas terhadap saturasi CT saat fault eksternal besar)?
- Apa fungsi **minimum pickup** sebagai batas bawah sensitivitas?
- Apa itu **breakpoint** dan kenapa posisinya memengaruhi kapan relay "pindah" dari slope 1 ke slope 2?
- Bagaimana menambah slope ke-3 (adaptive/multi-slope) mengubah luas daerah restrain dibanding dual-slope biasa?
- Bagaimana memosisikan titik operasi hasil perhitungan arus riil pada bidang kurva, dan menyimpulkan status trip/restrain.

### Non-Sasaran (lihat juga §3)
Simulator ini **tidak** dimaksudkan untuk mengajarkan perhitungan setting final di lapangan (CT ratio matching, vector group compensation, in-rush harmonic restraint detail, atau studi saturasi CT time-domain).

---

## 3. Non-Tujuan / Batasan Lingkup (Scope Boundaries)

Agar tetap sederhana dan jujur secara teknis, simulator **sengaja dibatasi**:

| Termasuk (in-scope) | Tidak termasuk (out-of-scope, v1) |
|---|---|
| Kurva multi-slope (pickup, slope 1..N, breakpoint 1..N-1) | Kompensasi tap changer transformator otomatis |
| Perhitungan Iop & Irt dari magnitudo I1, I2 (mode 2-winding) | Perhitungan fasor penuh (sudut, harmonik, DC offset) |
| Mode restraint: Average `(|I1|+|I2|)/2` dan Maximum `max(|I1|,|I2|)` | Pemodelan saturasi CT time-domain |
| Plot titik uji manual (klik/drag) dan titik hasil hitung | Blocking harmonisa 2nd/5th (inrush/overexcitation) — direncanakan v2 |
| Evaluasi status TRIP/RESTRAIN + margin numerik | Notasi multi-vendor (SEL/GE/ABB/Areva) — direncanakan v2 |
| Unit generik dalam per-unit (pu) | Winding ke-3 (transformator 3-belitan) |

Batasan ini **wajib dinyatakan ke pengguna di dalam UI** (lihat §6.6 — panel "Tentang Model Ini") agar tidak disalahartikan sebagai tool setting relay produksi.

---

## 4. Target Pengguna

- **Primer:** Mahasiswa Teknik Elektro (arus kuat/sistem tenaga), khususnya yang sedang mempelajari proteksi sistem tenaga (mata kuliah Proteksi Sistem Tenaga / Relay Protection).
- **Sekunder:** Instruktur/dosen sebagai alat bantu mengajar di kelas; engineer junior yang baru mempelajari konsep 87.
- **Konteks pemakaian:** Belajar mandiri di laptop/desktop, durasi sesi pendek–menengah (5–30 menit), kemungkinan juga dipakai saat presentasi (proyektor) sehingga kontras & keterbacaan harus tinggi.

---

## 5. Dasar Teori & Model Perhitungan (Rekayasa)

> Bagian ini adalah rujukan wajib bagi siapa pun (manusia atau AI coding) yang mengedit logika perhitungan `js/script.js`. Jangan ubah rumus inti tanpa memperbarui bagian ini juga.

### 5.1 Prinsip dasar relay diferensial persentase

Relay diferensial membandingkan arus yang masuk dan keluar dari zona proteksi (mis. dua sisi transformator/feeder) melalui CT di tiap sisi. Dalam kondisi normal atau gangguan eksternal (through-fault), arus dari kedua CT saling meniadakan; saat gangguan internal terjadi, muncul arus diferensial signifikan.

Relay tipe **percentage-restrained** tidak memakai ambang arus diferensial tetap, melainkan ambang yang **naik proporsional terhadap besar arus through (restraint/bias)** — supaya relay tetap aman (tidak salah trip) walau ada ketidaksesuaian kecil antar-CT saat arus through besar, tapi tetap sensitif saat arus through kecil.

### 5.2 Besaran dasar (mode simulasi: 2 winding, magnitudo)

Simulator memakai model sederhana berbasis magnitudo (tanpa sudut fasa), yang lazim dipakai untuk *ilustrasi* konsep di literatur pengantar proteksi:

```
Iop (arus operasi/diferensial) = | I1 − I2 |
```

Untuk arus restraint, tersedia dua metode (dapat dipilih pengguna — keduanya dipakai di relay komersial nyata):

```
Irt (Average restraint, default) = ( |I1| + |I2| ) / 2
Irt (Maximum restraint)          =  max( |I1| , |I2| )
```

**Catatan kejujuran teknis:** relay produksi (mis. SEL-387 series) menghitung `Iop` sebagai jumlah vektor arus (`Iop = |I1 + I2|`, dengan konvensi polaritas CT tertentu) dan dapat melibatkan 3 winding sekaligus. Simulator ini memakai model magnitudo 2-winding yang **disederhanakan untuk tujuan edukasi** — cukup akurat untuk mengajarkan *bentuk kurva dan logika trip/restrain*, tapi **tidak** dimaksudkan untuk replikasi presisi software vendor. Pernyataan ini harus tetap tampil di panel info aplikasi.

### 5.3 Karakteristik kurva multi-slope

Kurva didefinisikan oleh:
- `Ipickup` — batas minimum Iop yang bisa memicu trip, berlaku horizontal di seluruh sumbu Irt (relay tidak akan trip di bawah nilai ini walau rasio slope terpenuhi).
- Daftar segmen slope terurut: `Slope 1 (m1)` dari titik asal (0,0) sampai `Breakpoint 1 (b1)`, `Slope 2 (m2)` dari `b1` sampai `Breakpoint 2 (b2)` (jika ada), dst. Slope terakhir berlaku sampai tak hingga.

Garis ambang trip merupakan **fungsi kumulatif** terhadap Irt (garis akan menyambung, bukan patah horizontal ke rasio baru):

```
T1(Irt) = m1 × Irt                                  untuk 0 ≤ Irt ≤ b1
T2(Irt) = m1×b1 + m2×(Irt − b1)                      untuk b1 ≤ Irt ≤ b2
T3(Irt) = m1×b1 + m2×(b2−b1) + m3×(Irt − b2)         untuk b2 ≤ Irt ≤ b3
... (dan seterusnya untuk slope tambahan)
```

Ambang trip final adalah nilai yang lebih tinggi antara garis slope kumulatif dan garis pickup horizontal:

```
Threshold(Irt) = max( Ipickup , Tk(Irt) )     — k = segmen slope yang mengandung Irt tsb.
```

### 5.4 Logika keputusan trip

```
JIKA Iop > Threshold(Irt)   →  status = TRIP (Operasi)
SELAIN itu                  →  status = RESTRAIN (Menahan)
```

Margin yang ditampilkan ke pengguna:
```
Margin (%) = ( (Iop − Threshold(Irt)) / Threshold(Irt) ) × 100
```
Margin positif besar → jauh di daerah trip. Margin negatif → aman di daerah restrain, makin negatif makin jauh dari batas.

### 5.5 Rentang nilai default & realistis (referensi setting umum di industri)

Dipakai sebagai nilai default & batas slider agar hasil simulasi tetap masuk akal secara teknik:

| Parameter | Rentang wajar | Default simulator |
|---|---|---|
| Minimum pickup (Ipickup) | 0.1 – 0.5 pu | 0.30 pu |
| Slope 1 | 15% – 30% | 25% |
| Breakpoint 1 (Irt) | 1.5 – 6 × arus nominal (pu) | 2.0 pu |
| Slope 2 | 50% – 150% (bisa sampai 200% pada kasus khusus) | 65% |
| Jumlah slope tambahan (opsional) | 0 – 2 slope ekstra | 0 (dual-slope) |

Sumber acuan konsep (bukan untuk dikutip literal di UI, hanya dasar kebenaran teknis): dokumentasi relay diferensial dual-slope/adaptive-slope (mis. seri SEL-387), materi ajar proteksi transformator standar IEEE/ANSI 87T, dan referensi umum percentage-restrained differential relay.

### 5.6 Validasi input (agar kurva tetap valid secara matematis, bukan secara "setting industri")

- `Breakpoint` harus naik monoton: `b1 < b2 < b3 ...`. Simulator boleh menolak/mengoreksi otomatis jika tidak.
- `Slope` boleh bernilai berapa pun > 0% (termasuk slope2 < slope1, walau tidak lazim di industri) — simulator tetap menggambar kurvanya, tapi beri **badge peringatan non-blocking** "Kombinasi tidak umum di industri" agar pengguna tetap belajar dari eksplorasi bebas tanpa dihalangi validasi keras.
- `Ipickup ≥ 0`. `Slope ≥ 1%` (hindari slope 0 yang membuat kurva datar tak berguna, cukup beri peringatan bukan blocking).

---

## 6. Kebutuhan Fungsional

### 6.1 Panel Parameter Kurva (kiri/atas)
- Input numerik **dan** slider untuk: Ipickup, tiap Slope (%), tiap Breakpoint (pu).
- Tombol **"+ Tambah Slope"** — menambah segmen slope baru (maks 4 slope total demi keterbacaan grafik).
- Tombol hapus (×) di tiap slope tambahan (slope 1 tidak bisa dihapus, minimal dual-slope tersisa opsional turun ke single-slope jika slope 2 dihapus).
- Toggle metode restraint: **Average** / **Maximum** (memengaruhi kalkulator arus di §6.3).
- Semua perubahan **live-update** kurva tanpa perlu tombol submit.

### 6.2 Bidang Kurva Interaktif (tengah, elemen utama/hero)
- Plot 2 sumbu: X = Irt (arus restraint, pu), Y = Iop (arus operasi, pu).
- Kurva ambang trip digambar sebagai garis tegas; area di atas kurva diberi fill merah muda transparan berlabel **"DAERAH TRIP"**, area di bawah diberi fill hijau muda transparan berlabel **"DAERAH RESTRAIN"**.
- Garis pickup horizontal digambar terpisah (putus-putus) agar terlihat jelas sebagai batas independen.
- Grid & skala sumbu otomatis menyesuaikan rentang parameter.
- **Klik langsung di area plot** untuk menempatkan titik uji baru (mode "Titik Manual") — titik bisa di-drag ulang setelah ditempatkan.
- Titik yang sudah ditempatkan menampilkan tooltip hover: koordinat (Irt, Iop), status, margin.

### 6.3 Kalkulator Titik dari Arus (panel sekunder, bisa collapse)
- Input `I1` dan `I2` (magnitudo, pu atau A — user memilih satuan label saja, murni tampilan).
- Hasil otomatis: Iop, Irt (sesuai metode restraint terpilih), lalu titik otomatis muncul di plot dengan sumber label "Dari Arus".
- Tombol "Tambahkan ke Plot".

### 6.4 Daftar Titik Uji (tabel)
- Semua titik (manual maupun dari kalkulator) muncul di tabel: No, Sumber, Irt terukur, Iop terukur, Sejati (Irt/Iop tanpa error, "—" bila tak bergeser), Status (badge TRIP/AMBANG/RESTRAIN berwarna), Margin (%).
- Aksi per baris: hapus, sorot di plot (highlight on hover row ↔ highlight point).
- Tombol "Bersihkan semua titik".

### 6.5 Panel Edukasi Kontekstual (kanan/bawah)
- Kartu penjelasan singkat yang **berubah sesuai parameter yang sedang di-hover/diubah** — contoh: saat user menggeser slider Breakpoint 1, kartu menjelaskan "Breakpoint menentukan Irt di mana relay beralih dari Slope 1 ke Slope 2...".
- Minimal mencakup penjelasan: Iop, Irt, Pickup, Slope, Breakpoint, Trip vs Restrain.
- Bahasa Indonesia, ringkas (2–4 kalimat per kartu), tanpa jargon berlebih di kalimat pertama (istilah teknis boleh dipakai tapi selalu didefinisikan).

### 6.6 Panel "Tentang Model Ini"
- Selalu dapat diakses (mis. lewat ikon info di header), berisi ringkasan §3 dan §5.2 (batasan & asumsi model) dalam bahasa non-teknis, supaya pengguna tidak salah kira ini tool setting produksi.

### 6.7 Reset & Preset
- Tombol **"Reset ke Default"** — kembalikan semua parameter ke nilai default §5.5.
- (Opsional, nice-to-have) 2 preset cepat: "Dual-Slope Standar" dan "Multi-Slope Adaptif" untuk demonstrasi cepat di kelas.

---

## 7. Spesifikasi UI/UX & Design System

Peran: senior UI/UX designer, standar industri. Mode terang (light mode), aksen **merah**, gaya **industrial-modern**: bersih, ringan (tidak sesak), keterbacaan tinggi, konsisten. Bagian ini adalah **kontrak desain** — wajib diikuti persis oleh siapa pun (termasuk AI coding) yang mengedit `css/styles.css`. Semua nilai sudah didefinisikan sebagai CSS custom properties di `:root` pada `styles.css` — **jangan hardcode nilai baru di luar token ini**.

### 7.1 Prinsip arah desain
Panel instrumen proteksi tenaga listrik: bersih, presisi, sedikit "dingin" seperti HMI relay sungguhan, tapi tetap ramah untuk belajar (bukan gelap/menakutkan). Sudut tegas (radius kecil), border tipis lebih diutamakan dari shadow tebal, angka-angka penting ditampilkan dengan font monospace agar terasa seperti pembacaan alat ukur.

### 7.2 Palet Warna (Design Tokens)

```css
/* Netral / permukaan */
--color-bg:            #F5F5F4;  /* latar halaman, abu hangat sangat muda */
--color-surface:       #FFFFFF;  /* kartu/panel */
--color-surface-alt:   #FAFAF9;  /* panel sekunder/table stripe */
--color-border:        #E3E1DE;
--color-border-strong: #C9C6C2;

/* Teks */
--color-text-primary:   #1C1B1A;
--color-text-secondary: #5B5754;
--color-text-muted:     #8A8683;

/* Aksen merah (primer — tombol, highlight, header aktif) */
--color-accent:         #D7263D;
--color-accent-hover:   #B71F33;
--color-accent-active:  #971A2A;
--color-accent-subtle:  #FBE7E9;  /* background badge/hover ringan */

/* Semantik status (dipakai HANYA untuk status trip/restrain, bukan aksen umum) */
--color-status-trip:        #D7263D; /* sama dengan accent — trip = merah = alarm */
--color-status-trip-bg:     #FBE7E9;
--color-status-restrain:    #1E8E3E;
--color-status-restrain-bg: #E6F4EA;
--color-status-warning:     #B7791F;
--color-status-warning-bg:  #FBF1DF;

/* Grafik */
--color-grid-line:  #E7E5E3;
--color-axis-line:  #A8A4A1;
--color-curve-line: #1C1B1A;
```

Aturan pemakaian: **merah** hanya untuk (a) elemen aksen UI (tombol utama, link aktif, indikator fokus, header), dan (b) status TRIP. **Hijau** hanya untuk status RESTRAIN — bukan warna aksen bebas pakai di tempat lain. Ini menjaga makna warna tetap konsisten (semantic, bukan dekoratif).

### 7.3 Tipografi

Dua peran font, dipilih agar terasa seperti instrumen rekayasa, bukan web marketing:

- **UI/Teks** — `Inter` (fallback: `-apple-system, "Segoe UI", Roboto, sans-serif`). Dipakai untuk semua label, paragraf, judul.
- **Data/Angka** — `"JetBrains Mono"` (fallback: `"SF Mono", Consolas, monospace`). Wajib dipakai untuk: semua nilai numerik parameter, koordinat titik, badge margin (%), dan pembacaan sumbu grafik — agar angka selalu berbaris rapi (tabular figures) seperti panel relay sungguhan.

**Skala tipografi (semua sebagai token, jangan pakai nilai px lepas di komponen):**

```css
--font-ui:   "Inter", -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", Consolas, monospace;

--text-xs:    11px;  --lh-xs:    16px;   /* caption, footnote */
--text-sm:    13px;  --lh-sm:    18px;   /* label input, badge */
--text-base:  14px;  --lh-base:  20px;   /* body/teks utama UI */
--text-md:    16px;  --lh-md:    24px;   /* isi kartu edukasi */
--text-lg:    18px;  --lh-lg:    26px;   /* sub-judul panel */
--text-xl:    22px;  --lh-xl:    28px;   /* judul section */
--text-2xl:   28px;  --lh-2xl:   34px;   /* nilai besar (mis. status badge) */
--text-display: 34px; --lh-display: 40px; /* judul halaman/header app */

--weight-regular:  400;
--weight-medium:   500;  /* label, nav */
--weight-semibold: 600;  /* judul, heading */
--weight-bold:     700;  /* hanya untuk status TRIP/RESTRAIN besar */

--tracking-tight: -0.01em;  /* judul besar */
--tracking-normal: 0;
--tracking-wide: 0.04em;    /* label kapital kecil, mis. "DAERAH TRIP" */
```

Aturan: heading (`text-lg` ke atas) pakai `weight-semibold`; body pakai `weight-regular`; semua label kapital kecil (eyebrow/badge) pakai `tracking-wide` + `text-xs` + `weight-medium`. Line-height **tidak pernah** di-override manual di komponen — selalu ikut pasangan `--lh-*` sesuai `--text-*` yang dipakai.

### 7.4 Skala Spasi (grid 4px)

```css
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 20px; --space-6: 24px;  --space-8: 32px;  --space-10: 40px;
--space-12: 48px; --space-16: 64px;
```
Semua padding/margin/gap komponen **wajib** memakai token ini (kelipatan 4px). Padding kartu standar: `--space-6` (24px). Gap antar elemen form: `--space-3`. Gap antar section utama: `--space-8`.

### 7.5 Bentuk, Border, Elevasi

```css
--radius-sm: 2px;   /* input, badge kecil */
--radius-md: 4px;   /* tombol, kartu kecil */
--radius-lg: 6px;   /* kartu panel utama */
--border-width: 1px;
--border-width-strong: 2px; /* fokus, elemen aktif */

--shadow-flat: none;
--shadow-card: 0 1px 2px rgba(28,27,26,0.05), 0 1px 1px rgba(28,27,26,0.03);
--shadow-focus: 0 0 0 3px var(--color-accent-subtle);
```
Filosofi: **flat design dengan border tipis**, bukan shadow tebal/gradient. Radius kecil di semua tempat (kesan presisi instrumen, bukan konsumer/playful).

### 7.6 Layout & Grid

- Desktop (≥1024px): grid 3 kolom — panel parameter (kiri, ~280px tetap) | plot kurva + tabel titik (tengah, fleksibel, minimal 480px) | panel edukasi (kanan, ~300px tetap).
- Tablet (768–1023px): panel parameter & edukasi jadi accordion collapsible di atas/bawah plot; plot tetap dominan.
- Mobile (<768px): semua panel ditumpuk vertikal (parameter → plot → kalkulator → tabel → edukasi), plot tetap persegi/responsif dan tetap bisa di-tap untuk titik.
- Container max-width halaman: 1440px, margin auto, padding horizontal `--space-6` (mobile) / `--space-10` (desktop).

### 7.7 Komponen & State (wajib konsisten di semua instance)

- **Tombol primer** (mis. "+ Tambah Slope", "Tambahkan ke Plot"): bg `--color-accent`, teks putih, `radius-md`, padding `--space-2` `--space-4`, hover → `--color-accent-hover`, active → `--color-accent-active`, disabled → opacity 0.4 + cursor not-allowed.
- **Tombol sekunder** (mis. "Reset"): bg transparan, border `--border-width` `--color-border-strong`, teks `--color-text-primary`, hover → bg `--color-surface-alt`.
- **Input angka & slider**: selalu berpasangan (slider + input angka sinkron dua arah), label `text-sm weight-medium` di atas, satuan (pu/%) ditampilkan sebagai suffix abu-abu di dalam/sebelah input dengan font mono.
- **Focus state**: semua elemen interaktif wajib punya `--shadow-focus` yang terlihat jelas saat navigasi keyboard (Tab) — tidak boleh dihilangkan (`outline:none` tanpa pengganti dilarang).
- **Badge status**: `TRIP` → bg `--color-status-trip-bg`, teks `--color-status-trip`, `weight-bold`, huruf kapital, `tracking-wide`. `RESTRAIN` → padanan warna hijau. Bentuk pill (`radius` besar khusus badge, 999px, ini satu-satunya elemen boleh full-rounded sebagai penanda "status").
- **Tabel titik uji**: baris zebra (`--color-surface-alt` selang-seling), header `text-xs weight-medium tracking-wide` huruf kapital, angka rata kanan dengan `font-mono`.
- **Tooltip plot**: bg `--color-text-primary` (gelap di atas terang, kontras tinggi), teks putih `text-xs`, radius `--radius-sm`, muncul di atas titik yang di-hover.

### 7.8 Aksesibilitas
- Kontras teks minimal WCAG AA (4.5:1 body, 3:1 teks besar) — palet di §7.2 sudah diuji memenuhi ini di atas `--color-bg`/`--color-surface`.
- Status TRIP/RESTRAIN **tidak boleh** hanya mengandalkan warna — selalu disertai teks label ("TRIP"/"RESTRAIN") dan ikon berbeda bentuk.
- Semua kontrol bisa dioperasikan via keyboard (slider, tombol tambah/hapus slope, penempatan titik punya alternatif input angka manual selain klik/drag).
- `prefers-reduced-motion`: transisi kurva/animasi titik disederhanakan jika user mengaktifkan setting ini di OS.

### 7.9 Konsistensi lintas file (checklist wajib untuk AI coding saat revisi)
1. Semua warna **harus** lewat CSS variable di `:root`, tidak ada hex/rgb baru ditulis langsung di dalam rule komponen.
2. Semua ukuran font/spasi **harus** lewat token `--text-*`/`--space-*`, tidak ada angka px lepas kecuali untuk detail sangat kecil non-semantik (mis. `1px` border).
3. Angka teknis (arus, %, koordinat) **selalu** `font-mono`; label/teks naratif **selalu** `font-ui`.
4. Nama warna semantik (`trip`/`restrain`/`warning`) tidak pernah dipakai untuk elemen dekoratif di luar konteks status.
5. Setiap komponen baru yang ditambahkan wajib memakai token yang sudah ada dulu sebelum menambah token baru — kalau perlu token baru, tambahkan di `:root` dengan pola penamaan yang sama, lalu catat di dokumen ini.

---

## 8. Arsitektur Teknis

### 8.1 Stack
- **Tanpa framework, tanpa build step** — HTML + CSS + JavaScript murni (vanilla), agar file bisa langsung dibuka di browser (`index.html`) tanpa server, dan mudah dibaca/direvisi oleh AI coding tanpa konteks tooling tambahan.
- Grafik kurva digambar dengan **SVG native** (bukan library chart) — presisi tinggi untuk garis multi-segmen linear, dan mudah diberi interaksi klik/drag langsung lewat event SVG.
- `package.json` disertakan **hanya sebagai kenyamanan dev** (menjalankan local static server, mis. `npx serve`), **bukan dependency wajib** — aplikasi tetap 100% berjalan dengan membuka `index.html` langsung di browser.

### 8.2 Struktur File

```
differential-relay-simulator/
├── index.html            → struktur halaman & semua section UI
├── css/
│   └── styles.css        → design tokens (§7) + semua styling komponen
├── js/
│   └── script.js         → state, perhitungan (§5), rendering SVG, interaksi
├── docs/
│   └── PRD.md             → dokumen ini
├── package.json           → skrip dev opsional (tanpa dependency wajib)
└── README.md               → panduan cepat untuk pengguna & AI coding
```

### 8.3 Model Data (state di `script.js`)

```js
state = {
  pickup: 0.30,
  restraintMethod: "average",     // "average" | "maximum"
  slopes: [
    { id, percent: 25, breakpoint: 2.0 },   // breakpoint = batas ATAS segmen ini
    { id, percent: 65, breakpoint: null }   // null = segmen terakhir, sampai tak hingga
  ],
  points: [
    { id, source: "manual" | "calculated", irt, iop, i1, i2, createdAt }
  ]
}
```

### 8.4 Alur Render
`state berubah → recomputeCurve() → drawCurveSVG() → recomputeAllPointStatuses() → renderPointsTable() → updateEducationPanel(context)`. Semua render bersifat idempotent (aman dipanggil ulang penuh, tidak perlu diffing kompleks) karena skala data kecil (maks ~4 slope, puluhan titik).

---

## 9. Kriteria Penerimaan

- [ ] Mengubah nilai Ipickup/Slope/Breakpoint (lewat slider maupun input angka) langsung mengubah bentuk kurva SVG tanpa reload/lag terasa.
- [ ] Menambah slope baru menambah satu segmen garis baru yang tersambung mulus dari breakpoint sebelumnya; menghapusnya mengembalikan kurva ke kondisi sebelumnya.
- [ ] Klik di area plot menambahkan titik baru pada koordinat klik (dikonversi dari pixel ke satuan pu dengan benar sesuai skala sumbu saat itu); titik bisa di-drag dan status/margin ter-update live.
- [ ] Mengisi I1 & I2 di kalkulator menghasilkan Iop/Irt sesuai rumus §5.2 (persis, teruji dengan minimal 5 kasus manual) dan titik baru muncul di plot pada koordinat yang benar.
- [ ] Status titik (TRIP/RESTRAIN) di tabel selalu konsisten dengan posisi visualnya relatif kurva (di atas garis = TRIP, di bawah = RESTRAIN) — divalidasi untuk titik yang persis di semua breakpoint.
- [ ] Ganti metode restraint (Average ↔ Maximum) mengubah nilai Irt seluruh titik yang berasal dari kalkulator arus, dan status ter-update.
- [ ] Semua teks, warna, ukuran font mengikuti token di §7 — tidak ada nilai hardcoded yang menyimpang saat diperiksa di DevTools.
- [ ] Tampilan tetap rapi & terbaca di lebar 375px (mobile) sampai 1440px+ (desktop besar/proyektor).
- [ ] Navigasi penuh via keyboard (Tab/Enter/Arrow pada slider) berfungsi, focus ring selalu terlihat.
- [ ] Panel "Tentang Model Ini" dapat diakses dan berisi pernyataan batasan model sesuai §3 & §5.2.

---

## 10. Asumsi & Keterbatasan (ringkasan eksekutif)

1. Model perhitungan memakai **magnitudo arus 2-winding**, bukan fasor lengkap — cukup untuk mengajarkan bentuk kurva & logika keputusan, tidak untuk replikasi presisi relay vendor tertentu.
2. Tidak ada pemodelan saturasi CT, harmonik inrush, atau kompensasi tap changer — ini murni visualisasi karakteristik kurva operasi.
3. Nilai default & rentang parameter (§5.5) diambil dari rentang umum yang dipublikasikan di literatur/dokumentasi teknis relay diferensial komersial, dipakai sebagai acuan kewajaran, bukan setting final untuk sistem nyata.
4. Satuan arus bersifat generik per-unit (pu) — pengguna bebas menganggapnya sebagai pu terhadap arus nominal CT sesuai konteks belajar masing-masing.

---

## 11. Rencana Pengembangan Lanjutan (v2+, di luar scope build ini)

- Mode multi-vendor: penamaan parameter & tampilan kurva ala SEL / GE / ABB / Areva (sudah ada eksplorasi awal di proyek terpisah pengguna).
- Elemen restraint harmonik (2nd harmonic untuk blocking inrush, 5th harmonic untuk overexcitation) sebagai layer tambahan di atas kurva slope.
- Mode 3-winding (transformator dengan tersier).
- Simulasi bentuk gelombang (waveform) sederhana untuk mengilustrasikan asal-usul arus diferensial saat inrush.

---

## 12. Panduan untuk AI Coding / Kontributor Selanjutnya

Jika kamu (AI coding lain atau versi masa depan Claude) diminta merevisi proyek ini:

1. **Baca dulu §5 (Dasar Teori)** sebelum mengubah apa pun di `js/script.js` bagian kalkulasi. Rumus di §5.1–§5.4 adalah sumber kebenaran (source of truth) — kalau ingin mengubah pendekatan (mis. menambah mode fasor penuh), perbarui dulu dokumen ini, baru kode.
2. **Baca §7 (Design System) sebelum menyentuh `css/styles.css`.** Jangan menambah warna/ukuran baru di luar token tanpa alasan kuat, dan kalau menambah, update §7 juga supaya dokumen tetap jadi rujukan akurat.
3. Proyek ini **sengaja tanpa framework/build step**. Jangan tambahkan dependency besar (React, Tailwind CDN, dsb.) kecuali diminta eksplisit oleh pengguna — filosofi proyek adalah "buka file, langsung jalan".
4. Perubahan fungsional baru → tambahkan juga baris baru di §9 (Kriteria Penerimaan) supaya checklist tetap relevan.
5. Pengguna proyek ini (Sheva) lebih menyukai komunikasi ringkas/padat dan sudah punya proyek simulator relay lain (distance relay ANSI 21, differential relay dasar) — jaga gaya visual & terminologi tetap konsisten dengan proyek-proyek tersebut bila diminta menyelaraskan.

---

*Akhir dokumen PRD.*
