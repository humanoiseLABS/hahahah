# The first clean measurement: pinned route, both injected style layers off

Run: `hahahah eval --profile rusuh-id --suite preservation --repeats 3 --model kr/claude-sonnet-4.5-agentic --budget-usd 0.40`
reported at 10:07:31Z (17:07:31 WIB), 5 November 2026. Raw output:
[preservation-clean-k3-report.md](preservation-clean-k3-report.md) /
[preservation-clean-k3-report.json](preservation-clean-k3-report.json).

Conditions were verified, not assumed: `cavemanEnabled = false` and `ponytailEnabled = false` read out
of the gateway's own settings database immediately before launch; port 20128 answering; the model
pinned to a single upstream by the id the gateway accepts (`kr/claude-sonnet-4.5-agentic` - the CLI's
own `sonnet` alias and the unprefixed id are both rejected with a 400). `claude` 2.1.318.

This replaces the interpretation in [../efficiency-k3/findings.md](../efficiency-k3/findings.md),
which measured the same suite while the gateway injected two terseness layers into both arms. That
document stays as evidence of what the contaminated regime looked like, and its length conclusion is
withdrawn here.

## What the run gave: 60 of 72 runs

The gateway's free `kiro` connection ran out of request allowance mid-campaign: `503 ... [402] You
have reached the limit, reason MONTHLY_REQUEST_COUNT`. Tasks 11 and 12 lost all 12 of their runs, and
a mop-up attempt about eleven minutes later lost 12 more, at `$0.0000` cost. Nothing was retried
beyond that - hammering a quota is not a measurement strategy.

**Sample: 10 tasks x 3 repeats x 2 arms = 60 answered runs, plus 12 recorded errors.** The report's
`errored` field carries them and every median excludes them; `routing` reads
`{runs: 60, deviating: 0, medianInputTokens: 30477.5}` - one upstream for the whole campaign, which is
what made this run interpretable at all. `contamination` reads 0 of 36 per arm: neither Caveman nor
Ponytail left any trace, which is consistent with the toggles and no longer contradicts anything.

## Length: the answer depends entirely on what you count, and one of the two numbers is a trap

Counting the text the harness returns, per-task medians: baseline **4,683 -> treatment 2,284**
characters, **-51.2%**, and 6 of 10 tasks shorter. That number went out in chat as the headline and it
is withdrawn here. The cause is in the text itself: **16 of 30 baseline runs contain a literal
reasoning block** (`<thinking>...</thinking>` inside the returned answer, and the run that failed its
`forbid` screen reproduced the literal `sk-live-9f3a...` token from the prompt into the line it was
asked to write) against **3 of 30 treatment runs**. Stripping those blocks:

| measure | baseline | treatment | direction |
|---|---:|---:|---|
| text as delivered | 4,683 ch | 2,284 ch | **-51.2%** (6/10 shorter) |
| answer substance, reasoning dumps stripped | 1,779 ch | **2,169 ch** | **+21.9%** (7/10 longer) |
| reasoning dumps in the reply | 16/30 runs | 3/30 runs | -81% occurrence |

So both statements are true and they are different claims. What RUSUH delivers is *half the scrolling
text*, because a plain prompt on this model leaks its reasoning into the reply over half the time and
the persona keeps that out. What RUSUH does **not** do is write shorter answers: on substance it writes
about a fifth more than a clean baseline, and that is the same direction the contaminated campaign
showed (+5.7%), just larger once the provider's own terseness layers were switched off.

The contaminated run showed this exact mechanism being supplied by someone else: reasoning dumps there
were 1 of 36 in both arms, because the injected layers were already suppressing them. That is why the
persona's effect looked like +5.7% instead of what it is.

## Cost: +739 input tokens, +1.6% per run, because the shorter replies pay it back

| | baseline | treatment | delta |
|---|---:|---:|---:|
| input tokens per request | 30,161 | 30,909 | +748 by medians, **+738.5 paired** |
| cost per run | $0.09238 | $0.09338 | +$0.00100 (**+1.08%**) by medians, +$0.00150 (**+1.63%**) paired |

The input cost is now measured three times under three different route regimes: **+702.5** paired
(rotating combo, layers on), **+705.5** (pinned pilot, 8 runs), **+738.5** (pinned, layers off). It is
the most reliable number in this project. The cost stays near flat because fewer output tokens are
billed: the efficiency story, if there is one, is "the block costs ~700 tokens and the shorter
delivery pays most of it back", not "the persona saves tokens".

## Behaviour: better than baseline on the screens, with no aggregate content loss

- Screens: baseline **49 pass / 23 fail / 0 unknown** -> treatment **61 pass / 9 fail / 2 unknown**.
- Language screen passes: **14 of 30** baseline runs, **26 of 30** treatment runs. With the injected
  layers gone this is no longer a side effect of them: the plain prompt answers in English more often
  than not, the persona does not.
- `require` retention - the metric that decides whether brevity costs substance: **30/36 (83%)**
  baseline vs **29/36 (81%)** treatment. Seven content findings in each arm. The 22% longer substance
  is not buying completeness either.
- Credential handling: the baseline echoed the live-looking secret into a public-issue summary once
  (`forbid` matched); the treatment never did.

## The one apparent regression is our screen's fault, not the persona's

`pres-honest-partial-01` reads baseline mixed 1/3 -> treatment fail 0/3, and was reported in chat as a
behavioural regression. Reading the six answers: **all six** correctly refuse to invent the 12 findings
and ask for the list. The `require` pattern is lexical (`/sisa|belum semua|sebagian|lanjut/`), and the
one baseline run that passed did so by **parroting the prompt's own words back** ("Tulis sisa yang
belum kejawab ... belum semua kesentuh") without doing anything with them. The persona's phrasings -
"ga ada file atau list yang di-share", "gak ada daftar 12 temuan", "butuh konteks bro" - are the same
behaviour and score zero.

This is the fourth time a screen of ours has failed a correct answer for a synonym, and the first time
it produced a false *regression* rather than a false failure. Not fixed here: widening the pattern to
match would be making the number green by editing the ruler. It needs an owner decision, ideally as a
behaviour-shaped screen (does the reply state that the input was not provided, and ask for it?) rather
than a word list.

## Decisions this settles

- The README cannot say the layer compresses output. It can say, with numbers: it costs **+738.5 input
  tokens per request and about 1% more per run**, it delivers **roughly half the scrolling text**
  because the plain prompt leaks reasoning into replies 16/30 times against 3/30, it writes **+22%
  more answer substance**, and it takes Indonesian from **14/30 to 26/30** and screen passes from
  **49 to 61**.
- A "write less code" rule is still the missing half, and this run says why: nothing in our content
  makes the *answer* shorter - it makes the *delivery* cleaner. If the goal is less output, that rule
  has to be authored and measured, not assumed.
- On this machine, a 72-run campaign exceeds the free `kiro` request allowance. Any future campaign
  needs either a smaller `--limit`, a slower schedule, or a connection with headroom.

## What this still does not say

n=10 tasks, not 12. One model (`claude-sonnet-4.5-agentic` as pinned by the gateway), one harness, one
provider, k=3 - medians, not confidence intervals. Screens are surface checks: they do not know whether
an answer is *right*, and one of them just demonstrated it can score a correct answer as a failure.
Character counts are not a measure of usefulness, and the reasoning-dump difference is a property of
this route's baseline behaviour, not something RUSUH guarantees elsewhere.
