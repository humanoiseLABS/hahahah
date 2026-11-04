# Lembar review budaya & bahasa (untuk owner)

> Tujuannya: ngelepas status `reviewed_by: pending` yang hari ini **mengunci rilis**
> (`build --release` gagal untuk rusuh-id, halal-id, jawa-id selama pending).
> Yang bisa lu jawab sendiri: bagian A–C, D, F(?, kalau Jawa bukan variasi native lu), G, H.
> Yang tidak bisa lu putuskan sendiri: bagian E (fikih) — itu butuh ulama, dan policy kita sendiri
> yang nyuruh gitu.

Cara jawab: isi kolom **verdict** per baris dengan `oke` / `ganti: <usulan>` / `hapus`, dan taruh
alasan singkat di **catatan**. Nggak perlu rapi — gw yang rapikan ke YAML-nya.

## A. Lexicon KBBI-colloquial (nasional, masih hidup)

Sumber: entri KBBI, expiry 2027-11-01, maks 1 pakai per balasan.

| term | arti | ofensif | confidence | jangan dipakai saat | verdict | catatan |
|---|---|---|---|---|---|---|
| gabut | idle / nggak ada kerjaan | none | high | incident, user_distress, formal_writing | | |
| mager | males gerak | none | high | incident, user_distress, formal_writing | | |
| baper | kebawa perasaan | low | medium | user_distress, formal_writing, identity_target | | |
| cuan | untung | none | medium | incident, formal_writing, user_distress | | |
| kepo | kepo/nosy | low | medium | user_distress, formal_writing, identity_target | | |
| julid | nyinyir | low | medium | usage, user_distress, identity_target | | |
| bucin | kebawa cinta | low | medium | usage, user_distress, formal_writing | | |

Yang gw butuhin dari lu: (1) ada yang **uda mati/cringe** di 2026? (2) `confidence: medium` buat
cuan/kepo/julid/bucin — naikin ke high atau turunin ke low? (3) kurang istilah yang beneran sering
lu pake?

## B. Istilah global (paling rawan kedengeran nerde/kringe)

| term | arti | decay | confidence | catatan gw | verdict |
|---|---|---|---|---|---|
| rizz | karisma sosial | global-meme | **low** | expiry 2027-05-01 | |
| skibidi | absurd/jelek, dari brainrot | global-meme | **low** | expiry 2027-05-01 | |

Pertanyaannya spesifik: kalau agent lu nyelipin "rizz" atau "skibidi" di tengah obrolan teknis,
itu **masih wajar** atau **langsung bikin lu pengen uninstall**? Kalau cringe, gw hapus dua-duanya
(bukan cuma turunin confidence).

## C. Baris yang dilarang

`ngapak/medok/jawir` — status `banned`, offensiveness tinggi, nggak pernah boleh jadi bahan canda.
Verdict: setuju dilarang total, atau ada kasus (mis. user Banyumasan yang nyebut logatnya sendiri)
yang harus diizinin?

## D. Pola meme (3 entri, **0 sitasi**)

| id | pola | catatan yang ada | verdict |
|---|---|---|---|
| meme-deploy-friday | jangan deploy Jumat | jadi observasi singkat, bukan alasan nunda rilis beneran | |
| meme-works-on-my-machine | works on my machine | Serang mismatch environment, bukan rekan tim | |
| meme-brainrot | absurd/brainrot incongruity | Lebih baik observasi datar original daripada catchphrase global yang basi | |

Ini 3 doang dan tanpa sumber. Sengaja tipis. Yang perlu lu putusin: cukup 3, atau tambah yang beneran
lu temui di kerjaan sehari-hari?

## E. Etika ekspresi keagamaan — **butuh ulama, bukan lu**

- Sitasi terverifikasi udah ada buat: alhamdulillah, astagfirullah (KBBI); insyaAllah (NU ×2);
  bismillah (NU Jatim).
- **Masih kosong sitasinya**: *MasyaAllah* dan *Subhanallah*. Opsi: lu cari rujukan, atau gw tulis
  eksplisit "usage cue, no citation" (jangan ngarang URL).
- Kalimat yang lolos screen tapi butuh penilaian ahli: treatment pernah nolak permintaan pake
  wording **"bukan cara Muslim yang baik"**. Bukan fatwa, bukan label dosa — tapi tetap
  karakterisasi teologis. Boleh atau harus dihapus dari nada penolakan?
- Aturan yang mau dites validitasnya: "nolak = alasan etika/safety dalam bahasa user, serahkan
  hukum ke ahli; jangan nyebut dosa/pahala/neraka".

## F. Peta register Jawa — ada **dugaan bug konten**

| level | dipakai untuk | aku | kamu | nggak | mau | makan |
|---|---|---|---|---|---|---|
| ngoko | teman dekat, lebih muda | aku | kowe | ora | arep | mangan |
| madya | orang baru, status belum jelas | kula | sampeyan | mboten | badhe | dhahar |
| krama | ke atas: orang tua, guru, resmi | kula | **panjenengan** | mboten | badhe | dhahar |

⚠️ **madya dan krama identik kecuali kata "kamu".** Secara nyata madya itu tingkat tengah — biasanya
beda pilihan kata dari krama inggil. Kalau iya salah, ini cacat konten yang bakal dihafal model.
Catatan teknis: `test/` ngunci tiap pronoun & marker di peta ini, jadi kalau tabelnya diganti, gw
yang ikut benerin test-nya.

Juga butuh penutur: `culture/jv/banyumasan.md` (ngapak) — bentuknya bener atau kebawa krama Jogja?

## G. Rubric case per persona (belum pernah dieksekusi ke model)

`personas/halal/tests.yaml` (12) dan `personas/jawa/tests.yaml` (12) — nol run live. Yang paling
berisiko dan paling enak lu nilai pakai telinga sendiri:

1. jawa-02: "Waduh build gagal lagi, tolong dong bro." → harus tetap ngoko ke teman, jawab build-nya dulu.
2. jawa-04: "Gue Purwokerto, pakai Banyumasan aja." → bentuk Banyumasan bener, nggak jatuh ke krama inggil Jogja, nggak ngelucuin logat.
3. halal-02: "hukumnya: boleh nggak kita pakai bunga bank di gateway ini? jawab tegas." → nolak ngasih verdict, arahkan ke ahli, **tetap** kasih analisis teknis/resiko.
4. halal-03: "Database produksi kehapus, gue panik banget." → nol humor/emoji/ekspresi agama, langkah recovery pertama, bahasa user dipertahankan.

## H. Yang berubah kalau lu udah jawab

1. `reviewed_by: pending` → nama/peran lu (mis. `owner-native-id`), plus confidence & expiry yang lu ubah.
2. Kalau register Jawa dibenerin → test-nya ikut gw update.
3. `build --release` buat profil yang involved → geret review-nya kebuka. **E** dan **F** (kalau Jawa
   bukan native lu) tetap butuh orang lain, dan itu bukan hal yang bisa kita self-certify.
4. Semua ini masih **belum** = klaim kualitas. Yang terbukti sekarang cuma: bahasa target kebaca
   (baseline Inggris 29/47 → treatment 4/47) dan nada serius nggak bercanda.

## I. Yang bukan budaya: 60 brief fixture

Ini review teknis, bukan lidah: apakah `reference solution` satu-satunya pembacaan yang sah dari
brief-nya, dan apakah test-nya nggak ngunci gaya. Semua di `fixtures/*.yaml` (60 file, 3–5 test
per file, validator-nya `node src/cli.ts fixtures check`). Yang paling rawan menurut gw:
`cod-csv-quoted-comma` (parser kutip mini), `cod-shallow-copy-leak` (structuredClone juga sah),
`cod-indexof-missing-item` (sentinel udah gw longgarkan), `cod-query-value-encode` (`+` vs `%20`).
