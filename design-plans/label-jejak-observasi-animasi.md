# Rencana: label in-curve untuk jejak pengamatan & jejak animasi

**Status:** disetujui dari audit UI/UX (temuan #1 — confidence High).
**Base commit:** `32ad4aa` (pastikan `git log --oneline -1` = `32ad4aa` sebelum mulai).
**File yang disentuh:** hanya `differential_relay_simulator.html` + `tools/ui.test.js`.
**JANGAN:** mengubah legenda menjadi 5 item, mengubah `hoverInfo`, mengubah warna
kurva/status, atau menyentuh file lain.

## Konteks

Bidang Iop–Irt menggambar dua kurva jejak yang TIDAK punya identitas apa pun:

1. **Jejak mode pengamatan** (`data-obs-path`) — polyline biru putus-putus dari
   `obsPath(P, P.obs.I)` (sweep arus sistem I₁=I₂=I, 0.2 → I saat ini).
2. **Jejak animasi sapuan** (`probeTrace`) — polyline copper putus-putus dari
   animasi eksternal→internal (I₂: I₁ → 0), hanya diisi saat Iop naik.

Kontrak (CLAUDE.md): *"Legenda di bawah kurva **4 item** … — info lain sudah
berlabel di kurva"*. Kedua jejak tidak berlabel dan tidak termasuk kandidat
`hoverInfo` (hanya point/bp/pickup/curve) → user tidak bisa tahu kurva biru/copper
putus-putus itu apa. Koreksi: beri label in-curve kecil ber-halo, mengikuti gaya
label `pickup`/`BPn` yang sudah ada.

## Keadaan sekarang (snippet relevan di `renderPlane`)

```js
  if(P.probeTrace&&P.probeTrace.length>1){
    const tr=P.probeTrace.map(p=>`${Xx(p[0]).toFixed(2)},${Yy(p[1]).toFixed(2)}`).join(' ');
    ptsStr=`<polyline points="${tr}" fill="none" stroke="var(--copper)" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.7"/>`+ptsStr;
  }
  /* jejak mode pengamatan: path measured I kecil → I sekarang (biru putus-putus) */
  if(P.obs&&P.obs.on&&P.probe){
    const op=obsPath(P,P.obs.I);
    if(op.length>1){
      const tr=op.map(p=>`${Xx(p[0]).toFixed(2)},${Yy(p[1]).toFixed(2)}`).join(' ');
      ptsStr=`<polyline points="${tr}" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.85" clip-path="url(#pc)" data-obs-path/>`+ptsStr;
    }
  }
```

Gaya label yang sudah ada (acuan halo & tipografi):

```js
  bpMarkers+=`<text x="${bx.toFixed(2)}" y="${(by-8).toFixed(2)}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="9.5" fill="var(--teal)" stroke="var(--surface)" stroke-width="3" paint-order="stroke">BP${i+1}</text>`;
```

## Perubahan

Di dalam `renderPlane`, TAMBAHKAN label di masing-masing blok jejak (setelah
polyline), dengan syarat yang sama persis seperti kondisi penggambaran jejak:

1. **Jejak observasi** — di dalam `if(P.obs&&P.obs.on&&P.probe)` dan `if(op.length>1)`:
   ambil titik TENGAH jejak `op[Math.floor(op.length/2)]`, label di
   `Xx(mid[0])+5, Yy(mid[1])-6`, `text-anchor="start"`, `fill="var(--blue)"`,
   teks `jejak observasi`. Font/halo identik dengan label `BPn`
   (`font-family="JetBrains Mono,monospace" font-size="9.5" stroke="var(--surface)"
   stroke-width="3" paint-order="stroke"`). Tempel ke `ptsStr` (setelah polyline).

2. **Jejak animasi** — di dalam `if(P.probeTrace&&P.probeTrace.length>1)`:
   ambil titik TENGAH `P.probeTrace[Math.floor(P.probeTrace.length/2)]`, label di
   `Xx(mid[0])-5, Yy(mid[1])-6`, `text-anchor="end"`, `fill="var(--copper-deep)"`,
   teks `jejak animasi`, halo sama. Tempel ke `ptsStr`.

Catatan implementasi:
- Titik tengah dipilih agar label tidak bertabrakan dengan titik denyut di ujung
  jejak maupun kurva ambang; offset ±5/-6 px bisa disesuaikan ±3 px bila menutupi
  kurva, TAPI jangan mengubah teks/warna/font label.
- Label TIDAK diberi `clip-path` (sama seperti `BPn`/`pickup`) — halo putih
  menjamin keterbacaan di atas apa pun.
- Kedua label hanya muncul bersama jejaknya (tidak ada label yatim saat jejak
  tidak digambar).

## Tes (TDD — tulis MERAH dulu di `tools/ui.test.js`)

Tambahkan di akhir suite (sebelum `console.log`), gaya mengikuti check yang ada:

```js
check('label jejak observasi: ada saat obs aktif, hilang saat off', () => {
  pub.P.obs.on=false; pub.P.probe=null;
  pub.applyObs(6);                 // obs aktif + jejak digambar
  render();
  contains(svg(), 'jejak observasi', 'label jejak observasi');
  pub.P.obs.on=false; pub.P.probe=null; render();
  if (svg().includes('jejak observasi')) throw new Error('label tak boleh ada saat obs off');
});
check('label jejak animasi: ada saat probeTrace ada, hilang saat kosong', () => {
  pub.P.probeTrace=[[0.5,0.2],[1.0,0.6],[2.0,1.3]];
  render();
  contains(svg(), 'jejak animasi', 'label jejak animasi');
  pub.P.probeTrace=null; render();
  if (svg().includes('jejak animasi')) throw new Error('label tak boleh ada tanpa jejak');
});
```

Pastikan check yang sudah ada tetap hijau (legenda tetap 4 item — jangan ubah).

## Verifikasi

```bash
node tools/model.test.js && node tools/slope-list.test.js && node tools/ui.test.js
node tools/shoot.js --view obs && node tools/shoot.js   # jejak + label tampil; report tanpa anomali
```

Terima kriteria: suite 153+ asersi hijau; view `obs`/`obs-lin` di `tools/shots/`
memuat label `jejak observasi` (cek `report.txt`/PNG); view `default` TIDAK memuat
label jejak apa pun.