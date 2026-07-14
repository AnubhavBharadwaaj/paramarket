# ACTIVATE_STEPS.md — get the API token (unblocks the data feeds)

The scores/odds feeds return **403 with the guest JWT alone**. They need an
`X-Api-Token`, produced by a 3-step chain: guest JWT → on-chain `subscribe`
(free tier) → activate. This runbook gets you that token.

`src/client/activate.ts` does all three steps in one command. You just need a
funded devnet wallet first.

## Prerequisites (one-time)

Install the Solana toolchain if not present:

```bash
# Solana CLI (macOS/Linux)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
solana --version
```

Point the CLI at devnet and create/fund a wallet:

```bash
solana config set --url devnet

# create a keypair if you don't have one (writes ~/.config/solana/id.json)
solana-keygen new --outfile ~/.config/solana/id.json

# fund it with devnet SOL (for tx fees only — free tier costs no TxL)
solana airdrop 2
solana balance          # confirm > 0
```

If `solana airdrop 2` rate-limits, retry, or use https://faucet.solana.com
with the address from `solana address`.

## Run activation

```bash
npm install            # if not already done (adds tweetnacl)
npm run activate
```

Expected output:

```
network=devnet  wallet=<your pubkey>
devnet SOL balance: 2.000
[1] guest JWT ok (len 276)
[2] subscribing on-chain (level 1, 4w)…
    subscribe tx: <sig>
    explorer: https://explorer.solana.com/tx/<sig>?cluster=devnet
[3] API token activated (len …) ✅
saved .txline-token.json. Now run:  npm run smoke
```

This writes `.txline-token.json` (git-ignored). `smoke.ts` auto-loads it.

## Verify the feeds are now open

```bash
npm run smoke
```

Now that the token is present, expect the scores/odds 403s to become 200s.
Caveat: a feed only ticks when there's live (or, on devnet, 60s-delayed) match
activity. If a feed connects but is silent, that's "no live match right now,"
not an auth failure — the earlier 403 is gone, which is the real signal.

## If it fails

- **`No keypair at …`** → run the `solana-keygen new` step above, or set
  `SOLANA_KEYPAIR=/path/to/id.json`.
- **`Wallet has 0 SOL`** → `solana airdrop 2` (devnet), confirm with `solana balance`.
- **subscribe tx reverts** → devnet documents **service level 1** only. Don't use
  12 on devnet. Check the on-chain pricing matrix if unsure.
- **activate 4xx** → the signed message must be exactly `${txSig}:${leagues}:${jwt}`
  with `leagues=[]` → `${txSig}::${jwt}`. `activate.ts` already does this; if you
  changed leagues, keep the format consistent on both sides.
- **network mismatch** → a devnet subscribe tx must activate on the devnet host.
  Don't mix. `activate.ts` pulls both from the same `TXLINE_NETWORK`.

## Notes for the build (Stage 1+)

- The token/JWT in `.txline-token.json` is what the autonomous agent will load to
  authenticate its stream + proof calls.
- Service level 1 = 60s delayed on devnet. Fine for building; the demo runs on
  historical replay anyway (matches end when submissions close).
- Stat-key encoding (needed for the signal engine + settlement predicates):
  goals = keys 1 (home) / 2 (away); period multiplier adds 1000 (H1), 2000 (H2),
  etc. e.g. key 1001 = home H1 goals. Full table in the Soccer Feed docs.
