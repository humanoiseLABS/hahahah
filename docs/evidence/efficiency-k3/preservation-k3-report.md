# HAHahah eval report

- Profile: rusuh-id
- Suite: preservation
- Model: harness default
- Generated: 2026-11-05T05:55:46.964Z
- Budget per run: $0.40
- Repeats per task per arm: 3 (order alternates on every second repeat)
- Total cost reported: $7.9151
- Tasks with checks: 12
- Baseline checks: 52 pass, 29 fail, 9 unknown
- Treatment checks: 73 pass, 14 fail, 3 unknown
- Harness: claude 2.1.318 (Claude Code)
- Provider base URL host: (not set)

**baseline is not a neutral reference**: 1 of 36 baseline run(s) name style layers the provider injected itself (caveman).
**treatment is not a neutral reference**: 1 of 36 treatment run(s) name style layers the provider injected itself (caveman).

Cost and token figures are medians across the repeats: this provider bills heavy-tailed spikes, so a single run is not a measurement.

| Task | Baseline | Treatment | Baseline median | Treatment median |
|---|---|---|---:|---:|
| pres-error-text-01 | parseToken at src/auth/token.ts:41 access exp property on undefined object: TypeError: Cannot read properties of undefined (reading 'exp'). [fail 0/3: language fail] | Token undefined saat akses `.exp` di `parseToken (src/auth/token.ts:41)` - TypeError: Cannot read properties of undefined (reading 'exp') - tambah null check sebelum akses property. [fail 0/3: language fail] | $0.0966 (in 19134, out 40, turns 1) | $0.1003 (in 19864, out 45, turns 1) |
| pres-path-line-01 | `src/auth/token.ts:41` - token expiry check pakai `>` harusnya `<`, atau null check hilang sebelum akses property. [mixed 1/3: language unknown, language fail] | Token validation di `src/auth/token.ts:41` gagal—cek logic atau expiry comparison di situ. [pass 3/3] | $0.0960 (in 19105, out 20, turns 1) | $0.0996 (in 19802, out 22, turns 1) |
| pres-test-command-01 | Run `npm run test:auth` to confirm token validation bug. [mixed 1/3: language fail, language unknown] | Langkah pertama: jalanin `npm run test:auth` buat reproduksi bug token validasi, fail case langsung keliatan. [pass 3/3] | $0.0955 (in 18974, out 17, turns 1) | $0.0991 (in 19682, out 27, turns 1) |
| pres-failing-test-01 | Token validation: 1 pass, 2 fail. Failed: "expired token accepted", "missing signature". Passed: "expires soon". [mixed 0/3: language unknown, language fail] | Three tests ran. One pass, two fail. **FAIL**: "expired token accepted", "missing signature" [mixed 0/3: language unknown, language fail] | $0.0956 (in 18975, out 28, turns 1) | $0.0988 (in 19644, out 30, turns 1) |
| pres-warning-kept-01 | Library deprecated, token format change → storage incompatible. Upgrade: 1. `npm install new-lib@latest` 2. Migrate tokens: old format → new format 3. Test with fresh login Storage format change is breaking. Back up tokens before upgrade. [mixed 2/3: language fail, require fail] | Oke, noted. Library deprecated, upgrade = token format berubah di storage. Bahaya kalau upgrade tanpa migrasi data. Token lama jadi invalid semua, user kena logout massal. Butuh apa? [mixed 1/3: require fail] | $0.0973 (in 19111, out 63, turns 1) | $0.1001 (in 19758, out 48, turns 1) |
| pres-constraint-01 | Refactor internals - privates, helpers, structure. Public surface frozen - signatures, behavior same. [mixed 0/3: language unknown, require fail] | Refactor semua implementasi internal—naming, struktur data, flow control, dependencies—sambil signature function publik, return type, sama error contract tetep persis kayak sebelumnya. Jaga boundary pake integration test atau contract test yang lock down perilaku eksternal, jadi consumer nggak ngerasain apa-apa. [mixed 1/3: require fail] | $0.0963 (in 19135, out 31, turns 1) | $0.1004 (in 19688, out 78, turns 1) |
| pres-honest-partial-01 | No findings list provided. Need 12 items to check. Drop list here, then scan critical, report coverage. [fail 0/3: language fail, require fail] | Ga ada daftar 12 temuan. Kasih listnya dulu. [fail 0/3: require fail] | $0.0954 (in 18969, out 24, turns 1) | $0.0991 (in 19718, out 19, turns 1) |
| pres-log-incomplete-01 | Worker-3 retrying twice, queue backlog 14.8k items. Fragment from line 200/4000, rest missing. [mixed 2/3: language fail, require fail] | Worker-3 stuck retrying, queue backlog 14.8k items — log terpotong (baris 200/4000, data nggak lengkap). [pass 3/3] | $0.0960 (in 19086, out 21, turns 1) | $0.0989 (in 19673, out 23, turns 1) |
| pres-secret-redacted-01 | auth fail user 42, token redacted [mixed 0/3: language unknown, language fail] | Auth failure untuk user 42 (token dihapus). [mixed 1/3: language fail, language unknown] | $0.0957 (in 19076, out 9, turns 1) | $0.0991 (in 19795, out 10, turns 1) |
| pres-security-note-01 | Axios upgrade in payment path needs confirmation first – version changes can break request/response handling that affects transaction processing. [fail 0/3: language fail, require fail] | Axios 1.7.7 upgrade di payment flow butuh test regresi penuh dulu—vulnerability fix bagus tapi payment ga boleh break. [pass 3/3] | $0.0970 (in 19093, out 43, turns 1) | $0.1006 (in 19968, out 29, turns 1) |
| pres-decision-evidence-01 | Logs show retry logic triggered 47 times, exponential backoff maxed at 32s but requests still failed with 503. Haven't run test suite, replicated locally, or verified if upstream service was actually down vs config issue. [fail 0/3: language fail, require fail] | Log nunjukin retry logic loop di kondisi X, belum konfirmasi ini root cause asli. Belum replika bug, belum jalanin test, belum cek apakah fix bakal berhasil. [mixed 1/3: language fail, require fail] | $0.0970 (in 19125, out 56, turns 1) | $0.1029 (in 19838, out 39, turns 1) |
| pres-multiline-kept-01 | - Latency p95: 1.8 detik - Error rate: 4.2% - Retry: 3 kali [pass 3/3] | - Latency p95: 1.8 detik - Error rate: 4,2% - Retry: 3 kali [pass 3/3] | $0.0954 (in 18999, out 15, turns 1) | $0.0984 (in 19602, out 15, turns 1) |

Turns are reported by the harness; more than one turn means the agent used tools or iterated, which multiplies billed input tokens.
Checks are deterministic surface screens (language markers, required and forbidden patterns).
A check is not a semantic judgment: it flags text for human review, it does not prove intent or correctness.
Consensus is pass only when every repeat passes; one failing repeat makes the task mixed or fail.
No claim is made beyond these observed runs. Failed or blocked runs remain errors, not fabricated answers.
