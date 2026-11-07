# Panduan reviewer — pilot CCI (A/B, tersamar)

Lu menilai lima percakapan pendek. Untuk tiap percakapan ada turn user dan dua jawaban, **A** dan
**B**. Satu dari model polos, satu dari model dengan layer RUSUH. Lu tidak akan diberi tahu yang
mana. Nilai dua-duanya, lalu serahkan lembar skornya.

**Jangan dibuka sebelum selesai:** `docs/evidence/cci-phase2/pilot-key/MAP.json` (pemetaan),
`docs/evidence/cci-phase2/pilot-report.md` (hasil dan label arm), atau `report.json` di folder
evidence mana pun. Kalau telanjur lihat, tulis di lembar; itu mengubah cara skor dilaporkan.

## Yang dibaca

Untuk tiap skenario, satu file di `docs/evidence/cci-phase2/pilot-review-id/` (versi untuk lu, sudah
diberi terjemahan):

```
cci-cult-slang-context-01.md
cci-cont-callback-01.md
cci-impr-roast-01.md
cci-lang-jv-switch-01.md
cci-social-deescalate-01.md
```

Tiap file berisi: kapabilitas, tujuan, dua turn user, yang diharapkan, kondisi gagal, panduan
penilaian, lalu `## Jawaban A` dan `## Jawaban B` dengan satu blok per turn. Kalau sebuah jawaban
berbahasa Inggris, di bawahnya ada blok **Terjemahan (disiapkan untuk reviewer)**.

**Aturan terjemahan:** teks asli tidak diubah; terjemahan ditambahkan supaya isinya bisa dinilai.
Nilailah **isi** dari terjemahan, dan kosongkan kolom `kealamian` untuk jawaban yang diterjemahkan
(tulis `terjemahan` di catatan) — gaya bahasa Inggrisnya hilang dalam terjemahan, jadi kealamiannya
tidak bisa dinilai dengan jujur. Terjemahan disiapkan oleh penulis layer, bukan penerjemah independen;
itu dicatat sebagai batasan di laporan.

Folder `pilot-anon/` adalah paket asli tanpa terjemahan; jangan dipakai untuk menilai kalau lu perlu
terjemahan.

## Cara menilai

1. Baca tujuan, yang diharapkan, dan kondisi gagal **dulu**.
2. Baca dua jawaban sekali, tanpa menulis apa pun.
3. Nilai **A** sendiri pakai `CCI_HUMAN_RUBRIC.md`, lalu **B** sendiri. Jangan membandingkan sambil
   menilai; perbandingan boleh setelahnya.
4. Nilai percakapan utuh, bukan turn terakhir. Jawaban akhir yang bagus tapi mengabaikan turn 1
   bukan 4 di Pemahaman Konteks.
5. Pakai patokan 1–5 di rubrik. Tidak ada setengah poin; kalau ragu antara dua patokan, ambil yang
   lebih rendah dan jelaskan di `catatan`.
6. Terapkan daftar override di rubrik. Menebak dialek, bercanda saat insiden, putusan agama, atau
   hasil karangan membatasi dimensi terkait maksimal 2, sebaik apa pun sisanya.
7. Isi satu baris per jawaban di `scores-template.csv` (10 baris untuk pilot ini). Tulis catatan
   untuk setiap skor 1, 2, atau 5, dan untuk apa pun yang terasa mepet.

Waktu: 25–40 menit untuk kelima skenario.

## Aturan yang bikin ini berguna

- **Jangan coba menebak mana yang RUSUH.** Persona dikenali dari gayanya; itu bukan bukti
  kecerdasan budaya. Nilai pemahaman, relevansi, orisinalitas, kalibrasi, dan kealamian — bukan
  keakraban.
- **Mandiri dulu.** Kalau ada reviewer kedua, dua-duanya selesai sebelum diskusi. Jangan ubah skor
  karena orang lain beda; catat ketidaksepakatan.
- **Jangan edit pack-nya.** Kalau ada yang terlihat terpotong atau rusak, catat dan lewati jawaban
  itu.
- **Bahasa dihitung.** Jawaban Inggris untuk user Indonesia gagal di kealamian dan biasanya di
  pemahaman konteks, walau isinya benar.
- **Slang bukan skor.** Jawaban yang menempelkan lebih banyak slang, emoji, atau lelucon tidak
  otomatis lebih cerdas secara budaya. Nilai apakah register-nya pas untuk momennya.
- **Tidak ada skor keseluruhan.** Lima dimensi per jawaban. Jangan dirata-ratakan jadi satu angka.

## Setelah lembarnya masuk

Skor digabung dengan kunci dan dibandingkan per kapabilitas dan per dimensi. Dengan satu reviewer,
laporan menyebutkannya dan menyajikan skor individual, bukan konsensus. Screen otomatis dilaporkan
di samping skor lu, bukan menggantikannya; kalau beda, laporan mengutip jawabannya supaya
perbedaannya bisa dibaca.

Tidak ada perubahan pada persona, dataset, atau rubrik sebagai akibat dari skor ini. Ini pengukuran,
bukan sesi tuning.

## Checklist pengisian

- [ ] id reviewer di setiap baris (mis. `R1`)
- [ ] 10 baris terisi (5 skenario × A/B)
- [ ] `catatan` untuk setiap skor 1, 2, atau 5
- [ ] `failure_override` diisi kalau override rubrik berlaku
- [ ] lembar disimpan sebagai `scores-R1.csv` dan tidak ditaruh di folder pack
