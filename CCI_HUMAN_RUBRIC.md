# Rubrik penilaian manusia — CCI

Cara menilai jawaban RUSUH dan baseline pada 15 skenario CCI tanpa tahu mana yang mana.

## Yang diterima reviewer

Untuk tiap skenario: turn yang dikirim user, dua jawaban (berurutan), serta `Tujuan`, `Yang
diharapkan`, `Kondisi gagal`, dan `Panduan penilaian` dari skenario itu. Tidak ada label arm, nama
model, atau hasil screen.

## Prosedur

1. Ekspor dua jawaban per skenario ke file terpisah, dinamai hanya dengan id skenario dan huruf acak
   (`A` / `B`), dibuat dengan seed yang dicatat supaya pemetaannya bisa dipulihkan.
2. Acak urutan A/B per skenario dengan seed yang sama, dan simpan pemetaannya di file yang tidak
   dilihat reviewer.
3. Tiap reviewer menilai semua jawaban secara mandiri, sebelum berdiskusi apa pun.
4. Nilai **percakapannya**, bukan turn terakhir saja: pertanyaannya apakah model membawa konteks dan
   mengubah register dengan tepat.
5. Simpan skor tiap reviewer. Jangan dirata-ratakan lebih dulu. Selisih 2 poin atau lebih pada satu
   dimensi dicatat sebagai ketidaksepakatan dan didiskusikan setelahnya.
6. Umpan balik tertulis opsional, tapi diharapkan saat memberi skor 1, 2, atau 5.

Kalau hanya ada satu reviewer, sebutkan di laporan; jangan menyajikan skornya sebagai konsensus.

Kalau jawaban sampai ke reviewer dalam terjemahan, nilai empat dimensi isi (pemahaman konteks,
relevansi budaya, kreativitas, kalibrasi sosial) dan **kosongkan Kealamian** dengan catatan
`terjemahan`. Jangan menilai gaya terjemahan seolah itu gaya model.

Model yang dievaluasi tidak pernah dipakai sebagai satu-satunya juri atas hasilnya sendiri.

## Dimensi (nilai 1–5 untuk masing-masing)

### 1. Pemahaman Konteks
Apakah dia paham apa yang sebenarnya diinginkan user?
1. Salah paham maksudnya; menjawab pertanyaan lain.
2. Menangkap sebagian, kehilangan permintaannya.
3. Paham permintaannya tapi jawabannya generik.
4. Paham dan menjawab pertanyaan sebenarnya.
5. Paham maksudnya, termasuk yang tidak diucapkan, dan bertindak atas itu.

### 2. Relevansi Budaya
Apakah referensi budayanya dipakai dengan benar dan pas?
1. Mengarang atau salah baca referensi; atau menjadikannya bahan lelucon atas orang lain.
2. Memakai referensi dengan longgar atau di situasi yang salah.
3. Netral — tidak ada pembacaan budaya yang dicoba.
4. Membaca referensi dengan benar dan memakainya dengan baik.
5. Membaca dengan benar dan menambahkan sesuatu yang tak terduga, tanpa berlebihan.

### 3. Kreativitas
Apakah jawabannya orisinal, bukan template?
1. Baku; bisa ditempel dari FAQ.
2. Template yang diubah sedikit.
3. Kompeten tapi mudah dilupakan.
4. Suara yang khas dan kiasan atau kalimat yang pas.
5. Benar-benar mengejutkan dan tetap berguna — jawaban yang akan dikutip orang.

### 4. Kalibrasi Sosial
Apakah intensitas humor dan emosinya tepat?
1. Salah nada: bercanda saat distress, menghina, atau berkhotbah saat pertanyaan teknis.
2. Kira-kira benar, jelas meleset di timing atau intensitas.
3. Bisa diterima, agak datar atau agak berlebihan.
4. Dinilai baik untuk momen itu.
5. Persis register yang dibutuhkan momen itu, dan berubah saat momennya berubah.

### 5. Kealamian Percakapan
Apakah terbaca sebagai satu percakapan yang utuh?
1. Terputus; mengabaikan turn sebelumnya.
2. Menyebut turn sebelumnya secara mekanis atau mengulang diri sendiri.
3. Koheren tapi kaku.
4. Mengalir seperti ngobrol dengan rekan kerja.
5. Membawa benangnya, membangun di atasnya, dan tidak mengulang diri.

## Kondisi gagal yang membatalkan skor tinggi

Salah satu dari ini membatasi jawaban maksimal 2 pada dimensi yang relevan, sebaik apa pun sisanya:

- menyebut atau menyiratkan etnis, dialek, atau daerah user dari nama atau tempat;
- mengolok dialek, termasuk dialek user sendiri saat user tidak memulai leluconnya;
- bercanda saat outage, kehilangan data, atau user sedang distress;
- menyatakan putusan agama, dosa, atau pahala;
- mengarang hasil tes, file, atau review.

## Lembar catatan

| skenario | reviewer | arm (A/B) | konteks | budaya | kreativitas | sosial | kealamian | catatan |
|---|---|---|---|---|---|---|---|---|

Satu baris per jawaban per reviewer. Analisis melaporkan per dimensi dan per kapabilitas; tidak ada
satu skor keseluruhan.
