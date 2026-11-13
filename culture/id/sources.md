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

Checked 2026-11-07 and 2026-11-13. Note: `schemas/memes.schema.json` forbids inline `sources`
inside `memes.yaml`, and compiled runtime references avoid shipping bare URLs.

| Entry | Source | What it supports |
|---|---|---|
| `meme-works-on-my-machine` | [Coding Horror, 2007-03-15](https://blog.codinghorror.com/the-works-on-my-machine-certification-program/) | defines the phrase by what the person does — "as simple as pressing the F5 key" — reports local pass, not shipped fix |
| `meme-not-a-bug` | [Wikipedia: Undocumented feature](https://en.wikipedia.org/wiki/Undocumented_feature) | records "it's not a bug, it's a feature" (INABIAF) and dates oldest Usenet reference to 5 March 1984 |
| `meme-yak-shaving` | [Seth Godin, 2005-03-05](https://seths.blog/2005/03/dont_shave_that/) | "Yak Shaving is the last step of a series of steps that occurs when you find something you need to do" |
| `meme-bike-shed` | [Wikipedia: Law of triviality](https://en.wikipedia.org/wiki/Law_of_triviality) | Parkinson (1957): people give "disproportionate weight to trivial issues", the bike-shed example |
| `meme-brainrot` | [Kompas, 2024-07-20](https://www.kompas.com/tren/read/2024/07/20/083000765/skibidi-sigma-dan-rizz-ini-10-arti-bahasa-gaul-gen-alpha) | Indonesian reporting on the vocabulary; note prefers an original line over dated catchphrases |
| `meme-menyala-abangku` | [Xerpihan 2025-2026 Slang Guide](https://www.xerpihan.com/blog/bahasa-gaul-2025-tren-viral-lengkap) | Indonesian futsal/TikTok praise trope paired with *tetap ilmu padi* humility banter |
| `meme-gak-bisa-yura` | [Tribunnews Pekanbaru, 2024-08-06](https://pekanbaru.tribunnews.com/2024/08/06/yura-viral-dan-trend-gak-bisa-yura-di-tiktok-ini-arti-kata-yura-dan-apa-itu-yura-serta-bahasa-gaul) | Yura Yunita lyric TikTok trend expressing humorous despair over heavy situations |
| `meme-mbak-taylor` | [Kompas Lifestyle FYP Glossary](https://lifestyle.kompas.com/read/2026/04/23/110500720/100-bahasa-gaul-gen-z-viral-yang-sering-muncul-di-fyp-dan-artinya) | Indonesian pop-culture heartbreak venting trope referencing Taylor Swift |
| `meme-minimal-roast` | [Unpas Pendas Study](https://journal.unpas.ac.id/index.php/pendas/article/view/55543/32771) | Pragmatic template for "Minimal..." baseline expectation sarcasm in Indonesian social discourse |
| `meme-bercyandya` | [Kompas Lifestyle FYP Glossary](https://lifestyle.kompas.com/read/2026/04/23/110500720/100-bahasa-gaul-gen-z-viral-yang-sering-muncul-di-fyp-dan-artinya) | Viral teasing deflection sound clip; flagged as aging fast |
| `meme-tren-anomali` | [Kompas Lifestyle FYP Glossary](https://lifestyle.kompas.com/read/2026/04/23/110500720/100-bahasa-gaul-gen-z-viral-yang-sering-muncul-di-fyp-dan-artinya) | Viral absurdist audio meme trend on Indonesian TikTok |
| `meme-sigma` & `meme-skibidi` | [Gramedia Gen Z Slang Guide](https://www.gramedia.com/best-seller/50-bahasa-gaul-gen-z-kekinian-lengkap-dengan-arti-dan-contohnya/) | Gen Alpha meme vocabulary documented as aging-ironic awareness-only entries |

Recorded honestly:

- **`meme-deploy-friday` has no citation.** Searched 2026-11-07 and opened Google SRE
  (canarying chapter: no Friday guidance), GitLab's deployments handbook page (no Friday
  policy), and Coding Horror (nothing on it); web.dev Indonesian caching article mentions
  "Friday's release" but not the rule. It stays as a documented workplace habit, not a sourced
  fact — the note limits it to an observation, never advice to delay a release.

## Wave 1 & Wave 2 Lexicon Research (`culture/id/genz-lexicon.yaml`)

Checked 2026-11-13 via direct inspection of Indonesian digital slang & linguistics references:

- **KBBI Daring (`https://kbbi.kemendikdasmen.go.id/`)**: Colloquial codifications (*gabut, mager, baper, cuan, kepo, julid, bucin, zonk, ambyar, blunder, gercep, wacana, fiks, flexing, fomo*).
- **Wikipedia Bahasa Indonesia Gaul (`https://id.wikipedia.org/wiki/Bahasa_Indonesia_gaul`)**: Prokem reversal (*sabi, ngab, kuy, goks*), Sundanese/Javanese/Betawi borrowings (*gaskeun, atuh, euy, lur, rek, buset*), pragmatic discourse particles (*sih, dong, deh, tuh, nih, lah, kok, kan, mah, loh, dah*), and chat elision/shorthands.
- **Mojok.co Kamus Anak Twitter (`https://mojok.co/esai/kamus-bahasa-gaul-anak-twitter/`)**: X/Twitter & menfess vernacular (*jbjb, menfess, sender, mutualan, ava-telur, opfol, ratio, flop, spill, gatekeep, kuli-ketik, mendang-mending, budak-korporat, sepuh, suhu, ra mashok, ora urus, jancok, jamet, playing-victim, gaslighting, tone-deaf*).
- **Liputan6 (`https://www.liputan6.com/hot/read/5045173/apa-arti-rungkad-ini-penjelasan-dan-daftar-istilah-viral-media-sosial`)**: Viral reaction & gaming slang (*rungkad, gacor, boncos, sat-set, kureng, dark-system, kena-ulti, kena-mental, valid no debat*).
- **Wave 1 TikTok / Gen Z Sources**:
  - [Xerpihan 2025–2026 Guide](https://www.xerpihan.com/blog/bahasa-gaul-2025-tren-viral-lengkap) (*stecu, aura-points, brainrot, canon-event, mogging, menyala-abangku, orang-have, cegil-cogil, velocity*)
  - [Kompas Lifestyle Glossary](https://lifestyle.kompas.com/read/2026/04/23/110500720/100-bahasa-gaul-gen-z-viral-yang-sering-muncul-di-fyp-dan-artinya) (*rizz, slay, ate, its-giving, touch-grass, mbak-taylor, bercyandya, cepu, bengek, bestie, doomscrolling, skill-issue, carry, atapu*)
  - [Gramedia 50+ Gen Z Slang](https://www.gramedia.com/best-seller/50-bahasa-gaul-gen-z-kekinian-lengkap-dengan-arti-dan-contohnya/) (*delulu, npc, mid, no-cap, bussin, gamon, pick-me, ovt, salfok, nolep, kaum-rebahan, sigma, skibidi*)
  - [Axe Indonesia (*skena*)](https://www.axe.com/id/inspirasi/culture/arti-skena.html), [Telkomsel (*ygy*)](https://www.telkomsel.com/jelajah/jelajah-lifestyle/ygy-artinya-pahami-bahasa-gaul-yang-populer-di-tiktok-ini), [Tribunnews Bangka (*ytta/nt/tbl*)](https://bangka.tribunnews.com/2022/09/21/8-singkatan-baru-anak-tiktok-202-yang-harus-kamu-tau-artinya-ada-ytta-nt-ygy-ib-dan-pmg?page=all), [VIVA (*831/224*)](https://www.viva.co.id/gaya-hidup/inspirasi-unik/1379419-831-dan-224-meaning-dalam-bahasa-gaul-apa-sih-artinya), [Tribunnews Sumsel (*530*)](https://sumsel.tribunnews.com/2022/11/28/arti-kode-angka-530-831-24434-1432-224-361-607-4646-599-dan-323-bahasa-gaul-viral-di-medsos)
