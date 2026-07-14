# ParaMarket Stage 4 Demo Script

## 0. Run The App

```bash
npm install
npm run stage4:assets
npm run dev
```

Open `http://localhost:3000`.

Live demo URL:

```text
https://txline-agent.vercel.app
```

## 1. Receipt Hero

Start on the first screen. The product claim is the receipt:

> Verify the result yourself: one click, in your browser, against the real on-chain proof.

Click **Verify receipt**. The browser builds a `settle_spike` simulation against
devnet TxOracle using the generated proof asset in `public/stage4/receipt-proof.json`.

Expected result:

- return value: `true`
- program log: `Program log: paramarket settle_spike validate_stat=true`
- no wallet prompt
- no private key or signer

Open the linked receipt tx. It matches the browser receipt exactly:
fixture `18213979`, seq `941`, `ts=summary.updateStats.minTimestamp`, and
predicate `1002 + 1003 == 1`.

`https://explorer.solana.com/tx/5XKM2B9yJ8kwJvReBfG5kbeDvNA74jGTCZLMmct5EweeEuo8nMQjs2j7bE6aZBJqVBtiCYeSvsTYoLjq4XWoiVtg?cluster=devnet`

## 2. Live Replay Market

Click **Play** on the historical replay market. The match tape advances through
TxLINE historical score events for fixture `18213979`. The displayed market is
`Over 2.5 goals`; the final score is `1-2`, so the price resolves true when the
third goal appears late in the replay.

Narration:

- The percentages are deterministic LMSR live implied probabilities.
- The LMSR engine is pure fixed-point TypeScript from `src/pricing/lmsr.ts`.
- Settlement is still the Stage 2 proof-gated parimutuel flow.
- This is intentional separation, not a half-migrated on-chain pricing model.

## 3. Lifecycle Evidence

Use the lifecycle panel to open the three green Stage 2 paths:

- T1 single-stat over/under: init -> settle -> claim
- T2 two-stat sum predicate: init -> settle -> claim
- T3 under/exact/over 3-way: init -> settle -> claim

The reverts were already captured in `EVAL_STAGE2.md` with exact error codes.

## 4. Validation Commands

```bash
npm run typecheck
npm run test
npm run build
```

Stage 4 verification run:

```text
receipt simulation: returnValue=true
program log: Program log: paramarket settle_spike validate_stat=true
compute: 205,992 CU
```
