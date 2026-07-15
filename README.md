# ParaMarket

**Proof-settled parametric prediction markets on TxLINE devnet.**

Every prediction market asks you to trust its oracle. ParaMarket lets you verify
the result yourself: one click, in your browser, against the real on-chain proof,
with no wallet and no backend. Markets can be defined over World Cup match stats,
priced by a deterministic market maker, and settled by TxLINE's own Merkle proof.

## What Exists

- **Parametric market program:** an Anchor program for two-outcome over/under
  markets and three-outcome under/exact/over markets.
- **Real TxOracle settlement:** settlement CPIs into TxLINE `validate_stat` using
  live devnet Merkle proof bundles.
- **Hard timestamp invariant:** settlement uses
  `summary.updateStats.minTimestamp` for proof validation.
- **Deterministic LMSR pricing:** pure fixed-point TypeScript pricing in
  `src/pricing/lmsr.ts`; no randomness, floating drift, or network I/O.
- **Wallet-free receipt verification:** the Next.js UI rebuilds and simulates the
  receipt proof client-side with `simulateTransaction`; a judge can verify the
  result from a browser without connecting a wallet.
- **Historical replay market:** TxLINE historical score events drive an
  `Over 2.5 goals` LMSR price path that resolves true when fixture `18213979`
  reaches its final `1-2` score.

## Product Framing

LMSR is used for deterministic live implied probabilities in the UI. On-chain
settlement remains proof-gated and parimutuel for auditability. That separation
is deliberate: the demo shows useful pricing without weakening the already-green
settlement path.

## Run The Product

Requires Node 22+.

Live deployment:

```text
https://txline-agent.vercel.app
```

```bash
npm install
npm run stage4:assets
npm run dev
```

Open `http://localhost:3000`.

For Vercel, use this directory as the project root:

```text
/Users/anubhavanubhav/Documents/projects/Txline/txlineagent/txline-agent
```

If the GitHub repo is created from this folder, Vercel's **Root Directory** is
`.`. The framework preset should auto-detect as Next.js.

## Receipt Verification

The first screen is the receipt verifier. Clicking **Verify receipt** simulates
the deployed receipt CPI program against TxOracle devnet using the generated
proof in `public/stage4/receipt-proof.json`.

The live app does not call TxLINE APIs at runtime for this path. The proof bundle
and replay tape are snapshotted static assets in `public/stage4/`; verification
runs against Solana devnet state with `simulateTransaction`.

Receipt predicate:

```text
fixture: 18213979
seq: 941
timestamp: summary.updateStats.minTimestamp = 1783811701138
predicate: stat 1002 + stat 1003 == 1
```

Matching devnet receipt transaction:

```text
5XKM2B9yJ8kwJvReBfG5kbeDvNA74jGTCZLMmct5EweeEuo8nMQjs2j7bE6aZBJqVBtiCYeSvsTYoLjq4XWoiVtg
```

Explorer:

```text
https://explorer.solana.com/tx/5XKM2B9yJ8kwJvReBfG5kbeDvNA74jGTCZLMmct5EweeEuo8nMQjs2j7bE6aZBJqVBtiCYeSvsTYoLjq4XWoiVtg?cluster=devnet
```

Expected verifier result:

```text
returnValue=true
Program log: paramarket settle_spike validate_stat=true
```

## On-Chain Evidence

### Stage 1: TxOracle CPI Spike

Program:

```text
paramarket_spike = CWCzF6shQBeGYNJcwip62WvoBM1P6QHCbnGm5MB3c8Pm
```

The spike proves arbitrary stat predicates by CPI into TxOracle `validate_stat`.

```text
TRUE predicate tx:
3Ssn7YTHUdbeQXRpTLnv8ifPcwDZHQiw3QnLXbLypuvgxanLZnbi7KJ3NjaiL1RZdqwu9kd13UocV4nePhZaUSQ2

FALSE predicate tx:
2VavzgtQt9595Lmr1sfkDR5TRZ4LTiYwmWZyp8e6y6Fps9xrRfAsxaFyPTecS3nQLTgBBzw7cBzQ1aeeGfaMJy88
```

### Stage 2: ParaMarket Program

Program:

```text
paramarket = HPzBCd83X61od45nq2ofu4G1sRMiguuvZk87vGqsmxtN
```

Three full devnet lifecycles are captured in `EVAL_STAGE2.md`:

| Template | Init | Settle | Claim |
|---|---|---|---|
| Single-stat over/under | `3ucd6d4AWSy86Rm7LesHBWpgBEzeMY4LWfTRDwv1Z1w1UKhBQitjXZnngvrBLo55b7dFj1W53gh3zfmEkph4vje5` | `4gWe45Q74LHRiLh1yv3YUDf6rRxUMP3Gic6JMBruZN1XqHwjdEf13ErzNygyeHKyLKQiTWViL4axtzpYHKPUmUsN` | `3dPLXU2N5Ak8x3DS93jZzEfsmtSPUqtpmAP9RkYSr6Jc7ZQuD4NdYuboe7N4gH5Nz8G9wQZDV5wUa6rhyoQD2dAe` |
| Two-stat sum predicate | `5gUKJLbimxK9ptfh3puqXCUfHduxdgCdEjKxBA94vmWHknYYYLLoF3HhKFUawF99L2V21DmxbGvTNdE9u3rA4eCi` | `5b2NYByaYuCdz3xJhM2UoFwwgqNtBRHgwVftVgFozq6moQKdg1AfNp42MAReQqd4ery9LYLACZ2b5y347M4qCcGQ` | `5aXTakrhTjfpedRmWq6PgWDbjUG52ZqRQSyoXCzL5eLbTbgMvosvTuxdUCSrDKTfL9U57t8mUt1e2oogy6JJDYSx` |
| Under/exact/over 3-way | `53HBasqoDf1KMFsC7hUmY9sMDx6mB4GwNozrNBatvpa4i8s9vqKbbG62L1LkRQtzsfecduZ31RNshNYsVBhWhxy8` | `4r9T3imD7jfpwsemA7gyGTo3ysncRE3cxC481yMfwiheHGemZWxggEYWjeSS5mLdKQqwXS81E4EVDyzgNikdsYTJ` | `5jmpuHm1t9aitUe3yeurpj3dGYTniKqqewMkqRuqeKC6THbCesdUDpKjifdmsfcdGebaiioS7hDNdyU9KBDX4r4U` |

Devnet transaction history is not permanent. If an explorer link 404s, the
signature may have aged out of public RPC history. The UI therefore reads these
live Market PDA accounts directly and falls back to committed JSON transaction
records in `evidence/` instead of showing dead links:

| Template | Market PDA | Vault PDA |
|---|---|---|
| Single-stat over/under | `8JZmhpo2TEnbssA2RfDRbYwbvbawzHH5KeEiEZHNZv5w` | `342t8gWxytzF7m5wfzJjDX2BXfk6DPxnDQEhFQUQaemG` |
| Two-stat sum predicate | `4mThnf3THGCxN3rRfkxCqMhLfXYEz9d3XamSJHZ4Bq3i` | `5Za2pg1bxyEHsnYXUAZHGuQqBmE38SY1mSpN8fsxfg2Z` |
| Under/exact/over 3-way | `BeHTr9mTLxRNnyZtVVAaS5bmijJS8jMJ8PmLcCZC7HpW` | `6RU5bvuztUeoHNCk1Y3qe5CiBMu7iTqhKXHzQbDPD3oF` |

Before judging, rerun:

```bash
npm run refresh:evidence
```

This is best effort: it refreshes evidence locally with a funded devnet wallet
and saves transaction JSON, but it cannot guarantee public explorer retention or
survive a full devnet reset.

Guard-path reverts were verified with exact error codes:

```text
early settle -> SettleTooEarly
bet after close -> BettingClosed
wrong winner -> WrongWinner
fixture mismatch -> FixtureMismatch
stat mismatch -> StatKeyMismatch
double claim -> AlreadyClaimed
non-winner claim -> NothingToClaim
```

Important correctness choices:

- Binary markets reject `EqualTo` predicates because TxOracle has no `NotEqual`
  comparison for honest NO-side settlement.
- Three-outcome markets are explicitly under/exact/over at one threshold. They
  are not claimed to be arbitrary multi-point ranges.

## TxLINE Integration

Devnet configuration:

```text
API origin: https://txline-dev.txodds.com
API base:   https://txline-dev.txodds.com/api
TxOracle:   6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
```

Endpoints used:

```text
POST /auth/guest/start
GET  /scores/stat-validation?fixtureId=...&seq=...&statKey=...&statKey2=...
GET  /scores/historical/:fixtureId
POST /activate
```

The scores and odds feeds require an activated API token. The local activation
runbook is in `ACTIVATE_STEPS.md`; generated tokens are saved to
`.txline-token.json`, which is git-ignored.

## Repository Map

```text
app/                         Next.js product UI
app/lib/receiptVerifier.ts   wallet-free devnet receipt simulation
src/pricing/lmsr.ts          deterministic fixed-point LMSR
programs/paramarket/         proof-settled market program
programs/paramarket-spike/   receipt/proof CPI spike program
tests/pricing.test.ts        deterministic pricing evals
tests/paramarket.ts          real devnet Stage 2 lifecycle eval
public/stage4/               generated proof and replay fixtures
```

## Verification

```bash
npm run typecheck
npm run test
npm run build
```

Current local result:

```text
typecheck: PASS
tests:     PASS (12/12)
build:     PASS
receipt simulation: returnValue=true
```

Current deployed-origin receipt check:

```text
https://txline-agent.vercel.app/stage4/receipt-proof.json
returnValue=true
Program log: paramarket settle_spike validate_stat=true
```

After deployment, test the live Vercel URL in an incognito browser with no wallet.
The receipt verifier should still return `true` from the deployed origin.
