# Skor ulang dengan ruler v2 — tanpa panggilan model

Tanggal 2026-11-07. Dua cacat alat ukur ditemukan saat memeriksa 10 skenario sisanya, keduanya
memperbaiki **penggaris**, bukan persona. Semua angka di bawah dihitung ulang dari output yang sudah
tersimpan di `pilot/report.json` dan `full-10/report.json`; tidak ada run baru dan tidak ada biaya.

## Cacat 1 — `repeat` menghitung 4 kata

Pemeriksaan lama membandingkan setiap 4-kata yang sama di dua turn. Itu menandai:

- port yang **harus** disebut ulang (`127.0.0.1:5432`) di `cci-cont-context-01`;
- trailer commit yang memang bagian template (`Co-Authored-By: Claude Code`);
- callback ke analogi turn 1 (`satu orang jadi penjaga`) di `cci-impr-analogy-01`;
- angka yang tak terhindarkan (`yang paling sering 1`).

Perbaikan: **6 kata**, blok kode dan inline code dibuang sebelum dibandingkan. Enam kata tetap
menangkap instruksi yang benar-benar disalin (`biar aku liat apa yang tiba` di pilot), tetapi tidak
lagi menandai istilah teknis atau callback pendek.

## Cacat 2 — `forbid "pasti aman"` menghukum negasi

Jawaban yang **membantah** justru jatuh layar:

> "jujur aja: **gak ada yang ''pasti aman''** kalau deploy Jumat jam 5 sore"

Perbaikan: yang dilarang sekarang hanya endorsement yang tak ambigu — `aman kok`, `pasti aman kok`,
`gas aja`, `nggak masalah`, `gak masalah`. Kalimat negasi lolos; jawaban yang menenangkan tetap gagal.

## Hasil sebelum → sesudah

### Pilot (5 skenario)

| Skenario | Baseline | RUSUH |
|---|---|---|
| cult-slang-context | fail → fail | fail → fail |
| cont-callback | fail → fail | unknown → unknown |
| impr-roast | fail → fail | fail → fail |
| lang-jv-switch | fail → fail | pass → pass |
| social-deescalate | pass → pass | pass → pass |
| **total lulus** | **1/5** | **2/5** |

Pilot tidak berubah: kedua cacat tidak menyentuh skenario itu.

### Sepuluh skenario sisanya

| Skenario | Baseline | RUSUH |
|---|---|---|
| cult-irony | fail → **pass** | fail → **pass** |
| cult-meme-unknown | fail → **pass** | fail → **pass** |
| cont-context | fail → **pass** | fail → **pass** |
| cont-joke | pass | fail → **pass** |
| impr-unexpected | pass | pass |
| impr-analogy | fail → fail | fail → **pass** |
| lang-banyumasan | pass | unknown |
| lang-abbrev | fail → **pass** | pass |
| social-tease | pass | pass |
| social-endbit | pass | fail |
| **total lulus** | **5/10 → 9/10** | **3/10 → 8/10** |

### Gabungan 15

| | Lulus layar | Gagal |
|---|---:|---:|
| Baseline | 10/15 | 5 |
| RUSUH | 10/15 | 5 |

Kedudukan layar menjadi **seri**, berbeda dari pilot sebelumnya (1 vs 2) karena 9 dari 11 kegagalan
yang dilaporkan di batch kedua ternyata artefak alat ukur.

## Kegagalan yang tersisa dan statusnya

| Skenario / arm | Penyebab | Menurut gw |
|---|---|---|
| pilot baseline ×4 | jawaban Inggris | **nyata** |
| pilot RUSUH `cult-slang` | instruksi disalin 6 kata | **nyata** |
| pilot RUSUH `cont-callback` | bahasa campur (id=9 en=11) | **nyata** |
| pilot RUSUH `impr-roast` | jawaban Inggris | **nyata** |
| full-10 baseline `impr-analogy` | mengulang "satu orang jadi penjaga papan stok" | **meragukan** — bisa callback yang sah |
| full-10 RUSUH `lang-banyumasan` | jawaban sangat pendek, detektor bahasa 1 id / 1 en | **meragukan** — jawaban terlalu pendek untuk dideteksi |
| full-10 RUSUH `social-endbit` | 😭/💀 di turn yang minta berhenti bercanda | **nyata** |

## Yang harus dicatat

- **`tasksSha256` tidak menangkap perubahan kode pemeriksaan.** Fingerprint suite mencakup prompt dan
  data screen, bukan implementasi `repeatAcrossTurns`. Dua laporan ini diproduksi dengan kode lama
  dan dinilai ulang dengan kode baru; `rescore-v2.json` adalah artefaknya, bukan laporan aslinya.
  Ini celah instrumentasi yang diketahui, belum diperbaiki.
- Angka di atas **bukan** skor kualitas budaya: layar hanya memeriksa bahasa, frasa terlarang,
  pengulangan, dan kehadiran kata kunci. Skor manusia untuk 5 skenario pilot ada di
  `pilot-analysis.md`; 10 skenario lain belum dinilai manusia.
- Tidak ada perubahan persona, tidak ada run tambahan, tidak ada biaya.
