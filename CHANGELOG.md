# Changelog

All notable changes to `@humanoiselabs/plus62` (+62 Mode) will be documented in this file.

## [0.2.0] - 2026-11-13

### Added
- **Expanded Indonesian Cultural Corpus (`culture/id/genz-lexicon.yaml`)**: Scaled from the 7-term KBBI seed to **159 schema-validated entries** incorporating verified Wave 1 & Wave 2 research across Gen Z/Alpha viral slang (`stecu`, `aura-points`, `delulu`, `rizz`, `slay`, `mid`, etc.), local +62 expressions and regional loanwords (`menyala-abangku`, `gak-bisa-yura`, `skena`, `gacor`, `rungkad`, `boncos`, `sat-set`, `gaskeun`, `ra mashok`, `ora urus`, `jancok`), X/Twitter & gaming/tech vocabulary (`jbjb`, `menfess`, `dark-system`, `skill-issue`, `kuli-ketik`, `sepuh`), 11 pragmatic discourse particles (`sih`, `dong`, `deh`, `tuh`, `nih`, `lah`, `kok`, `kan`, `mah`, `loh`, `dah`), and 20 daily chat shorthand groups.
- **Expanded Situational Memes (`culture/id/memes.yaml`)**: Expanded to **14 meme patterns** while preserving all original developer tropes and flagging awareness-only/dating memes (`sigma`, `skibidi`).
- **Curated Persona Lexicon (`personas/plus62/lexicon.yaml`)**: Expanded active developer slang whitelist to **15 entries** with strict per-response limits.
- **E2E Regression Suite (`test/e2e-wave.test.ts` & `TEST_INFRA.md`)**: Added 14 end-to-end verification tests covering full 152-term Wave 1 & 2 coverage, AJV schema validation, awareness-only quota enforcement (`max_per_response: 0`), provenance hygiene, adapter token hard caps, CLI bundle checks, tarball packing, and public infrastructure guardrails.

### Changed
- **Compact Grouped Runtime Reference Compiler (`src/build.ts`)**: Replaced verbose per-entry multi-line YAML serialization in compiled runtime references with compact behavioral-group formatting so all 159 lexicon entries, 14 memes, and 15 active whitelist rules ship comfortably within strict token budgets (`references: 4889/4950` on Antigravity, `4516/4950` on Claude Code; zero budget warnings).
- **Provenance Documentation (`culture/id/sources.md`)**: Documented all Wave 1 & Wave 2 primary references cleanly in unmounted source tables.

## [0.1.8] - 2026-11-12

### Changed
- Polished residual internal naming to **+62 Mode** (`@humanoiselabs/plus62`) across core instructions, persona cards, adapters, installers, and tests.
- Clarified on-demand skill/rule loading instructions for downstream adapters.

## [0.1.7] - 2026-11-11

### Fixed
- Applied readiness audit remediations across CLI flags, documentation links, and `HumanoiseLABS` umbrella portal metadata (`https://humanoise.vercel.app`).
