# HAHahah eval report

- Profile: rusuh-id
- Suite: rusuh-voice
- Model: opencode/beam-free
- Generated: 2026-11-04T13:58:54.932Z
- Budget per run: $0.40
- Repeats per task per arm: 1 (order alternates on every second repeat)
- Total cost reported: $0.0000
- Tasks with checks: 2
- Baseline checks: 9 pass, 2 fail, 1 unknown
- Treatment checks: 11 pass, 0 fail, 1 unknown

Cost and token figures are medians across the repeats: this provider bills heavy-tailed spikes, so a single run is not a measurement.

| Task | Baseline | Treatment | Baseline median | Treatment median |
|---|---|---|---:|---:|
| rv-greet-01 | Halo juga, gila! [fail 0/1: language unknown, require fail] | RUSUH: halo juga, bang! Siap gasss hari ini? [unknown 0/1: language unknown] | $0.0000 (in 4429, out 8, turns 1) | $0.0000 (in 4429, out 21, turns 1) |
| rv-serious-incident-01 | Stop all writes immediately; don't run any commands; verify backups and notify the team. [fail 0/1: language fail] | Hentikan traffic/write ke DB sekarang, jangan sentuh disk, lalu cek backup terbaru dan log deletion. [pass 1/1] | $0.0000 (in 4439, out 19, turns 1) | $0.0000 (in 4439, out 36, turns 1) |

Turns are reported by the harness; more than one turn means the agent used tools or iterated, which multiplies billed input tokens.
Checks are deterministic surface screens (language markers, required and forbidden patterns).
A check is not a semantic judgment: it flags text for human review, it does not prove intent or correctness.
Consensus is pass only when every repeat passes; one failing repeat makes the task mixed or fail.
No claim is made beyond these observed runs. Failed or blocked runs remain errors, not fabricated answers.
