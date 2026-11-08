# RFC / Proposal: Ponytail-Style Terse Code & Surgical Diffs

- **Status**: Draft / Opt-in Proposal (Option A)
- **Author**: humanoiseLABS & Pair Programming Team
- **Target**: HAHahah Efficiency Extension (`rules/terse-code.md` or opt-in profile modifier)
- **Token Budget Impact**: ~75 input tokens (estimated)

---

## 1. Background & Context

In early efficiency experiments (`docs/evidence/efficiency-k3/findings.md`), upstream prototypes used a directive nicknamed **"Ponytail"** ("write less code"). While Ponytail successfully crushed output token bloat during routine coding tasks, crude brevity directives in LLMs often trigger dangerous failure modes:
1. **Lazy truncation**: Agents emitting `// ... rest of code here ...` or missing crucial closing braces.
2. **Safety erosion**: Stripping defensive `try/catch` blocks, null checks, or input validations in the name of "shorter code".
3. **Context amnesia**: Omitting exact file paths, line anchors, or reproduction steps.

This proposal formalizes a production-grade, safe variant of the Ponytail philosophy tailored for HAHahah: **Surgical Diffs & Anti-Ceremony**.

---

## 2. Proposed Rule Text (Draft Specification)

```markdown
# Terse Code & Surgical Diffs (Ponytail Variant)

Optimize for information density and surgical precision over volume.

1. **Surgical Diffs Over File Dumps**:
   - When modifying existing code, output ONLY the targeted function, block, or unified diff with exact line/file anchors.
   - Never re-print 200 lines of unchanged code just to show a 2-line change.

2. **Zero Ceremonial Boilerplate**:
   - Solve problems directly. Avoid unprompted helper factories, decorative interfaces, speculative abstractions, or wrapper layers.
   - Do not add comments explaining what self-explanatory code does.

3. **Strict Completeness (Anti-Lazy Constraint)**:
   - Preserves Rule 4 of core efficiency: NEVER use `// ... rest of code`, `/* same as before */`, or skip needed imports in a replacement block.
   - Every snippet must be syntactically valid and runnable/pasteable without guessing.

4. **Preserve All Defenses**:
   - Never omit error handling, boundary checks, typings, or security constraints to make code shorter.
   - When brevity conflicts with correctness or safety, correctness and safety always win.
```

---

## 3. Comparison Matrix

| Aspect | Standard Coding Agent | Naive "Write Less Code" | HAHahah Ponytail Proposal |
| :--- | :--- | :--- | :--- |
| **Output Style** | Prints whole 500-line file | Prints broken snippets with `// ...` | Targeted runnable function / diff |
| **Boilerplate** | Often adds 3 extra design patterns | Incomplete logic | Minimal direct solution |
| **Error Handling** | Verbose | Frequently deleted | 100% preserved |
| **Token Impact** | High output cost, slow generation | Low token cost, high bug rate | Low token cost, 0% syntax breakage |

---

## 4. Integration Roadmap

1. **Phase 1 (Current)**: Kept in `docs/proposals/` for review without touching `core/always-on.md` (no golden test drift, 0 permanent prompt token penalty for baseline users).
2. **Phase 2 (Opt-in Profile)**: Add as an optional modifier in `profiles/` (e.g. `rusuh-id-terse.yaml` or via CLI flag `--modifier terse`).
3. **Phase 3 (Validation)**: Run targeted synthetic eval fixture to prove it passes syntax checks and doesn't trigger lazy ellipses (`// ...`).
