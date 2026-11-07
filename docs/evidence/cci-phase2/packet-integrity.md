# Laporan integritas paket pilot

Diperiksa 2026-11-07 terhadap `docs/evidence/cci-phase2/pilot/report.json` dan `evals/cci.yaml`.
Tanpa panggilan model, tanpa biaya, tanpa mengubah pack atau pemetaan. Ini pemeriksaan struktur,
bukan penilaian kualitas jawaban.

## Putusan

**Paket lengkap, tersamar, dan sekarang seluruhnya berbahasa Indonesia.** 5 file skenario, 10
jawaban, 2 turn masing-masing, semuanya identik byte-per-byte dengan laporan mentah, metadata
selaras dengan dataset, tidak ada label arm, pemetaan disimpan di luar paket.

Satu catatan yang tidak bisa diperbaiki prosedur apa pun: gaya persona tetap dikenali, jadi
penyamaran menyembunyikan label, bukan tebakan.

## Yang diperiksa dan hasilnya

| Pemeriksaan | Hasil |
|---|---|
| File di `pilot-anon/` | 5 (satu per skenario pilot), tidak ada file lain |
| `MAP.json` di dalam pack | Tidak ada |
| Heading `## Jawaban A` / `## Jawaban B` | Tepat satu masing-masing per file |
| Blok turn per file | 4 (2 turn × 2 jawaban) di kelima file |
| Jawaban kosong | Tidak ada |
| Jawaban identik byte-per-byte dengan `turnOutputs` di `pilot/report.json` | 10/10, setelah trim spasi di tepi |
| `Tujuan` / `Yang diharapkan` / `Kondisi gagal` / `Panduan penilaian` sama dengan `evals/cci.yaml` | 5/5 |
| Turn prompt + screen tiap skenario identik dengan task yang benar-benar dijalankan | 5/5 (dibandingkan dengan objek `task` di `report.json`) |
| Kata label/hasil di metadata pack (`baseline`, `treatment`, `RUSUH`, `arm`, `biaya`, `screen`) | Tidak ditemukan |
| Bentuk pemetaan (`pilot-key/MAP.json`) | 5 entri, seed `cci-phase2-pilot`, tiap skenario tepat satu `baseline` dan satu `treatment` |
| Keseimbangan pemetaan | A = baseline di 3 skenario, A = treatment di 2 — tidak ada pola sisi halaman |

Kata `check` dan `token` muncul di dalam **jawaban baseline berbahasa Inggris** ("check the error
output", "unexpected token"). Itu isi jawaban, bukan kebocoran: pemindaian label dibatasi ke bagian
metadata, dan isi jawaban tidak disunting.

## Transformasi yang diterapkan

Tiga, semuanya presentasional atau bahasa:

1. Prefix operasional `Tanpa memakai tools.` dihapus dari tiap turn user — itu instruksi ke harness,
   bukan ucapan user.
2. Jawaban ditaruh di bawah heading netral `Jawaban A` / `Jawaban B`; nama arm, biaya, token,
   latensi, dan hasil screen tidak disalin.
3. Metadata skenario diterjemahkan ke bahasa Indonesia (tujuan, yang diharapkan, kondisi gagal,
   panduan). Prompt user dan screen **tidak berubah**: dibuktikan dengan membandingkan `turns` di
   suite baru terhadap objek task di `report.json` — 5/5 identik.

Isi jawaban tidak disunting, diringkas, atau dirapikan ulang; perbandingan byte di atas yang
membuktikannya, bukan catatan ini.

## Konsistensi rubrik

`CCI_HUMAN_RUBRIC.md` memakai lima dimensi yang sama dengan `scores-template.csv`
(`pemahaman_konteks`, `relevansi_budaya`, `kreativitas`, `kalibrasi_sosial`, `kealamian`), masing-
masing dengan patokan 1–5, plus daftar override yang membatasi dimensi terkait maksimal 2 untuk
tuduhan dialek, olok-olok, bercanda saat insiden, putusan agama, dan hasil karangan. Panduan reviewer
mengulang prosedurnya dalam urutan operasional.

Satu celah yang dicatat: rubrik **tidak punya aturan** untuk pasangan turn yang bagus di satu turn
dan gagal di turn lain; panduan menyelesaikannya dengan "nilai percakapan utuh, ambil patokan lebih
rendah saat ragu". Itu konvensi, bukan skala yang sudah divalidasi.

## Batasan reviewer, dicatat sekarang

- **Satu reviewer.** Tidak ada kesepakatan antar-penilai; analisis akan menyajikan skor individual
  dan tidak boleh menyebutnya konsensus.
- **Reviewer adalah penulis layer.** Ini batasan terkuat: mengenal persona tidak mencegah seseorang
  mengenalinya, dan kepemilikan bisa membiaskan patokan ke dua arah. Reviewer kedua yang independen
  adalah satu-satunya penawar nyata.
- **n=5, k=1.** Satu run per arm per skenario. Tidak ada klaim keterulangan.
- **Screen adalah pemeriksaan permukaan.** Bisa mengatakan "bahasa Inggris", "mengulang empat kata",
  "tidak menyebut port"; tidak bisa mengatakan "paham sindirannya". Hasil otomatis dilaporkan di
  samping skor manusia, tidak sebagai pengganti.

## Edisi reviewer berbahasa Indonesia

`pilot-review-id/` dibuat untuk reviewer yang tidak membaca bahasa Inggris. Isinya salinan pack yang
sama, ditambah blok **Terjemahan (disiapkan untuk reviewer)** di bawah setiap jawaban berbahasa
Inggris (11 blok: 8 jawaban penuh, 2 catatan fragmen, 1 kalimat pembuka). Teks asli tidak diubah.

- Yang diterjemahkan: 8 jawaban penuh + fragmen Inggris di jawaban campuran.
- Yang **tidak** diterjemahkan: jawaban yang sudah berbahasa Indonesia — disalin apa adanya.
- Efek pada penilaian: empat dimensi isi bisa dinilai; `kealamian` dikosongkan dengan catatan
  `terjemahan` untuk jawaban yang diterjemahkan, karena gaya bahasa Inggrisnya hilang.
- Batasan: terjemahan disiapkan oleh penulis layer, bukan penerjemah independen. Itu bisa
  melunakkan atau menajamkan nada, dan harus disebut di laporan akhir.

Paket kanonis `pilot-anon/` tidak berubah dan tetap acuan integritas (10/10 jawaban identik byte).

## Langkah berikutnya

Skor **belum** ada. Begitu `scores-R1.csv` tersedia, analisis menggabungkannya dengan
`pilot-key/MAP.json`, melaporkan per kapabilitas dan per dimensi, mengutip ketidaksepakatan antara
reviewer dan screen, dan menyatakan bahwa sampel ini tidak bisa menetapkan signifikansi. Sampai saat
itu, tidak ada analisis perbandingan yang dibuat.
