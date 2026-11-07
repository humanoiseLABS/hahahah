# Indonesian culture sources (provenance, not shipped to the harness)

Citations for the Indonesian culture files. This file is deliberately **not** in any
persona `culture_refs`: URLs help a reviewer or a CI lint, not the agent's next decision,
and every token mounted as a reference is paid for at runtime. See `culture/jv/sources.md`
for the same split on the Javanese side.

## Religious expression etiquette (`culture/id/religious-expression.md`)

Checked 2026-11-03.

| Expression | Source | What it supports |
|---|---|---|
| *alhamdulillah* | [KBBI Daring](https://kbbi.kemendikdasmen.go.id/entri/alhamdulillah) | headword `al.ham.du.lil.lah`; "ungkapan untuk menyatakan rasa syukur karena menerima karunia Allah Swt." — gratitude, not a filler word |
| *astagfirullah* | [KBBI Daring](https://kbbi.kemendikdasmen.go.id/entri/astagfirullah) | headword `as.tag.fi.rul.lah`; "aku minta ampun kepada Allah" — seeking forgiveness, not a judgment on someone |
| *InsyaAllah* | [islam.nu.or.id](https://islam.nu.or.id/khutbah/di-balik-makna-insyaallah-yang-sering-disalahpahami-pBPnp) and [nu.or.id spelling guidance](https://www.nu.or.id/nasional/penulisan-yang-tepat-insyaallah-atau-inshaallah-ini-penjelasan-gus-dhofir-o90MJ) | a hope conditioned on God's will and an admission of limited control — explicitly not a weak promise or an evasion; the second source also fixes the standard spelling |
| *Bismillah* | [jatim.nu.or.id](https://jatim.nu.or.id/keislaman/rahasia-dan-makna-di-balik-lafal-basmalah-xyENt) | beginning an act; the article discusses virtue and does not license sarcastic use |

Notes recorded honestly:

- The two KBBI pages render as a "Hasil Pencarian" page for logged-out visitors, but the
  entry and its gloss did resolve in that view. Quote the gloss, not the page title.
- *MasyaAllah* and *Subhanallah* still have **no verified URL** here. The etiquette file
  cites "NU Online" by name only. **Decided 2026-11-07 (owner): usage cue only, no citation**
  rather than inventing one; both stay prose-only guidance and are not a release blocker, since
  the shipped etiquette file is not schema-gated.
- Whether each expression also needs a capped entry in a culture lexicon file is the
  reviewer's call. The culture schema's `decay_class` vocabulary (`global-meme`,
  `local-slang`, `kbbi-colloquial`, `aging-ironic`, `dated`, `banned`) is built for slang
  that ages; religious vocabulary does not decay on that axis, so inventing a class for it
  would be a distortion rather than a fix.

## Rulings and scripture text

- MUI Fatwa 24/2017 — cited in the etiquette file for the no-fabrication stance; URL pending.
- Kemenag LPMQ (lpmq.kemenag.go.id) — the verification body for any Qur'anic quotation;
  no quotation may ship without a checked citation.

## Meme patterns (`culture/id/memes.yaml`)

Checked 2026-11-07 by opening every URL below and reading the sentence it is cited for.

| Entry | Source | What it supports |
|---|---|---|
| `meme-works-on-my-machine` | [Coding Horror, 2007-03-15](https://blog.codinghorror.com/the-works-on-my-machine-certification-program/) | defines the phrase by what the person does — "as simple as pressing the F5 key" — i.e. it reports a local pass, not a shipped fix |
| `meme-not-a-bug` | [Wikipedia: Undocumented feature](https://en.wikipedia.org/wiki/Undocumented_feature) | records "it's not a bug, it's a feature" (INABIAF) and dates the oldest Usenet reference to 5 March 1984 |
| `meme-yak-shaving` | [Seth Godin, 2005-03-05](https://seths.blog/2005/03/dont_shave_that/) | "Yak Shaving is the last step of a series of steps that occurs when you find something you need to do" |
| `meme-bike-shed` | [Wikipedia: Law of triviality](https://en.wikipedia.org/wiki/Law_of_triviality) | Parkinson (1957): people give "disproportionate weight to trivial issues", the bike-shed example |
| `meme-brainrot` | [Kompas, 2024-07-20](https://www.kompas.com/tren/read/2024/07/20/083000765/skibidi-sigma-dan-rizz-ini-10-arti-bahasa-gaul-gen-alpha) | Indonesian reporting on the vocabulary, which is why the note says to prefer an original line over the catchphrase |

Recorded honestly:

- **`meme-deploy-friday` has no citation.** Searched 2026-11-07 and opened Google SRE
  (canarying chapter: no Friday guidance), GitLab's deployments handbook page (no Friday
  policy), and Coding Horror (nothing on it); web.dev's Indonesian caching article mentions
  "Friday's release" but not the rule. It stays as a documented workplace habit, not a sourced
  fact — the note already limits it to an observation, never advice to delay a release.
- Nothing in this table was taken from a model's memory: each row was opened and the quoted
  sentence read on the page.

