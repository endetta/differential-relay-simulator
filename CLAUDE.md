# CLAUDE.md

File ini memberi panduan kepada agen coding (Claude Code / Codebuff / dll.) saat bekerja
dengan kode di repositori ini.

## Project overview

Satu file mandiri: **`differential_relay_simulator.html`** — simulator edukasi **relay
diferensial persentase (ANSI/IEEE 87)** yang berjalan penuh di browser. Plotnya adalah
bidang **Iop–Irt** (arus operasi vs arus restraint/bias): kurva ambang **multi-slope**
(pickup, slope 1..N, breakpoint) + **pita toleransi** (keputusan 3 status TRIP/AMBANG/
RESTRAIN), titik uji (klik/seret + dari kalkulator I1/I2 — **bisa diedit ulang**), kartu
**faktor kesalahan pengukuran** (error/saturasi CT per sisi + mismatch rasio → titik
sejati vs titik terukur; **default realistis 5%/5%/+10%** = CT 5P + tap), **mode
pengamatan arus sistem** (sweep through-current I₁=I₂=I dgn jejak & saturasi dinamis),
tooltip hover elemen plot, panduan via **ikon "?"** (bukan teks permanen), plus preset,
skenario arus (incl. Inrush sbg pembanding), dan animasi sapuan *eksternal → internal*.
Untuk orientasi cepat (TL;DR, peta file, gotcha) baca `docs/overview.md`; **model &
rumus**: `docs/PRD.md` §5 (sumber kebenaran — jangan ubah rumus inti tanpa memperbarui
dokumen itu juga).

**Dua induk desain yang wajib dijaga:**
1. **Gaya visual/struktur** = port dari proyek **Simulator Distance Relay**
   (`endetta/distance-relay-simulator`): splash krem/ivory, judul bergantian
   `.tt-a`↔`.tt-b` + kilau, palet `--ink/--copper/--blue/--teal`, font Space
   Grotesk/Inter/JetBrains Mono, kartu collapse `.card-b-i`, lock tinggi desktop,
   label SVG ber-halo. Jangan mengubah seam ini seenaknya — diuji
   `tools/ui.test.js`. Detail header: "by Sheva - Endetta" muncul tiap **24 dtk**
   ±3 dtk (fade halus, tanpa potongan keras) dan kilau = **krem #FDFAF3 di atas
   copper lembut #8A6B4D** (jangan kembalikan siklus 8 dtk / band putih / oranye
   copper-deep menyala).
2. **Model perhitungan/fitur** = port dari PRD `diff relay/` (salinan: `docs/PRD.md`).

Tidak ada build system / package manager / framework. Satu-satunya dependensi eksternal:
Google Fonts via CDN (opsional; inti jalan tanpanya).

## Menjalankan

Buka `.html` langsung di browser (`file:///...`), atau static server
(`python -m http.server`, `npx serve`). Tidak ada perintah lint/build.

Tes dijalankan dengan Node (harness stub-DOM — pola sama dgn Distance Relay):

```bash
node tools/model.test.js       # 60 asersi literals model murni (PRD §5 + error CT + measuredToTrue + toleransi + obs)
node tools/slope-list.test.js  # 18 asersi invariant + literal modul slopeList
node tools/ui.test.js          # 102 asersi seam desain & perilaku UI (incl. titik-ikut-error + tooltip-vs-seret + batas fisis)
node tools/shoot.js --check    # verifikasi di Chrome: gerak collapse anti-blink + chip hero utuh
```

**Melihat UI tanpa membuka browser** — `node tools/shoot.js` (tanpa dependensi, CDP
via WebSocket native Node ≥22): menjalankan headless Chrome, memuat HTML lokal, lalu
untuk tiap view (default/points/band/err/obs/obs-lin/tooltip/qtip/collapsed/mobile)
menerapkan state tertentu & menyimpan PNG penuh ke `tools/shots/<view>.png` + lembar
kontak `index.html`. Karena PNG tak bisa "dibaca" agent, ia juga menulis
`tools/shots/report.json`/`report.txt` — geometri elemen kunci (rect kartu/plane/
legend), status tooltip (`planeTip`/`qTip` shown?), ikon `?` + label induknya
(flag ORPHAN), overflow horizontal, exception konsol, dan snapshot `P.err`/`P.obs`/
probe. View JS memakai fungsi global aplikasi (`addPoint`, `runScenario`, `applyErr`,
`applyObs`, `selectPoint`, …) — jangan duplikasi logika. Folder `tools/shots/`
GITIGNORED (artefak). `CHROME=/path node tools/shoot.js` bila Chrome tak terdeteksi.
Mode `--check` menyampel padding/posisi konten saat buka & ciut dari keadaan
semua-kartu-terciut — GAGAL bila ada lompatan instan (blink tengah→atas).

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
   ∞), `i1`/`i2`, `err` = `{ct1,ct2,mm}` (faktor kesalahan %, lihat model) — default
   `DEFAULT_ERR={ct1:5,ct2:5,mm:10}` (CT 5P + offset rasio/tap, BUKAN 0; `zeroErrors()`
   untuk menolkan), `tol` = pita toleransi ambang % (default 10), `obs` =
   `{on,I,dyn,knee,gain,play}` (mode pengamatan arus sistem), `points[]`
   (`{id,source:'manual'|'calc',irt,iop,i1,i2}` — SEMUA titik membawa i1/i2 SEJATI;
   manual hasil balikan `measuredToTrue`), `selectedId`, `editId` (titik yg sedang
   diedit via kalkulator — berlaku utk SEMUA titik), `probe`/`probeTrace` (animasi,
   `source:'probe'`). `S.ui.collapsed`
   (curve/err/calc/obs). Semua kontrol menulis ke `S`; tidak ada state lain.
3. **Model murni** — `iopOf`, `irtOf`, `slopeLine` (kumulatif), `thresholdAt
   = max(pickup, slopeLine)`, `thresholdTol`/`thresholdLow = kurva×(1±tol/100)`
   (pita toleransi SIMETRIS di kedua sisi kurva), `tripState`/`statusOf` (3 status:
   RESTRAIN di bawah pita · AMBANG DI DALAM pita (dekat kurva sisi mana pun, kurva
   sendiri termasuk) · TRIP di atas pita; `tol` 0/absent → bawah=atas=kurva → pita
   kosong = perilaku lama),
   `marginOf` (selalu thd KURVA, bukan batas pita), `computeDomain` (yMax ikut pita
   agar tak terpotong), `curveSample`. Konvensi: fungsi
   memakai `m={pickup,method,slopes}` supaya bisa diuji dengan objek sintetis.
   **Faktor kesalahan pengukuran** (di luar PRD §5): `measuredPair(i1,i2,err)` = arus
   yang DILIHAT relay — `I1m=I1·(1−ct1/100)`, `I2m=I2·(1−ct2/100)·(1+mm/100)` (ct
   saturasi 0..95% mengecilkan; mm mismatch ±30% faktor pada I₂). **`measuredToTrue(irt,
   iop,method,err)` = invers eksak**: posisi TERUKUR → arus SEJATI `{i1,i2}` yang
   menghasilkannya (daerah iop>2·irt avg / iop>irt max mustahil fisis → I2 dipatok 0).
   **SEMUA titik kini membawa `i1/i2`** (manual dibalikkan saat klik/seret) → error
   ikut memengaruhi titik manual: geser slider error = titik bergeser real-time.
   `evaluatePoint` utk titik `i1/i2` memakai pasangan TERUKUR ini sebagai keputusan,
   dan melaporkan juga koordinat sejati: `{irt,iop,irtTrue,iopTrue,hasErr,i1m,i2m,thr,
   status,margin,trueStatus}` (`hasErr` = koordinat bergeser). **Default `err` =
   `DEFAULT_ERR` (5%/5%/+10%)** — objek `m` sintetis TANPA `err` dianggap `ERR0` (0)
   agar literal model tetap bebas error.
   **Mode pengamatan arus sistem** (through-sweep `I₁=I₂=I`, eksklusif dgn animasi):
   `satFactor(i,knee,gain)` = faktor saturasi dinamis (1 di bawah knee, linier ke gain
   di 3·knee); `obsEff(m,I)` = pasangan terukur + `ct1Eff/ct2Eff` utk arus sistem I
   (dyn ON: ct efektif = ct×faktor — membesar di arus tinggi); `obsPath(m,I)` = jejak
   measured dari 0.2→I. Titik pengamatan = `P.probe` `{i1:I,i2:I,obsI:I,source:'obs'}`
   → `evaluatePoint` membaca pasangan terukur lewat `obsEff(m,obsI)` (bukan menyimpan
   nilai turunan → tak basi thd perubahan err/metode). Pelajaran: error proporsional
   → jejak LURUS & margin % konstan dlm satu segmen slope; yang menyeberang slope di
   arus tinggi hanya error yang MEMBESAR (saturasi dinamis / ct asimetris).
   Daftar slope diurus **modul `slopeList`** (`SL` membungkus `P.slopes`): satu-satunya
   pemilik invariant & clamp (percent 1–200; bp monoton naik gap 0.1, pertama ≥0.6,
   ≤20; terakhir open; 1..4; Slope 1 dilindungi; id internal). Perintah
   `setPercent/setBreakpoint/add/remove/load` selalu menormalkan; `bounds(id)` untuk
   UI; `warnings()` = kombinasi "tidak umum tapi legal" saja.
4. **Binding kontrol** → `render()`. Semua perubahan state lewat satu entry point.
5. **Renderer murni per bagian** — `renderPlane` (SVG `#plane` **adaptif**: `viewBox` =
   ukuran elemen aktual `clientWidth/Height`, fallback `640×440` untuk tes; grid+tick
   ber-halo putih `paint-order:stroke`; poligon RESTRAIN `var(--green-soft)`, pita
   AMBANG `polygon[data-band]` copper-soft SIMETRIS (antara `thresholdLow` &
   `thresholdTol`, kurva di tengah) + dua garis batas putus-putus copper: atas
   `data-band-top` & bawah `data-band-low` (hanya saat `tol>0`), TRIP `var(--red-soft)`;
   kurva `stroke:var(--ink)`; pickup putus-putus copper; marker `BPn` teal; warna titik
   by status via `stCol` (TRIP merah/AMBANG copper/RESTRAIN hijau); **ghost titik
   sejati** (`circle[data-true-point]` + garis putus `line[data-err-link]`) hanya saat
   `hasErr`), `renderTable`, `renderSide` (status box + readout nilai-langsung 2 grup
   `Titik uji`/`Keputusan` — TANPA kalimat ringkasan, TANPA kotak edukasi & TANPA
   footer rumus KaTeX (blok `#formulaOut` DIHAPUS: nilainya dobel dgn hero);   dua
   nilai utama sbg **hero** `div.hero-row` — **Iop (nilai keputusan)
   tampil LEBIH DULU** dgn tile ber-status (tint `--*-soft` + aksen kiri `::before` +
   chip `h-chip` berisi TRIP/AMBANG/RESTRAIN di **BARIS SENDIRI di bawah label**
   (jangan kembalikan ke sebaris label — tile sempit ±126 px memotongnya) + nilai
   berwarna status), **Irt netral**
   sbg pembanding (`--bg`, aksen `--line`, tanpa chip); baris Irt/Iop lama DIHAPUS;
   baris `Pita toleransi (tol ±N%)` menampilkan
   rentang `low – top pu` saat `tol>0`; indikator PALSU/TERLEWAT = sisipan kecil di
   baris margin kotak status), `renderWarnings` (peringatan non-blocking PRD §5.6).
   **Tooltip hover** (elemen saja, margin ±10 px): `hoverInfo(map,irt,iop)` murni →
   `{kind:'point'|'bp'|'pickup'|'curve', head, rows}` — titik memuat baris `margin %`
   (atau `dlm pita toleransi ±N%` saat AMBANG), kurva memuat rentang `pita low…top pu`
   saat `tol>0`; `#planeTip` ikut kursor — **default `display:none`, tampil via class
   `.show`** (JANGAN pakai attr `hidden`: CSS `display` menimpanya → tooltip tak pernah
   hilang — bug lama); **saat titik diseret**, tooltip DISEMBUNYIKAN saat `pointerdown`
   lalu tampil DIJANGKARKAN DI SAMPING titik (bukan ikut kursor yang tepat di atas
   titik) via helper murni `dragTipPos(px,py,tipW,tipH,boxW,boxH,gap)` — kuadran
   pertama yang muat penuh di kartu, gap 14, fallback clamp; tooltip tak pernah
   menutupi titik yang sedang digeser dan kembali ikut kursor setelah `pointerup`;
   animasi masuk `@keyframes tipIn` (fade+slide kecil, hanya restart
   bila kelas status berubah — `renderTip` bandingkan `className` dulu); aksen kiri
   warna status via class `trip`/`ambang`/`restrain` di wadah. **Panduan via ikon
   "?"** (`span.q[data-tip]`, delegasi hover → `#qTip` dgn animasi `@keyframes qIn` +
   caret) — panduan TIDAK pernah ditulis sbg teks permanen di panel; ikon `?` melekat
   pada heading/label terkait (`.qrow` yatim DIHAPUS; `errNoteQ` di heading kartu
   error, `?` slope-last di baris heading slope). Legenda di bawah kurva **4 item**
   (titik TRIP/AMBANG/RESTRAIN + sejati) — info lain sudah berlabel di kurva. Scrollbar
   tipis
   GLOBAL via `*{scrollbar-width:thin…}` + `::-webkit-*` 6px.
6. **Interaksi plot** — `pointerToPu` memakai `plane._map` (di-set renderPlane) +
   skala `clientWidth/viewBox`; elemen dekoratif SVG `pointer-events:none` (lihat
   gotcha di bawah). Seret titik = handler BERNama `planeDown`/`dragMove`/`dragUp`
   (juga `planeHoverMove` utk tooltip; di-`addEventListener` & diekspor di `API`)
   — diuji tools/ui.test.js lewat harness yang bisa memicu event (`fireEl`/
   `fireWindow`). **Batas fisis titik uji**: dgn arus ≥ 0 berlaku Iop = |i1−i2| ≤
   k·irt (k=2 utk restraint rata-rata, k=1 utk maximum) — di ATAS ray itu mustahil
   (butuh I₂ < 0). Ray `iop=k·irt` DIGAMBAR di plot (`data-feas-line` putus-putus +
   zona `data-feas-zone` + label `batas fisis (I₂ = 0)`; ikut metode restraint,
   berubah saat `setMethod`) dan **klik/seret titik DIJEPIT** ke ray oleh helper murni
   `clampFeasible(irt,iop,method)`/`feasSlope(method)` (ekspor `API`) — titik berhenti
   TEPAT di ray mengikuti kursor (tidak meluncur naik seperti perilaku lama
   `measuredToTrue` mematok I₂=0: posisi tersimpan & gambar tak sinkron — bug "batas
   invisible" dari titik 0). `hoverInfo` di zona mustahil mengembalikan
   `{kind:'feas-void', …}` (tooltip menjelaskan butuh I₂ < 0).
   **Edit titik 'calc'**: klik titik (tabel/plot) → `selectPoint`
   memuat I1/I2-nya ke `#i1/#i2` + set `P.editId` (tombol `#addPointBtn` jadi
   "Perbarui titik #N"); `commitCalcAdd` memperbarui titik itu — tanpa edit ia
   menambah titik baru.
   **Kartu Pengamatan arus sistem** (kartu ke-4, `data-card="obs"`): slider `#obsI`
   (0.2–12 pu) + prasetel (Ringan/Penuh/Fault/Berat) + toggle `#obsDyn` (saturasi
   dinamis) + `▶ #obsPlay` (ping-pong kecil↔besar). `applyObs(I)` menyalakan mode →
   `P.probe` obs (`obsI`), jejak `polyline[data-obs-path]`, perluasan sumbu
   (renderPlane), `#obsOut` live (nilai + status + ct efektif). Eksklusif dgn animasi
   sapuan: `obsStop()` / `stopAnim()` saling mematikan; `clearPoints()` juga
   mematikan mode.
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
  menghitung `{irt,iop,thr,status,margin}` thd kurva saat ini; SEMUA titik menyimpan
  arus SEJATI `{i1,i2}` — klik/seret manual membalikkannya via `measuredToTrue`
  (posisi klik = TERUKUR), titik kalkulator/skenario dari input langsung. Karena tak
  pernah ditulis, status tidak mungkin basi — jangan memperkenalkan kembali field
  cache `thr/status/margin` pada titik. Konsekuensi: error CT ikut menggeser titik
  manual; jangan "perbaiki" dengan menyimpan koordinat terukur tetap.
- **`pointer-events` SVG**: line/polygon/polyline/text diberi `pointer-events:none`
  (CSS `#plane …{pointer-events:none}`) agar klik/seret hanya kena lingkaran titik
  (`[data-point]`) atau kotak latar `[data-plot-bg]`. Jangan hapus.
- Jangan simpan state UI di luar `S` (kecuali hal sepele seperti `animTimer`).
- **Kartu kanan = nilai langsung saja**: jangan kembalikan kalimat ringkasan (`.r-sum`),
  kotak edukasi kontekstual (`#eduNote`/`renderEdu`), maupun footer rumus KaTeX
  (`#formulaOut` + CDN KaTeX DIHAPUS — nilainya dobel dgn hero) — DIHAPUS. Nilai utama
  Irt/Iop tampil sbg **hero** (`div.hero-row`) — Iop dulu (keputusan, tile ber-status:
  tint `--*-soft`, aksen kiri, chip TRIP/AMBANG/RESTRAIN), Irt netral; bukan baris
  label→nilai biasa.
- **Panduan TIDAK boleh jadi teks permanen di panel** (`.hint`, `#methodHint`,
  `#scenHint` sudah dihapus): semua penjelasan lewat ikon `span.q[data-tip]` + tooltip
  `#qTip` saat hover (delegasi `pointerover/out`, baca `dataset.tip`). Jangan menulis
  kalimat panduan baru di panel; jangan mengembalikan `#scenHint`/`#methodHint`/attr
  `hidden` pada tooltip.
- **Pusat tumpukan semua-ciut lewat padding-top, BUKAN `justify-content`** (tidak
  animatable → "blink tengah→atas" saat kartu dibuka dari keadaan semua-terciut).
  `syncCollapsedCentering` menulis `panel.style.paddingTop` (target offset dihitung
  `collapsedStackH` = tinggi tumpukan keadaan ciut) + transisi CSS `.35s ease` pada
  `.params-panel` → buka dari semua-ciut meng-glide mulus ke atas & ciut kartu
  terakhir meng-glide ke tengah. Jangan kembalikan
  `.all-collapsed{justify-content:center}`. Diuji `node tools/shoot.js --check`.
- **Keputusan 3 status** (`tripState`/`statusOf`): RESTRAIN (di bawah pita) /
  AMBANG (DI DALAM pita simetris `kurva×(1±tol/100)` — kurva sendiri termasuk
  AMBANG saat `tol>0`) / TRIP (di atas pita). AMBANG = copper
  (`var(--copper)`/`-soft`, class `.badge.AMBANG`) — warna semantik baru, jangan
  dipakai dekoratif. Margin selalu thd kurva, bukan batas pita. `tol=0` → pita
  kosong (bawah=atas=kurva), perilaku lama persis.
- **Default error NON-NOL** (`DEFAULT_ERR` 5%/5%/+10%). Jangan kembalikan default 0
  tanpa alasan kuat — itu keputusan desain (parameter sistem nyata). Tes lama yang
  butuh err=0 memanggil `zeroErrors()` eksplisit di awal suite.
- **Edit titik 'calc'**: `selectPoint` memuat I1/I2 ke kalkulator & set `P.editId`;
  `commitCalcAdd` memperbarui titik itu (tidak menambah baru). Titik manual tak punya
  I1/I2 → hanya bisa dipindah via seret.
- Label/teks SVG selalu ber-halo (`paint-order:stroke` + `stroke:var(--surface)`) agar
  terbaca di atas kurva/daerah.
- Warna pakai variabel `:root`; TRIP=merah, RESTRAIN=hijau & AMBANG=copper adalah warna
  **semantik** status — jangan dipakai dekoratif di tempat lain (helper `stCol`).

## Editing conventions

- Teks UI & dokumentasi: Bahasa Indonesia (konsisten dgn Distance Relay).
- Model 1 file; renderer murni memakai string SVG → mudah diuji lewat harness.
- Tambah fungsi baru yang perlu diuji → cukup daftarkan di **`const API`** di akhir
  script aplikasi (dekat definisinya). Harness (`tools/lens-harness.js`) hanya
  menambahkan `;global.__pub=API;` — daftar ekspor TIDAK boleh diduplikasi di harness.
  Contoh terpasang: `slopeList` (fabrik — tes membuat instance sintetis sendiri) dan
  `SL` (instance aplikasi — tes DOM melewatinya).
- File tes meng-hard-code nama HTML — update bila rename.
