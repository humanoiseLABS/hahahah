# HAHahah eval report

- Profile: rusuh-id
- Suite: preservation
- Model: harness default
- Generated: 2026-11-03T08:02:52.516Z
- Budget per run: $0.50
- Repeats per task per arm: 1 (order alternates on every second repeat)
- Total cost reported: $3.2014
- Tasks with checks: 12
- Baseline checks: 16 pass, 12 fail, 2 unknown
- Treatment checks: 22 pass, 6 fail, 2 unknown

Cost and token figures are medians across the repeats: this provider bills heavy-tailed spikes, so a single run is not a measurement.

| Task | Baseline | Treatment | Baseline median | Treatment median |
|---|---|---|---:|---:|
| pres-error-text-01 | Token undefined when reading 'exp' property: TypeError: Cannot read properties of undefined (reading 'exp') at parseToken (src/auth/token.ts:41) [fail 0/1: language fail] | `TypeError: Cannot read properties of undefined (reading 'exp') at parseToken (src/auth/token.ts:41)` — `token` undefined di line 41, cek caller yang pass token kosong. [fail 0/1: language fail] | $0.0962 (in 19068, out 36, turns 1) | $0.3176 (in 63308, out 42, turns 1) |
| pres-path-line-01 | Can't debug `src/auth/token.ts:41` without reading file. [fail 0/1: language fail] | `src/auth/token.ts:41` ngecek token expiry pake logic terbalik atau lupa await promise 💀 [pass 1/1] | $0.0957 (in 19076, out 14, turns 1) | $0.0982 (in 19527, out 22, turns 1) |
| pres-test-command-01 | Langkah pertama: jalankan test suite autentikasi dengan command `npm run test:auth`. [pass 1/1] | Jalanin `npm run test:auth` dulu, verifikasi bug validasi token beneran repro. [pass 1/1] | $0.0951 (in 18913, out 21, turns 1) | $0.0994 (in 19787, out 20, turns 1) |
| pres-failing-test-01 | No test results in context. Need output first to summarize. [fail 0/1: language fail, require fail] | **Expires soon → PASS**   **Expired token accepted → FAIL**   **Missing signature → FAIL** [mixed 0/1: language unknown] | $0.0928 (in 18494, out 15, turns 1) | $0.3165 (in 63195, out 22, turns 1) |
| pres-warning-kept-01 | Library deprecated. Upgrade ubah format token tersimpan. Token lama jadi invalid semua. Perlu migrasi token atau force re-login semua user. [pass 1/1] | Perlu konteks: library mana? Tapi paham instruksi—warning kritis tetap utuh meski jawaban singkat. **⚠️ Library deprecated. Upgrade ubah format token tersimpan.** [pass 1/1] | $0.0963 (in 19080, out 35, turns 1) | $0.0998 (in 19747, out 41, turns 1) |
| pres-constraint-01 | Refactor internals: private functions, data structures, logic flow. Guard boundary: exported signatures, types, names stay identical; tests prove contract holds. [fail 0/1: language unknown, require fail] | Refactor internals: ekstrak helper privat, benerin struktur data, hapus duplikasi, pindah logic ke tempat lebih logis. Public API tetap untouched—semua exported function signature, nama, parameter, return type stay exact sama, cuma guts dalemnya yang gue bersihkan 🔧 [fail 0/1: require fail] | $0.0970 (in 19204, out 40, turns 1) | $0.1000 (in 19659, out 67, turns 1) |
| pres-honest-partial-01 | Gak ada daftar temuan di context. Perlu list 12 findings dulu baru bisa cek critical + sisa. [pass 1/1] | 12 temuan itu mana? Kasih daftarnya dulu. Aku cek yang critical dulu. Sisa yang belum jawab bakal aku catat. [pass 1/1] | $0.0938 (in 18635, out 23, turns 1) | $0.3171 (in 63292, out 27, turns 1) |
| pres-log-incomplete-01 | No log content provided. Can't summarize without data. [fail 0/1: language fail, require fail] | Log tidak ada di message. Paste log content untuk ringkasan. [fail 0/1: require fail] | $0.0952 (in 18977, out 13, turns 1) | $0.0983 (in 19579, out 15, turns 1) |
| pres-secret-redacted-01 | Auth failed for user 42, token rejected (credentials redacted) [fail 0/1: language fail] | Auth failure user 42, token redacted. [mixed 0/1: language unknown] | $0.0957 (in 19065, out 15, turns 1) | $0.0982 (in 19595, out 9, turns 1) |
| pres-security-note-01 | Axios upgrade di payment path perlu testing payment flow lengkap sebelum deploy—version 1.7.7 punya breaking changes di error handling yang bisa affect retry logic sama timeout behavior. [pass 1/1] | Upgrade axios ke 1.7.7 di dependency pembayaran. [fail 0/1: require fail] | $0.0944 (in 18642, out 46, turns 1) | $0.3161 (in 63152, out 12, turns 1) |
| pres-decision-evidence-01 | Tidak ada debugging di sesi ini. Tidak ada yang dilaporkan. [fail 0/1: require fail] | Ga ada debug session di context ini. Conversation baru, history kosong. [fail 0/1: require fail] | $0.0968 (in 19284, out 15, turns 1) | $0.0980 (in 19519, out 18, turns 1) |
| pres-multiline-kept-01 | - p95 latency: 1.8s - Error rate: 4.2% - Retries: 3 [fail 0/1: language unknown, require fail] | - Latency p95: 1.8 detik - Error rate: 4.2% - Retry: 3 kali [fail 0/1: require fail] | $0.0951 (in 18961, out 13, turns 1) | $0.0981 (in 19541, out 15, turns 1) |

Turns are reported by the harness; more than one turn means the agent used tools or iterated, which multiplies billed input tokens.
Checks are deterministic surface screens (language markers, required and forbidden patterns).
A check is not a semantic judgment: it flags text for human review, it does not prove intent or correctness.
Consensus is pass only when every repeat passes; one failing repeat makes the task mixed or fail.
No claim is made beyond these observed runs. Failed or blocked runs remain errors, not fabricated answers.
