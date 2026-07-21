# Feature Gap Sweep — Prediction Markets Track

No official top-10 ranking is public before judging, so this uses the strongest visible field patterns from the public/live products we inspected.

| Feature competitors show | Seen in | In ParaMarket now? | Build decision | Why |
| --- | --- | --- | --- | --- |
| Dense multi-screen dashboard | Ninety-style terminal products | Yes | Adapted | We split the judge flow into Board, Challenge, Replay, Markets, Proofs, and Evidence so each screen has one inspection job. |
| One-decision cold open | Gaffer-style consumer flow | Yes | Adapted | The first-run flow asks one question: "Can you make a fake proof pass?" This gives immediacy without copying social/game mechanics. |
| Replay commentary around match swings | Ninety "Booth" pattern | Yes | Adapted | Replay Booth explains the exact Over 2.5 journey: 0-0 live, 1-0 pressure, 1-1 one goal resolves, 1-2 locked. |
| Wallet-free browser verifier | TxSettle-class proof panel | Yes | Exceeded | ParaMarket verifies the good receipt and lets judges tamper timestamp/stat/fixture against the same verifier. |
| Distinct failure reasons for forged proofs | Rare in field | Yes | Differentiator | TimestampMismatch, InvalidStatProof, and InvalidMainTreeProof are surfaced as real guard names, not generic errors. |
| Market/account state reader | Infra-heavy projects | Yes | Adapted | Market PDA state survives devnet transaction pruning and is decoded without a wallet. |
| Durable evidence packet | Docs-heavy submissions | Yes | Adapted | Receipt proof, transaction JSON, PDA links, settlement tx, and deployed URL are grouped in one evidence workspace. |
| Leaderboards, streaks, squads, social | Consumer-game entries | No | Skipped | Good retention mechanics, weak settlement-track signal. Judges are not returning daily users. |
| Free-text market creation | Consumer prediction apps | No | Skipped | Adds unproven market breadth. The product is stronger by proving a narrow parametric settlement path end to end. |
| Wallet betting/account portfolio | Trading-like terminals | No | Skipped | Would add wallet friction to the sacred wallet-free verification path and does not improve proof legibility. |
| validate_stat_v2 migration | Some proof experiments | No | Skipped for submission | ParaMarket's current invariant is audit-clean: minTimestamp is bound on-chain and proven by the tamper lab. |

Verdict: the features worth taking are packaging, guided flow, commentary, account-state durability, and evidence organization. The features worth rejecting are consumer retention loops and unproven breadth.
