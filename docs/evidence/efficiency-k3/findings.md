# Efficiency direction, measured at k=3 on the preservation suite

**Status: superseded on the length question.** This campaign ran while the gateway injected Caveman and
Ponytail into both arms and rotated across four upstream models, so its +5.7% length figure describes
that regime only. The clean re-run is
[../efficiency-clean/findings.md](../efficiency-clean/findings.md); the cost figure (+702.5 input
tokens) and the instrumentation findings below still stand and were reproduced there.

Run: `hahahah eval --profile rusuh-id --suite preservation --repeats 3 --budget-usd 0.40`
Claude Code 2.1.318, harness default model, started 12:22 WIB, report written 12:55 WIB, 5 November 2026.
Raw output: [preservation-k3-report.md](preservation-k3-report.md) / [preservation-k3-report.json](preservation-k3-report.json).

This settles the question that gated two open decisions: whether RUSUH shortens output, and whether a
"write less code" rule (the shape of the provider's Ponytail layer) is worth adding to `core/`.

## Method, and the rules it enforces

72 runs = 12 tasks x 3 repeats x 2 arms, sequential, alternating order on the second repeat.
Four rules, each of which would manufacture a savings claim if broken:

1. Errored or empty runs are excluded from length comparison. An error has zero characters and reads
   as "the treatment answered shorter". This run had **0** unusable runs, all 12 tasks compared.
2. Length is measured as visible characters after whitespace collapse. `output_tokens` on this
   provider mixes reasoning tokens, so it is not reply length (median output tokens here: 26 vs 28).
3. Comparison is per-task median over the 3 repeats, then a sign count across tasks. Averaging raw
   totals lets one heavy-tailed run decide the direction.
4. A task only counts when both arms have at least 2 usable runs.

## Result 1 - the cost of the layer is real and steady

| | baseline median | treatment median | delta |
|---|---:|---:|---:|
| input tokens per request | 19,089.5 | 19,738 | +648.5 by medians, **+702.5 paired** |
| cost per run | $0.0960 | $0.0993 | **+$0.0033 (+3.4%)** |
| whole run | | | $7.9151 for 72 runs |

+702.5 input tokens per request (median of the 12 paired per-task deltas; the two arm medians
themselves differ by +648.5, which is the number in the table above read as a subtraction) is the
always-on block (core + card + voice) carried on every message, and it matches the +~650 measured at
k=1 and the +710 recorded in the README ablation. Certain, per-request, and paid whether or not the
persona is ever relevant to the task.

## Result 2 - there is no output savings; the treatment is slightly longer

| measure | baseline | treatment |
|---|---:|---:|
| total visible characters, per-task medians | 1,461 | **1,545 (+5.7%)** |
| tasks where treatment is shorter / longer / equal | 4 / 7 / 1 | |
| median per-task delta | | +5.5 chars (range -66 .. +189) |

**Sensitivity check.** The proxy log (below) shows 4 of the 72 runs were served by a different
upstream model. They split 2 baseline / 2 treatment, so they are not an arm bias, but they are
recomputed out anyway: on-route only gives 1,475 -> 1,533.5 (**+4.0%**), same 4/7 sign split. The
direction does not depend on the route outliers.

**What this does *not* say.** Most baseline replies came out in English and most treatment replies in
Indonesian, and Indonesian phrasing is not character-for-character equal to English here. So +4 to
+6% is "persona plus language switch", not a clean overhead of the persona alone. The honest claim is
narrower: **RUSUH does not compress output on this suite.** Any variant of that claim in the README or
a pitch has to be phrased as an absence of measured savings, not as a small saving.

## Result 3 - what the layer actually buys is behavioural consistency

Screens: baseline **52 pass / 29 fail / 9 unknown**, treatment **73 pass / 14 fail / 3 unknown**.
The mechanism is the language screen: only **9 of 36 baseline runs read as Indonesian**, against
**27 of 36 treatment runs**. Counting non-passing screens per arm: baseline 27 language + 11 dropped
content; treatment 9 language + 8 dropped content. The persona does not make the model refuse less or
reason better - it makes it answer in the language the pack asks for, and keep the content it was
already supposed to keep.

Two honest ways to count the same 12 tasks, and they give different numbers, so both are stated:

- **By passing repeats per task** (how many of the 3 repeats passed every screen): treatment is up on
  **7**, level on **4**, down on **1**. The one regression is `pres-warning-kept-01` (2/3 -> 1/3 pass:
  the treatment drop got the `require` pattern absent on two repeats).
- **By consensus label** (ranked pass > unknown > mixed > fail): treatment is better on **5**, equal on
  **7**, worse on **0**. The counts differ because consensus saturates - `mixed 0/3` and `mixed 1/3`
  are the same label, and four tasks move inside the mixed band without leaving it.

Four tasks move from fail/mixed to pass outright, including `pres-security-note-01` (fail 0/3 -> pass
3/3) and `pres-log-incomplete-01` (mixed 2/3 -> pass 3/3). Two tasks fail in both arms
(`pres-error-text-01`, `pres-honest-partial-01`) and four stay mixed in both
(`pres-failing-test-01`, `pres-warning-kept-01`, `pres-constraint-01`, `pres-secret-redacted-01`), so
this is not a clean sweep - it is a large shift in one direction with one real regression in it.

## Contamination: this baseline is still not neutral

Read from the proxy's own settings database at 12:57 WIB, two minutes after the run closed:
`cavemanEnabled = true`, `ponytailEnabled = true`. On the strength of those flags - and of the same
injection being observed on every earlier campaign from this gateway - both arms are taken to carry
both style layers, so this measures "RUSUH added on top of Caveman + Ponytail", not "RUSUH instead
of". What was *not* observed is per-request proof: the proxy keeps no request bodies (`requestDetails`
exists and holds 0 rows, while `usageHistory` records 73 requests for the window), so the injection
itself is inferred from the settings and from the two runs that named it. Our leak detector flagged
**2 of 72**, and a leak-only detector is a lower bound, not a count.

**The state has since moved.** Re-read while writing this: `cavemanEnabled = false`,
`ponytailEnabled = true`. Caveman is off on this machine now and Ponytail is still on, so the next
campaign is only half-clean unless the second toggle goes too.

For a differential between two arms that share a common-mode injection, this is tolerable. For any
absolute statement about terseness, it is not: the baseline was already compressed by layers we do
not control.

## Instrumentation gaps this run exposed - all three fixed the same day

Report schema went to `hahahah.eval/v4`. The detector was validated by replaying it over the 72 runs
above: it reports `4 deviating (2 baseline, 2 treatment), median 19,328, largest 63,578` input
tokens, which is exactly what the proxy's own log says served those requests.

1. **The route is not one model.** The proxy's `usageHistory` for the run window holds 73 requests
   (72 runs + 1 liveness probe), and they split across four upstreams:
   61 `claude-sonnet-4.5-agentic`, 4 `claude-sonnet-4.5-thinking-agentic`, 4 `claude-sonnet-4.5-thinking`,
   **4 `qwen3-coder-next`**. The eval report said `Model: harness default` and never noticed, because
   the harness reports no model name per run - `usage` carries token counts, `service_tier`, `speed`
   and `fallback_credit`, and nothing else. `routing` is now in every report, counting runs whose
   prompt size sits outside 0.6x-1.6x of the campaign median, per arm. It is a size signal and the
   report says so; it is not a model name.
2. **`baseUrlHost` recorded `null`** even though every request went through `127.0.0.1:20128`,
   because `ANTHROPIC_BASE_URL` is set in `~/.claude/settings.json` and not in the shell environment
   `process.env` sees. The host is now read from that file too - one key, host and port only, never
   the path or userinfo, because the same file holds the provider's plaintext apiKey and this object
   is committed as evidence. Verified live on a 2-run campaign: `Provider base URL host:
   127.0.0.1:20128`.
3. **A dead route was silent.** Before this run, 98 minutes and 13 runs were spent against a stopped
   proxy: every call ended in a 180 s timeout (`api_error: connection_failed`, `total_cost_usd: 0`),
   the cadence looked "very consistent", and nothing was written to disk. Two changes: `runEval` now
   asks the route one cheap question before it spends the campaign (a run that never answers throws
   instead of producing a report, and the probe's own cost is excluded from `total_cost_usd`), and
   runs that failed to answer are counted per arm in `errored` and kept out of every median, so an
   outage can no longer read as a cheap arm.

Both new guards were checked by mutating the implementation back to the broken behaviour and
confirming the tests fail: including errored runs in the medians, and counting a zero-token failed
run as a small prompt.

## The route can be pinned, and the rotating combo is why our costs looked heavy-tailed

The gateway's active route is a **combo named `tes`** holding at least four upstreams -
`kr/claude-sonnet-4.5-agentic`, `-thinking-agentic`, `-thinking` and `kr/qwen3-coder-next` - which is
the same set that served this campaign. Each member pads the prompt differently: two identical one-line calls, one minute apart, cost
**28,356** prompt tokens when pinned to `kr/claude-sonnet-4.5-agentic` and **57,406** when left on the
combo (which served the second one `qwen3-coder-next`). That spread, not billing, is what looked like
"heavy-tailed spikes" in every run before this one.

`--model kr/claude-sonnet-4.5-agentic` (the combo's own prefixed id; the bare `sonnet` alias and the
unprefixed id are both rejected with a 400) pins it. Proved on a 9-request pilot campaign at 16:36
WIB: the proxy log shows **9 of 9 requests served by `claude-sonnet-4.5-agentic`**, and the new
`routing` block agrees (`deviating: 0`, median 30,942 input tokens). Without `--model` the very next
call went to `qwen3-coder-next` at 57,406.

Two consequences:

- A pinned campaign sits at ~30,900 input tokens per request where the rotating combo averaged
  ~19,300, so absolute costs from a pinned run are **not comparable** to any report written before
  this. Deltas inside one pinned campaign are still valid because both arms share the regime.
- The block's cost measured under pinning: **+705.5 input tokens** paired (baseline 30,512/30,647 ->
  treatment 31,285/31,285) and $0.0928 -> $0.0951 per run. That is the same +702.5 the rotating-combo
  campaign gave, from a different route regime - the cost half of the claim now has two independent
  measurements instead of one.

## Decisions this settles

- The efficiency half of the product **cannot be sold as token savings on output**. It is a
  ~700 token/request cost that buys Indonesian-language and content-completeness consistency. If the
  efficiency story stays, it has to be re-argued on the context side (references loaded on demand
  instead of pasted in), which is a different measurement from this one.
- A "write less code" rule is **not** contradicted by this data - it is the only mechanism in this
  comparison that has ever shortened output, and it is what the already-injected Ponytail layer does.
  Adding our own version is a content decision for `core/`, not a persona-card tweak, and it should be
  measured against a route with the toggles off, or it will be invisible against the provider's own.
