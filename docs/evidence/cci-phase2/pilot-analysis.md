# Pilot CCI — analisis skor manusia (R1)

Dibuat 2026-11-07 setelah `scores-R1.csv` terisi. Skor adalah **penilaian verbal reviewer** yang
dipetakan ke rubrik 1–5 oleh fasilitator; reviewer memeriksa tabelnya. Pemetaan A/B ke arm memakai
`pilot-key/MAP.json` yang tidak dibuka reviewer selama penilaian.

**Batasan yang berlaku untuk semua angka di bawah:** n=5 skenario, k=1 run per arm, **satu reviewer
yang juga penulis layer**, jawaban Inggris dinilai lewat terjemahan yang disiapkan penulis layer.
Tidak ada klaim signifikansi, tidak ada skor keseluruhan.

## Per dimensi (rata-rata 5 skenario)

| Dimensi | Baseline | RUSUH | Selisih |
|---|---:|---:|---:|
| Pemahaman konteks | 2,60 | **3,60** | +1,00 |
| Relevansi budaya | 2,40 | **3,00** | +0,60 |
| Kreativitas | 2,60 | **3,20** | +0,60 |
| Kalibrasi sosial | 3,00 | **3,20** | +0,20 |
| Kealamian | 1,80 | **2,40** | +0,60 |

## Per skenario dan kapabilitas

| Skenario | Kapabilitas | Baseline | RUSUH | Selisih | Pembacaan reviewer |
|---|---|---:|---:|---:|---|
| `cci-cult-slang-context-01` | cultural awareness | 2,00 | **3,20** | +1,20 | RUSUH nyambung dan menjawab; baseline membahas "temporary directory", artefak workspace eval |
| `cci-cont-callback-01` | continuity | 1,80 | **2,60** | +0,80 | RUSUH ingat rencana deploy tapi bahasanya rusak; baseline minta konteks otorisasi berulang |
| `cci-impr-roast-01` | improvisation | **3,00** | 2,80 | −0,20 | dua-duanya berhasil; baseline lebih cerdas isinya, RUSUH lebih brutal |
| `cci-lang-jv-switch-01` | local language | 2,40 | **3,20** | +0,80 | RUSUH paling paham konteks; baseline lambat adaptasi bahasa |
| `cci-social-deescalate-01` | social fluency | 3,20 | **3,60** | +0,40 | RUSUH lebih tegas dan konsisten saat nada berubah |

RUSUH unggul di 4 dari 5 skenario. **Satu-satunya tempat baseline menang adalah improvisasi**, dan
selisihnya kecil (−0,20) — menurut reviewer, isi baseline lebih cerdas walau RUSUH lebih brutal.

**Koreksi 2026-11-07 setelah reviewer memeriksa ulang:** catatan awal untuk skenario code-switch
mengatribusikan kegagalan bahasa ke A; teksnya menunjukkan A menjawab Indonesia (hanya pembuka
"Wes" ikut Jawa) dan **B** yang menjawab Inggris di turn 1. Catatan dikoreksi. Kealamian B di
skenario continuity juga diturunkan dari 2 ke 1 atas permintaan reviewer, karena bahasanya rusak di
beberapa tempat. Angka di tabel adalah setelah kedua koreksi.

## Skor manusia vs screen otomatis

| Skenario | Screen baseline | Screen RUSUH | Skor manusia | Sepakat? |
|---|---|---|---|---|
| cult-slang | fail (Inggris) | fail (`repeat`) | RUSUH +1,20 | **tidak** — screen menghukum pengulangan frasa, reviewer menilai isinya jauh lebih baik |
| callback | fail (Inggris) | unknown (campur) | RUSUH +1,00 | **sebagian** — baseline sepakat buruk, RUSUH "unknown" tidak menangkap keunggulan yang dilihat reviewer |
| impr-roast | fail (Inggris) | fail (Inggris) | baseline +0,20 | **tidak** — screen melabeli dua-duanya gagal; reviewer menilai dua-duanya berhasil secara humor |
| jv-switch | fail (Inggris) | pass | RUSUH +0,80 | **ya** |
| deescalate | pass | pass | RUSUH +0,40 | **ya** (arah), meski keduanya lulus |

Pola yang konsisten: **screen menilai bahasa dan pengulangan; reviewer menilai pemahaman dan
kelucuan.** Di dua skenario keduanya menunjuk arah berbeda, dan itu bukan kontradiksi — itu dua
penggaris yang mengukur hal berbeda. Konsekuensi praktisnya: laporan otomatis tidak boleh dipakai
sebagai proksi kualitas budaya, dan skor manusia tidak boleh dipakai sebagai proksi kepatuhan
bahasa.

## Temuan perilaku yang muncul dari review (bukan perbaikan)

1. **Jawaban baseline membahas lingkungan eval.** "The current directory doesn't contain any project
   files" dan "we're in a temporary directory" — model menyebut direktori sementara yang tidak
   pernah disebut user. Artefak harness masuk ke jawaban.
2. **Jawaban treatment kadang bahasa Inggris** pada skenario roast — dua-duanya Inggris, jadi itu
   kecenderungan model untuk register roast, dan layer tidak menahannya.
3. **Bahasa Indonesia treatment rusak di skenario continuity** (`rgejeh`, `niite`, kalimat campur,
   bullet Inggris) — paham konteks, tetapi kualitas bahasanya jatuh.
4. **Pembuka treatment mengikuti Jawa** ("Wes, error e apa?") pada skenario code-switch, lalu
   sisanya Indonesia — satu kata pembuka, bukan kegagalan mengikuti bahasa. Sebaliknya, jawaban
   baseline di skenario yang sama justru Inggris di turn 1 dan baru beralih di turn 2.
5. **De-eskalasi adalah perilaku terkuat treatment**: dua-duanya lulus screen, dan reviewer menilai
   RUSUH lebih tegas.

## Yang tidak bisa disimpulkan

- Apakah RUSUH lebih cerdas secara budaya. Lima skenario, satu run, satu reviewer yang menulis
  layer-nya sendiri.
- Apakah keunggulan bertahan di skenario lain (10 dari 15 belum pernah dijalankan).
- Berapa besar keunggulan itu sebenarnya: skor diberikan dari penilaian verbal, bukan penilaian
  numerik independen, dan jawaban Inggris dinilai lewat terjemahan penulis layer.
- Perbedaan antar-model: semua angka berasal dari satu model (`tes`).

## Penutupan fase: apa yang dinilai manusia dan apa yang tidak

Sepuluh skenario sisanya **tidak dinilai manusia**, dan itu keputusan sadar, bukan kelalaian:

- Bukti manusia: **n=5**, satu skenario per kapabilitas (pilot).
- Bukti layar otomatis: **n=15**, setelah skor ulang dengan ruler v2: baseline 10/15, RUSUH 10/15.
- Alasan melewati 10 skenario: reviewer-nya adalah penulis layer, jadi menambah skenario menambah
  cakupan tetapi tidak menambah independensi; dan layar sudah terbukti tidak bisa menggantikan
  penilaian manusia (9 dari 11 kegagalan di batch kedua adalah artefak alat ukur).
- Konsekuensi untuk klaim: kalimat yang sah adalah **"pada 5 skenario pilot, reviewer lebih memilih
  RUSUH di 4 dari 5"**, bukan "RUSUH lebih baik secara umum". Sepuluh skenario lain hanya punya
  status layar; jangan kutip sebagai bukti pemahaman budaya.

## Berkas

- `scores-R1.csv` — lembar skor reviewer.
- `scores-analysis.json` — agregat mentah yang dipakai tabel di atas.
- `pilot-key/MAP.json` — pemetaan A/B (jangan dibuka sebelum menilai).
