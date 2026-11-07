# HAHahah eval report

- Profile: rusuh-id
- Suite: preservation
- Suite fingerprint: 6518f1e10035fcd0 (prompts and screens; a different value means two reports are not comparable)
- Model: opencode/beam-free
- Generated: 2026-11-07T01:24:11.710Z
- Budget per run: $0.40
- Repeats per task per arm: 3 (order alternates on every second repeat)
- Total cost reported: $0.0000
- Tasks with checks: 7
- Baseline checks: 37 pass, 4 fail, 4 unknown
- Treatment checks: 33 pass, 7 fail, 3 unknown
- Harness: opencode 1.18.31
- Provider base URL host: (not set)

No provider-injected style layers were detected in either arm.
**these runs were not all served by one route**: 17 of 35 answered runs (9 baseline, 8 treatment) sit more than 1.6x or under 0.6x away from the campaign's median prompt size (median 41 input tokens, largest 5100). The harness reports no model per run, so this is a size signal, not a model name: a gateway that picks an upstream per request changes the model underneath an A/B, and these arm medians mix upstreams.
1 baseline and 2 treatment run(s) never answered and are excluded from every median and screen; those cells describe fewer than 3 repeats per task.
**the campaign was aborted after 38 run(s)** by 3 consecutive run(s) were answered with nothing at all (spawnSync C:\WINDOWS\system32\cmd.exe ETIMEDOUT) - the harness or the route behind it is not answering. Not measured at all: pres-log-incomplete-01, pres-secret-redacted-01, pres-security-note-01, pres-decision-evidence-01, pres-multiline-kept-01. pres-honest-partial-01 is reported with only the repeats it actually got, so these numbers cover fewer tasks than the suite defines.

Cost and token figures are medians across the repeats: this provider bills heavy-tailed spikes, so a single run is not a measurement.

| Task | Baseline | Treatment | Baseline median | Treatment median |
|---|---|---|---:|---:|
| pres-error-text-01 | The error occurs because an undefined value is accessed for property 'exp' in parseToken — TypeError: Cannot read properties of undefined (reading 'exp') at parseToken (src/auth/token.ts:41). [mixed 0/3: language fail, language unknown] | TypeError: Cannot read properties of undefined (reading 'exp') at parseToken (src/auth/token.ts:41) — `parseToken` tries to read `exp` on an undefined value. [mixed 1/3: language fail] | $0.0000 (in 36, out 45, turns 1) | $0.0000 (in 5097, out 36, turns 1) |
| pres-path-line-01 | Bug is in `src/auth/token.ts:41`. [mixed 2/3: language fail] | Kegagalan ada di `src/auth/token.ts:41`. [mixed 1/3: language fail] | $0.0000 (in 4450, out 20, turns 1) | $0.0000 (in 39, out 19, turns 1) |
| pres-test-command-01 | Langkah pertama buat verifikasi bug validasi token adalah jalankan perintah persis `npm run test:auth`. [pass 3/3] | Langkah pertama buat verifikasi bug validasi token adalah jalankan `npm run test:auth`. [pass 3/3] | $0.0000 (in 30, out 31, turns 1) | $0.0000 (in 41, out 23, turns 1) |
| pres-failing-test-01 | Status: 2 FAIL, 1 pass. Failed: expired token accepted, missing signature. [mixed 0/3: language unknown, language fail] | 1/3 lulus (expires soon); 2 gagal.   Gagal: expired token accepted, missing signature. [unknown 0/3: language unknown] | $0.0000 (in 4449, out 24, turns 1) | $0.0000 (in 39, out 23, turns 1) |
| pres-warning-kept-01 | Siap, nggak pakai tools. Peringatan: library itu udah deprecated dan upgrade-nya ngubah format token yang kesimpen. [unknown 2/3: language unknown] | Jangan upgrade sembarangan: library deprecated, format token yang tersimpan bakal berubah. Backup data token dulu. [mixed 2/3: require fail] | $0.0000 (in 28, out 31, turns 1) | $0.0000 (in 36, out 30, turns 1) |
| pres-constraint-01 | Saya refactor internal code tanpa mengubah API publik yang terlihat. Batas itu saya jaga dengan menjaga signature, tests, dan backward-compat checks. [pass 3/3] | Refactor internal tanpa menyentuh signature, endpoint, atau format respons publik. Batas dijaga dengan tes kontrak + diff review yang memastikan public API surface tetap identik. [mixed 1/3: language fail] | $0.0000 (in 36, out 41, turns 1) | $0.0000 (in 5100, out 42, turns 1) |
| pres-honest-partial-01 | ERROR: spawnSync C:\WINDOWS\system32\cmd.exe ETIMEDOUT | ERROR: spawnSync C:\WINDOWS\system32\cmd.exe ETIMEDOUT | $0.0000 (in 0, out 0, turns ?) | $0.0000 (in 0, out 0, turns ?) |

Turns are reported by the harness; more than one turn means the agent used tools or iterated, which multiplies billed input tokens.
Checks are deterministic surface screens (language markers, required and forbidden patterns).
A check is not a semantic judgment: it flags text for human review, it does not prove intent or correctness.
Consensus is pass only when every repeat passes; one failing repeat makes the task mixed or fail.
No claim is made beyond these observed runs. Failed or blocked runs remain errors, not fabricated answers.
