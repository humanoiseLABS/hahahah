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
  cites "NU Online" by name only. Until the Islamic-content reviewer supplies a citation,
  those two stay prose-only guidance.
- Whether each expression also needs a capped entry in a culture lexicon file is the
  reviewer's call. The culture schema's `decay_class` vocabulary (`global-meme`,
  `local-slang`, `kbbi-colloquial`, `aging-ironic`, `dated`, `banned`) is built for slang
  that ages; religious vocabulary does not decay on that axis, so inventing a class for it
  would be a distortion rather than a fix.

## Rulings and scripture text

- MUI Fatwa 24/2017 — cited in the etiquette file for the no-fabrication stance; URL pending.
- Kemenag LPMQ (lpmq.kemenag.go.id) — the verification body for any Qur'anic quotation;
  no quotation may ship without a checked citation.
