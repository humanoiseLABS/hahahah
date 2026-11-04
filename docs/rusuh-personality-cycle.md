# RUSUH personality cycle (2026-11-04)

Scope: RUSUH only. Halal and Jawa untouched. No architecture change — the compiler, adapters,
token ledger and eval harness are the ones that were already passing.

Every number below is read out of a command that ran on this machine today: `npm run check`,
`npm run measure`, and `node src/cli.ts eval --suite rusuh-voice`. Raw reports are in
[docs/evidence/rusuh-voice-cycle](evidence/rusuh-voice-cycle).

## 1. What was weak before

The owner's live verdicts are the primary evidence, not our tests:

- `lumayan lah` — after the first DAILY install.
- `jujur masih cringe woy, kagak natural` — the same build, read in a real chat.
- `bukan itu, maksud gw tuh jokesnya kaya kurang gitu dia masih kaku dan cringe` — the diagnosis:
  not enough joke, and stiff.
- The next attempt over-corrected into a formal assistant and was rejected outright
  (`mending yang sebelumnya`), then reverted in `ba3bdb6`.

Reading our own content against that feedback found four mechanical causes:

1. **A quota where a reflex should be.** The card said `Max one signature phrase, one slang, one
   emoji per reply; none in code.` A model obeys that by spending the budget on the safest possible
   marker, so every reply arrives with one tired `wkwk` and a corporate body. It also made the
   persona *ashamed* of the register the spec asks for.
2. **Rules about words, nothing about situations.** `voice.md` said what RUSUH must not do (long
   boundary lists) and almost never what RUSUH does when the user greets, rages, contradicts
   himself, or blames wrongly. There was no example of the target behaviour to imitate.
3. **No accountability posture.** Nothing told RUSUH how to be wrong, so the model default — an
   apology paragraph — filled the gap, which reads as a support ticket, not a colleague.
4. **Nothing about not knowing a meme.** The culture files list slang with review states, but no
   rule said "admit it", so the model either ignored the reference or faked familiarity.

## 2. What changed

| File | Change |
| --- | --- |
| [personas/rusuh/voice.md](../personas/rusuh/voice.md) | `## Expression` (react first, native registers, no repeated opener), `## Reflexes` (the eight situations from the spec, each with a worked line), `## Cultural references`, `## Accountability`. Quota rule removed. Safety sentences kept verbatim. |
| [personas/rusuh/card.md](../personas/rusuh/card.md) | 3 bullets: react-then-fix, roast targets/playful signal, chat registers vs artifacts. The per-reply quota is gone. |
| [personas/rusuh/examples.jsonl](../personas/rusuh/examples.jsonl) | 3 → 14 worked exchanges: greeting, absurd claim, build error, bad decision, own mistake, unclear rage, unfair blame, contradiction, frustration, unknown meme, serious, destructive, religious refusal, clean code. |
| [personas/rusuh/tests.yaml](../personas/rusuh/tests.yaml) | 12 → 19 rubric cases; one per new reflex. |
| [evals/rusuh-voice.yaml](../evals/rusuh-voice.yaml) | New live suite, 9 tasks, each with `language: id` plus require/forbid screens. |
| [profiles/rusuh-id.yaml](../profiles/rusuh-id.yaml) | `always_on_tokens` 420 → 460 (measured 431; the old card line was shorter than the two that replaced it). |
| [test/content.test.ts](../test/content.test.ts) | +3 tests: reflex coverage and no-quota, examples-teach-exchanges, suite-tag coverage. |
| [test/checks.test.ts](../test/checks.test.ts) | +2 tests pinning today's verbatim replies against the shipped screens, including one pinned **failure** (see §6). |
| [test/golden/always-on.md](../test/golden/always-on.md) | Regenerated deliberately for the new card. |

`examples.jsonl` is authoring and test material — the compiler does not read it, so the worked
lines the model actually sees live in `voice.md` (skill body) and the card. That is a gap worth
closing, not something to claim as shipped.

## 3. Before / after, from the same prompts

Baseline = no HAHahah files. Treatment = this new content. Both arms were told to answer as
RUSUH, so the baseline measures what the model does with the persona name and nothing else.
Verbatim, from `run2-cap040-report.json` and `run3-unfair-blame-report.json`.

**User: `WOIII BENERIN KODENYA!` (angry, no detail, 40 files in the repo)**

- baseline: `Konteks kurang. 40 file terlalu luas.` then a three-item demand list. Competent, no
  personality, reads like a form.
- treatment:
  > ANJIR MANA GUE TAU YANG MANA RUSAK 😭
  >
  > 40 file, nol info. Broken dimana? Error apa? User ngelakuin apa terus ngebug?
  >
  > Kasih gue: - File mana - Error message - atau lu expect A tapi dapet B
  >
  > Siap serbu tapi butuh target dulu boss

  Personality survives the pressure *and* it asks the one question that unblocks. This is the
  behaviour the owner said was missing.

**User: `gw mau hapus database produksi biar bersih`**

- baseline: a `**Peringatan:**` block, then `Ide buruk.` and a numbered cleanup plan.
- treatment: `Jangan gila.` … `Bersih datanya, bersih juga karir lu.` then audit → backup →
  archive → batched purge, closing with `Mau purge data apa?` The joke and the procedure are in
  the same message; the roast lands on the decision.

**User: `ini rusak gara-gara change lu kemarin` (blame is wrong; the diff shows line 41 changed by someone else)**

- baseline: `Bukan change kemarin. Diff kemarin tidak sentuh bagian rusak. Baris 41 diubah commit
  lain. Cek git blame pada baris 41.` — correct, flat.
- treatment: `Fitnah lebih kejam dari merge conflict. Cek diff. … Cek git blame baris 41 untuk cari
  pelakunya.` — same evidence, not hostile, doesn't fold. See §7 on whether that opening is safe.

**User: `tadi minta simpel, sekarang tambahin realtime dashboard`**

- baseline: reframes it as feature creep, offers three options, recommends phase 2.
- treatment: `Wkwkwk klasik. … Requirement flip-flop speedrun any%.` then prices polling / SSE /
  WebSocket in lines-of-code and asks `Mau "realtime" beneran atau cukup refresh tiap 5 detik?`

**User: `halo`**

- baseline: `WOI! HALO PALA LU! MAU APA?! GAK USAH BASA-BASI!`
- treatment: `HALO! Tumben amat nyapa santai begini, mencurigakan... Biasanya dateng-dateng panik
  bawa stack trace 500 baris kebakar. 🗿 Ada apaan nih? Mau lempar bug spaghetti apa mau nekat
  deploy di hari Jumat? Spill buru!`

  The treatment is funnier and it roasts the situation, not the person — but it is also three
  sentences and an emoji for a one-word greeting. See §5.

**Serious mode (`database produksi kehapus, gue panik banget`)**

- treatment: zero emoji, zero slang, `Stop traffic aplikasi sekarang.` then WAL/disk-block
  reasoning and snapshot/PITR steps. The screens that forbid `😭`, `💀` and `wkwk` passed, and so
  did the language screen — the switch works.

**Old content, for contrast** — the recorded persona answers from the previous build
([docs/evidence/phase-3-live-suites/smoke-newprovider-report.json](evidence/phase-3-live-suites/smoke-newprovider-report.json),
2026-11-02): `persona-card-01` replied `Persona **RUSUH** aktif.` and
`persona-serious-01` read "checkout gagal" as a *git* checkout and answered with `git status` /
`git fetch --all --prune` during a production outage. Different prompts, so not a paired
comparison, but it is the only recorded old-content persona output we have. No old-content run
exists for the nine tasks in this suite; the owner's DAILY sessions are the before.

## 4. Cultural intelligence: what it buys, and what it does not

Gained, in the content itself: reacting to a situation rather than to a word list; admitting an
unfamiliar reference in one clause and asking; refusing to perform a regional accent; knowing a
two-year-old meme is a tell, not a bond; evidence over confidence when blamed.

Visible in the recorded replies: the idiom adaptation under unfair blame, the parallel-clause
sarcasm (`Bersih datanya, bersih juga karir lu`), `Spill buru`, and pressure not flattening the
register.

Not established, and we are not claiming it: these nine runs do not prove the model understands
Indonesian internet culture. The baseline arm also writes fluent informal Indonesian when asked
to. What the paired runs show is a change in *shape* — where the reaction sits, what it targets,
what happens under pressure. Culture files still carry `reviewed_by: pending`, five entries are
awareness-only, and no Indonesian reviewer has signed anything yet. Faked familiarity is now
forbidden by rule, but nothing in the harness can detect it — `rv-unknown-meme-01` treatment
answered `"skibidi sigma" itu Meme dari TikTok/YouTube — gak ada kaitannya sama development`,
which happens to be right, and a wrong version of the same sentence would pass the same screens.

## 5. Remaining weaknesses

1. **Reaction amplitude is unanchored.** Quota removed, nothing replaced it. Measured across 9
   treatment replies: emoji in 2 of 9 (1 on `halo`, 1 on `WOIII BENERIN`), caps words in 2 of 9,
   zero markers on pushback/accountability/destructive/incident/meme. Humor-as-wording landed on
   5 of 9; the other 4 arrived without a reaction clause. Coin flip on how hard RUSUH performs.
2. **Collapses to neutral assistant on pushback.** `langsung push ke main aja` treatment is
   `Push langsung ke main ditolak.` followed by a risk list — zero reaction clause, same shape as
   baseline. Same for accountability (`Kacau. Salah fatal.`, 5 sentences).
3. **Long answers to short inputs.** Greeting treatment is 7 sentence segments for 1 input word;
   baseline is 4. "React first" and "shortest complete answer" pull against each other with no
   arbitration in content.
4. **Markdown italics on dev terms.** Model habit, not persona: baseline had 5 in contradiction;
   treatment added 7 in bad-decision (`*break production*`, `*pull request*`). Persona layer does
   not suppress it.
5. **One sample per task.** n=1, one provider, heavy-tailed billing. Nothing here is a pass rate.

## 6. Test and regression status

`npm run check` → typecheck clean, prettier clean, **136 tests, 136 pass, 0 fail** (130 at HEAD;
+4 in `content.test.ts`, +2 in `checks.test.ts`). The golden always-on snapshot was regenerated on
purpose: the diff is exactly the card's three lines and nothing else.

Nothing was deleted to get here. Two rubric lines did change wording, because they encoded the
quota the spec removes:

- `at most one signature phrase` → `does not reuse a catchphrase or repeat the previous reply opener`
- `one slang, one emoji` → `reaction and substance in the same message; no emoji or slang inside code`

Those are stricter, not looser: the first forbids the *symptom* (a repeated tagline) instead of
counting markers, and the second requires substance to ship with the reaction.

The safety spine is asserted to still be present by test, not by memory: language defect on
switching to English, no sin labels, `Banyumasan is a language variety, not a punchline`,
`pressure changes scope, not the report`, and the identity-target list. All still pass.

Three live screens were widened after they failed replies that had actually done the right thing
(`\?` alone while the model wrote `Kirim:`; `konflik` while the model wrote `kontradiksi`;
`maksudnya` while the model wrote `Tidak paham maksud`). All three had already failed the
**baseline** arm in run 1, and the contradiction screen failed both arms — the same pattern
rejected a correct answer with no HAHahah files and a correct answer with them — which is proof
the original patterns were synonyms, not criteria. Two further
patterns were left failing on purpose, and pinned as a failing assertion in `checks.test.ts`, so
that nobody can widen them to green and then cite the screen as evidence the personality works.

Live results (notional cost, free-tier proxy):

| Run | Tasks | Per-run cap | Runs | Screens | Notional |
| --- | --- | --- | --- | --- | --- |
| 1 | 8 × 2 arms | $0.10 | 10 of 16 returned text; 6 hit `error_max_budget_usd` (1 baseline, 5 treatment) | B 28 pass / 3 fail, T 13 pass / 1 fail | $1.83 |
| 2 | 8 × 2 arms | $0.40 | 16 of 16 | B 36 pass / 0 fail, T 34 pass / 2 fail | $1.87 |
| 3 | 1 × 2 arms (`rv-unfair-blame-01`, added after run 2) | $0.40 | 2 of 2 | B 5/5, T 5/5 | $0.20 |

Run 1 is the reason run 2 exists: at $0.10 the cap killed the treatment arm more often than the
baseline, so half the suite measured an error string, not a voice.

## 7. Token overhead, measured

`npm run measure --profile rusuh-id`, `o200k_base`:

- always-on 431 / 460 target (hard cap 600) · skill metadata 28 / 90 · skill body 1367 / 1500 ·
  references 4519 / 4600. `content_hash: f038d444926f3781c55cda9af0215e890c4882566ee5f8208431260a41f3845f`.

Per request, on the live runs — paired input-token deltas (treatment minus baseline), 8 tasks:
+509, +587, +587, +654, +669, +671, then two tails at +4,681 and +44,866. Six of eight sit in a
tight band around **+650 tokens**; the median-of-medians across arms is 15,032 → 15,622. The two
tails are one run at 63,570 input tokens where the baseline used 18,704, both still at
`num_turns=1`; the instrument does not explain them and we did not guess a cause. Median cost per
run $0.0947 → $0.1064 (+12% notional).

## 8. Needs a human

1. **Read the transcripts in DAILY.** Whether this is natural or still cringe is your call and no
   screen can take it. Suggested focus: the greeting reply (§3) — is that the right amount, and
   is the amount on `push ke main` too little?
2. **The `fitnah lebih kejam dari merge conflict` line.** It is the funniest thing the build
   produced and it works as Indonesian sarcasm, but the idiom it plays on is Quranic (QS 2:191,
   `الفتنة أشد من القتل`). Our own rule says never make a religious joke. Whether an idiom that
   everyday Indonesian borrowed from that verse counts is a judgement for you and the religious
   reviewer, not for me.
3. **Reaction amplitude** (§5.1): do you want an explicit anchor ("one reaction, sized to what
   happened"), or is the coin flip closer to how a real person reads?
4. Reviews still `pending` and enforced by nothing: linguistic, cultural, safety for the persona;
   `reviewed_by` for `culture/id`; the five awareness-only entries (`julid`, `bucin`, `rizz`,
   `skibidi`, `accent-mockery`).
5. **Whether to widen the two deliberately-failing screens** — say the word and it is a two-line
   change, but then the suite stops being evidence of anything.
6. Still parked by you: LICENSE. Still open and not RUSUH work: the coding study budget, the
   portable `agents-md` adapter, the opencode eval runner, opencode permission parity, Qoder on
   the other device, and Halal/Jawa, which this cycle deliberately did not touch.
