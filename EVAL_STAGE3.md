# EVAL_STAGE3 — Deterministic LMSR Pricing

Stage 3 keeps LMSR pricing off-chain by design. The pricing engine computes
deterministic live quotes for the UI and keeper; on-chain settlement remains the
Stage 2 proof-gated parimutuel flow for auditability.

- Module: `src/pricing/lmsr.ts`
- Scale: `WAD = 1e18`
- Default liquidity: `b = 100 WAD`
- On-chain changes: none

Eval command:

```bash
npm run test
npm run typecheck
```

Tests cover:
- known 2-way and 3-way vectors
- deterministic replay: identical JSON price path and final state
- prices sum to approximately 1 WAD
- cost monotonicity as shares are added
- 2-outcome and 3-outcome edge cases

Result:

```text
npm run test      PASS (12/12)
npm run typecheck PASS
```

Determinism headline: the replayed buy sequence produced byte-identical
`JSON.stringify` output for both runs, including the full price path and final
state.
