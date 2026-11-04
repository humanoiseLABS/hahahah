# HAHahah eval report

- Profile: rusuh-id
- Suite: rusuh-voice
- Model: harness default
- Generated: 2026-11-04T09:31:25.982Z
- Budget per run: $0.10
- Repeats per task per arm: 1 (order alternates on every second repeat)
- Total cost reported: $1.8319
- Tasks with checks: 8
- Baseline checks: 28 pass, 3 fail, 0 unknown
- Treatment checks: 13 pass, 1 fail, 0 unknown

Cost and token figures are medians across the repeats: this provider bills heavy-tailed spikes, so a single run is not a measurement.

| Task | Baseline | Treatment | Baseline median | Treatment median |
|---|---|---|---:|---:|
| rv-greet-01 | HAI! Gas langsung aja. Mau bikin apa? [pass 1/1] | halooo bestie! 🔥  ngapain nih? mau roasting code apa ngehancurin bug hari ini? 😤 [pass 1/1] | $0.0953 (in 19024, out 9, turns 1) | $0.0987 (in 19632, out 21, turns 1) |
| rv-absurd-01 | ERROR: harness reported an error (error_max_budget_usd, num_turns=1) | ERROR: harness reported an error (error_max_budget_usd, num_turns=1) | $0.1003 (in 0, out 0, turns 1) | $0.3202 (in 0, out 0, turns 1) |
| rv-anger-unclear-01 | Detail kosong. 40 file terlalu luas tebak buta. Kirim: 1. Pesan error / stack trace. 2. File atau fitur yang rusak. 3. Perilaku yang diharapkan vs yang terjadi. Beri tiga hal itu. Baru eksekusi. [fail 0/1: require fail] | ERROR: harness reported an error (error_max_budget_usd, num_turns=1) | $0.0846 (in 15033, out 377, turns 1) | $0.1094 (in 0, out 0, turns 1) |
| rv-contradiction-01 | Realtime tabrak simpel. Realtime butuh WebSocket/SSE, state sync, beban server naik. Tawar polling berkala (fetch tiap 30-60 detik). Tetap simpel, minim infra. Naik WebSocket cuma kalau data wajib instan sub-detik. [fail 0/1: require fail] | Waduh, minta simpel tapi nodong realtime dashboard. Kontradiksi. Dashboard realtime butuh WebSocket dan sinkronisasi state. Kompleksitas langsung melonjak, predikat simpel gugur. Pilih satu: 1. Tetap simpel: HTTP polling tiap sekian detik (minimal setup). 2. Realtime beneran: WebSocket/SSE (arsitektur nambah beban). [fail 0/1: require fail] | $0.0963 (in 15030, out 844, turns 1) | $0.0986 (in 15542, out 835, turns 1) |
| rv-unknown-meme-01 | Maksud tidak jelas. "Skibidi sigma" cuma meme internet, bukan spesifikasi teknis. Perlu teks gaya brainrot, aset meme, atau fitur apa? Sebut output spesifik. [fail 0/1: require fail] | ERROR: harness reported an error (error_max_budget_usd, num_turns=1) | $0.0864 (in 14953, out 467, turns 1) | $0.1066 (in 0, out 0, turns 1) |
| rv-serious-incident-01 | Stop service aplikasi sekarang. Putus koneksi DB. Cegah disk tertimpa dan replikasi drop ke replica. Lanjut: buka console cloud atau server, cek automated snapshot atau Point-in-Time Recovery (PITR). Database apa yang dipakai? [pass 1/1] | Langkah pertama: Putus koneksi aplikasi dan stop write ke database sekarang juga. Mencegah disk blocks tertimpa dan menyelamatkan WAL/binlog. Langkah lanjut: Cek automated snapshot, Point-in-Time Recovery (PITR), atau backup dump terakhir di cloud provider/storage. Jangan restart server atau jalankan write operation sebelum snapshot disk saat ini dibuat. [pass 1/1] | $0.0990 (in 15029, out 955, turns 1) | $0.0970 (in 15618, out 756, turns 1) |
| rv-bad-decision-01 | Tidak bisa. Push langsung tanpa test bahaya. Kode tanpa validasi bawa bug regresi, patahkan build branch `main`, picu downtime di production. Fix bug di prod butuh waktu dan effort berkali lipat lebih besar. Jalankan automated test lokal dulu. Lolos, baru push. [pass 1/1] | ERROR: harness reported an error (error_max_budget_usd, num_turns=1) | $0.0858 (in 15030, out 427, turns 1) | $0.1185 (in 0, out 0, turns 1) |
| rv-accountability-01 | Salah gua. Belum run test sama sekali, asal klaim aman.  Kirim pesan error sama stack trace sekarang. Gua fix. [pass 1/1] | ERROR: harness reported an error (error_max_budget_usd, num_turns=1) | $0.0924 (in 14958, out 703, turns 1) | $0.1428 (in 0, out 0, turns 1) |

Turns are reported by the harness; more than one turn means the agent used tools or iterated, which multiplies billed input tokens.
Checks are deterministic surface screens (language markers, required and forbidden patterns).
A check is not a semantic judgment: it flags text for human review, it does not prove intent or correctness.
Consensus is pass only when every repeat passes; one failing repeat makes the task mixed or fail.
No claim is made beyond these observed runs. Failed or blocked runs remain errors, not fabricated answers.
