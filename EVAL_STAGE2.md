# EVAL_STAGE2 — ParaMarket Parametric Market Program

Date: 2026-07-14

Program: `paramarket`
Program id: `HPzBCd83X61od45nq2ofu4G1sRMiguuvZk87vGqsmxtN`

Durability note: devnet public RPC prunes old transaction history and devnet can
reset. The live app now reads Market PDA state directly and links to committed
`evidence/*.json` transaction records if a signature is pruned.

Redeploy:
- Extend: `solana program extend HPzBCd83X61od45nq2ofu4G1sRMiguuvZk87vGqsmxtN 12000 --url devnet`
- Deploy tx: `24yVdhxfkuAdtKT7UAK1Qw1zKr4rP96c7whnGwdpkrpPxCgFDAW8RqZzxbcGbxmXd7s2YbcvDN33XMd4SDq2g4Du`
- Explorer: https://explorer.solana.com/tx/24yVdhxfkuAdtKT7UAK1Qw1zKr4rP96c7whnGwdpkrpPxCgFDAW8RqZzxbcGbxmXd7s2YbcvDN33XMd4SDq2g4Du?cluster=devnet

Fixture/proof:
- Fixture: `18213979`
- Seq: `941`
- Timestamp convention: `summary.updateStats.minTimestamp`
- TxOracle: `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`
- Daily roots PDA derived per day from minTimestamp.

## Predicate Fixes

Gap A resolved by restricting 2-outcome binary markets to inequality predicates only.
`initialize_market` rejects `num_outcomes == 2` with `Comparison::EqualTo` using `BinaryEqualUnsupported`, because TxOracle has no `NotEqual` comparison to settle the NO side honestly.

Gap B resolved by scoping the 3-outcome market honestly as `under / exact / over` at one threshold. The eval labels use `UNDER`, `EXACT`, `OVER`; this is not claimed as a multi-point goal band.

## Command Output

```text
> txline-agent@0.1.0 stage2:e2e
> tsx tests/paramarket.ts

[revert] early settle: SettleTooEarly
[revert] bet after close: BettingClosed
waiting 0s for close/min_final gate...
[revert] wrong winner: WrongWinner
[revert] fixture mismatch: FixtureMismatch
[revert] stat mismatch: StatKeyMismatch
[revert] double claim: AlreadyClaimed
Server responded with 429 Too Many Requests.  Retrying after 500ms delay...
[revert] non-winner claim: NothingToClaim

STAGE 2 EVAL RESULTS
init 481421: 3ucd6d4AWSy86Rm7LesHBWpgBEzeMY4LWfTRDwv1Z1w1UKhBQitjXZnngvrBLo55b7dFj1W53gh3zfmEkph4vje5
  https://explorer.solana.com/tx/3ucd6d4AWSy86Rm7LesHBWpgBEzeMY4LWfTRDwv1Z1w1UKhBQitjXZnngvrBLo55b7dFj1W53gh3zfmEkph4vje5?cluster=devnet
init 481422: 5gUKJLbimxK9ptfh3puqXCUfHduxdgCdEjKxBA94vmWHknYYYLLoF3HhKFUawF99L2V21DmxbGvTNdE9u3rA4eCi
  https://explorer.solana.com/tx/5gUKJLbimxK9ptfh3puqXCUfHduxdgCdEjKxBA94vmWHknYYYLLoF3HhKFUawF99L2V21DmxbGvTNdE9u3rA4eCi?cluster=devnet
init 481423: 53HBasqoDf1KMFsC7hUmY9sMDx6mB4GwNozrNBatvpa4i8s9vqKbbG62L1LkRQtzsfecduZ31RNshNYsVBhWhxy8
  https://explorer.solana.com/tx/53HBasqoDf1KMFsC7hUmY9sMDx6mB4GwNozrNBatvpa4i8s9vqKbbG62L1LkRQtzsfecduZ31RNshNYsVBhWhxy8?cluster=devnet
bet outcome 0: 3WzZETARqdMwGJTDyfy3yJZzzZ5exrjV3eKaABMQHEgtE479aWxp9tD6xhTgceumHfVK5tdPTehGD7bCFGFfe8iS
  https://explorer.solana.com/tx/3WzZETARqdMwGJTDyfy3yJZzzZ5exrjV3eKaABMQHEgtE479aWxp9tD6xhTgceumHfVK5tdPTehGD7bCFGFfe8iS?cluster=devnet
bet outcome 1: 223HtEuk6gW5MKhAsLVa6USmcLTWgMy9jWNWKoCKe8vwf8WQk2WhRuH9Q9LjkcfiBGsss6MxM2cp3hzeiMjTYZFj
  https://explorer.solana.com/tx/223HtEuk6gW5MKhAsLVa6USmcLTWgMy9jWNWKoCKe8vwf8WQk2WhRuH9Q9LjkcfiBGsss6MxM2cp3hzeiMjTYZFj?cluster=devnet
bet outcome 0: 5iXuRDCJ4KMUrXLn36cueMkHTfP8Ke15MUbBRbLnDeWTTns4H15ApVZDHZqAHsCaNLoGmXZAdGSxj7smUPncYxhG
  https://explorer.solana.com/tx/5iXuRDCJ4KMUrXLn36cueMkHTfP8Ke15MUbBRbLnDeWTTns4H15ApVZDHZqAHsCaNLoGmXZAdGSxj7smUPncYxhG?cluster=devnet
bet outcome 1: 2UQezgqUxJJWZjDZqNSjWzEVP3mKmz1bVzUz1i7Q8SeQt1Ra8k45NKRhuLfcSCobsixq6q2nGa3DiUEFruafv8hq
  https://explorer.solana.com/tx/2UQezgqUxJJWZjDZqNSjWzEVP3mKmz1bVzUz1i7Q8SeQt1Ra8k45NKRhuLfcSCobsixq6q2nGa3DiUEFruafv8hq?cluster=devnet
bet outcome 1: Mbbh5FEeHLqs1fxidg9vw86Maz4w3wpwfSxXGnaHjYVQ5ewUfBpBzpJtKLFb5PeVBVRgUr7f1zsgcXzHPcUQ9nK
  https://explorer.solana.com/tx/Mbbh5FEeHLqs1fxidg9vw86Maz4w3wpwfSxXGnaHjYVQ5ewUfBpBzpJtKLFb5PeVBVRgUr7f1zsgcXzHPcUQ9nK?cluster=devnet
bet outcome 0: 4AL7CtMuyNMhWswPisnzK9DnhRofV1XkGw8pzvPjyp2vGzyyniPh1yqYCYapuFNQUovf1hsnrXeinP8LdUUuQ13N
  https://explorer.solana.com/tx/4AL7CtMuyNMhWswPisnzK9DnhRofV1XkGw8pzvPjyp2vGzyyniPh1yqYCYapuFNQUovf1hsnrXeinP8LdUUuQ13N?cluster=devnet
init 481424: 3d9zPrymEMQLdgi2UwbFjRJBnBKM43pgKoshqsXC7G4yY3ynuMk4Kdc3Uc5sGcAesTnTG4urAdSWf1hRF4VNNp7q
  https://explorer.solana.com/tx/3d9zPrymEMQLdgi2UwbFjRJBnBKM43pgKoshqsXC7G4yY3ynuMk4Kdc3Uc5sGcAesTnTG4urAdSWf1hRF4VNNp7q?cluster=devnet
init 481425: 2oC28SrFPPw1C8f4uSy7Nvkkt6GKx1xdmCXbjXC7YkNLPoaXKQbHaoHZuy4inpjZFatexbtAhQuRX3Dqn1ypcuSZ
  https://explorer.solana.com/tx/2oC28SrFPPw1C8f4uSy7Nvkkt6GKx1xdmCXbjXC7YkNLPoaXKQbHaoHZuy4inpjZFatexbtAhQuRX3Dqn1ypcuSZ?cluster=devnet
init 481426: 4ciQeSpA2JdmQ3u27ZD5Uhji26fKYkzuwrmRrJKC9sKdwngR6vJPKfnLznNfJdpYEsjTxEbVzh26rwfcHUL3VT6e
  https://explorer.solana.com/tx/4ciQeSpA2JdmQ3u27ZD5Uhji26fKYkzuwrmRrJKC9sKdwngR6vJPKfnLznNfJdpYEsjTxEbVzh26rwfcHUL3VT6e?cluster=devnet
T1 settle single-stat: 4gWe45Q74LHRiLh1yv3YUDf6rRxUMP3Gic6JMBruZN1XqHwjdEf13ErzNygyeHKyLKQiTWViL4axtzpYHKPUmUsN
  https://explorer.solana.com/tx/4gWe45Q74LHRiLh1yv3YUDf6rRxUMP3Gic6JMBruZN1XqHwjdEf13ErzNygyeHKyLKQiTWViL4axtzpYHKPUmUsN?cluster=devnet
T2 settle two-stat: 5b2NYByaYuCdz3xJhM2UoFwwgqNtBRHgwVftVgFozq6moQKdg1AfNp42MAReQqd4ery9LYLACZ2b5y347M4qCcGQ
  https://explorer.solana.com/tx/5b2NYByaYuCdz3xJhM2UoFwwgqNtBRHgwVftVgFozq6moQKdg1AfNp42MAReQqd4ery9LYLACZ2b5y347M4qCcGQ?cluster=devnet
T3 settle band: 4r9T3imD7jfpwsemA7gyGTo3ysncRE3cxC481yMfwiheHGemZWxggEYWjeSS5mLdKQqwXS81E4EVDyzgNikdsYTJ
  https://explorer.solana.com/tx/4r9T3imD7jfpwsemA7gyGTo3ysncRE3cxC481yMfwiheHGemZWxggEYWjeSS5mLdKQqwXS81E4EVDyzgNikdsYTJ?cluster=devnet
T1 claim: 3dPLXU2N5Ak8x3DS93jZzEfsmtSPUqtpmAP9RkYSr6Jc7ZQuD4NdYuboe7N4gH5Nz8G9wQZDV5wUa6rhyoQD2dAe
  https://explorer.solana.com/tx/3dPLXU2N5Ak8x3DS93jZzEfsmtSPUqtpmAP9RkYSr6Jc7ZQuD4NdYuboe7N4gH5Nz8G9wQZDV5wUa6rhyoQD2dAe?cluster=devnet
T2 claim: 5aXTakrhTjfpedRmWq6PgWDbjUG52ZqRQSyoXCzL5eLbTbgMvosvTuxdUCSrDKTfL9U57t8mUt1e2oogy6JJDYSx
  https://explorer.solana.com/tx/5aXTakrhTjfpedRmWq6PgWDbjUG52ZqRQSyoXCzL5eLbTbgMvosvTuxdUCSrDKTfL9U57t8mUt1e2oogy6JJDYSx?cluster=devnet
T3 claim: 5jmpuHm1t9aitUe3yeurpj3dGYTniKqqewMkqRuqeKC6THbCesdUDpKjifdmsfcdGebaiioS7hDNdyU9KBDX4r4U
  https://explorer.solana.com/tx/5jmpuHm1t9aitUe3yeurpj3dGYTniKqqewMkqRuqeKC6THbCesdUDpKjifdmsfcdGebaiioS7hDNdyU9KBDX4r4U?cluster=devnet

REVERTS
early settle -> SettleTooEarly
bet after close -> BettingClosed
wrong winner -> WrongWinner
fixture mismatch -> FixtureMismatch
stat mismatch -> StatKeyMismatch
double claim -> AlreadyClaimed
non-winner claim -> NothingToClaim
```

## Verification

- `npm run typecheck`: PASS
- `anchor build`: PASS
- `npm run stage2:e2e`: PASS

## Durable Account Evidence

| Template | Market PDA | Vault PDA | Live state expected |
|---|---|---|---|
| Single-stat over/under | `8JZmhpo2TEnbssA2RfDRbYwbvbawzHH5KeEiEZHNZv5w` | `342t8gWxytzF7m5wfzJjDX2BXfk6DPxnDQEhFQUQaemG` | `settled=true`, `winning_outcome=0` |
| Two-stat sum predicate | `4mThnf3THGCxN3rRfkxCqMhLfXYEz9d3XamSJHZ4Bq3i` | `5Za2pg1bxyEHsnYXUAZHGuQqBmE38SY1mSpN8fsxfg2Z` | `settled=true`, `winning_outcome=0` |
| Under/exact/over 3-way | `BeHTr9mTLxRNnyZtVVAaS5bmijJS8jMJ8PmLcCZC7HpW` | `6RU5bvuztUeoHNCk1Y3qe5CiBMu7iTqhKXHzQbDPD3oF` | `settled=true`, `winning_outcome=1` |

Committed transaction records:

```text
evidence/stage2-t1-init.json
evidence/stage2-t1-settle.json
evidence/stage2-t1-claim.json
evidence/stage2-t2-init.json
evidence/stage2-t2-settle.json
evidence/stage2-t2-claim.json
evidence/stage2-t3-init.json
evidence/stage2-t3-settle.json
evidence/stage2-t3-claim.json
```
