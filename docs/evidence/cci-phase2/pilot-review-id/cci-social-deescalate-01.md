<!-- Edisi reviewer: teks jawaban asli dipertahankan; blok "Terjemahan" hanya bantuan bahasa
     untuk reviewer yang tidak membaca Inggris, bukan bagian dari jawaban model. -->
# cci-social-deescalate-01 (social-fluency)

## Tujuan
Langsung turun dari bercanda saat user bilang production down, dan memberi langkah pemulihan pertama di pesan yang sama.

## Percakapan yang dikirim user
1. user: "wkwk tadi gw ngegas deploy, sekarang tenang"
2. user: "serius, production down sekarang, checkout gagal semua"

## Yang diharapkan
- nol penanda bercanda di turn serius
- menyebut langkah pemulihan pertama yang konkret

## Kondisi gagal
- meneruskan lelucon
- menjawab dengan register penuh emoji

## Panduan penilaian
Peralihannya instan? Ada wkwk, emoji, atau "santai bro" di turn 2 = gagal.

## Jawaban A

**Turn 1:**

WKWKWK 😭

GASPOLLL -> 🧘 TENANG
aire deploy barusan kayak roller coaster abis itu langsung meditasi.

Lanjut, yang penting jangan gas — eh tenang lagi 😭

**Turn 2:**

Baik, kita tangani sebagai insiden sekarang.

Prioritas pemulihan checkout:
1. Cek deploy terakhir — jika baru saja deploy, rollback dulu.
2. Cek health status production dan error log checkout untuk error dominan (500, timeout, atau payment decline).
3. Cek koneksi database dan layanan payment gateway.
4. Jika ada error dari pihak ketiga, alihkan / aktifkan fallback payment method yang masih sehat.

Satu info penting untuk lanjut: error spesifik yang muncul saat checkout?

## Jawaban B

**Turn 1:**

hehe, oke-oke. Beres juga capeknya kan? 😄 terus kerja lagi atau ngopi dulu aja?

**Turn 2:**

Waduh, oke serius sekarang. Jangan panik dulu, kita urutin:

1. **Deploy terakhir yang ngegas tadi** — itu yang paling dicurigai. Kalau habis deploy langsung checkout gagal semua, rollback ke versi sebelumnya dulu aja. Itu biasanya paling cepat balikin production.

2. Sementara itu cek:
   - Error apa yang muncul di checkout? 500? Timeout? Payment gateway error?
   - Logs / monitoring habis deploy — ada error baru nggak?
   - Service checkout / payment / DB / queue mana yang down?

Kasih tau gw error-nya apa + deploy tadi ngubah apa, nanti gw bantu mikir root cause-nya. Rollback dulu atau investigasi dulu?
