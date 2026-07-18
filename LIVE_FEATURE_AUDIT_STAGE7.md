# Stage 7 Live Feature Audit

Read-only probe on July 18, 2026. Rule: only features that loaded or responded on the deployed URL count. Anything locked behind login, marked pending/disabled/prototype-only, or unrelated to proof-settled markets is treated as a non-goal.

| Feature | Who Has It | Works Live? | Should We Build It? | Why |
| --- | --- | --- | --- | --- |
| One-decision cold open | Gaffer | Yes | Yes, adapted | The first screen is instantly legible. We adapted the rhythm into a proof challenge: verify good proof, then break it. |
| Guided goals/checklist | Gaffer | Yes | Yes, adapted | Their goals make the product feel intentional. We adapted it as a judge-run checklist driven by proof actions. |
| Consumer streaks/freezes/boosters | Gaffer | Yes | No | Retention mechanics. A judge opens once for proof quality, not daily play loops. |
| Micro-market cards and room percentages | Gaffer | Yes | No | Good consumer immediacy, but it pushes toward breadth and betting UI. Our edge is falsifiable settlement proof. |
| Free-text “ask your own” market prompt | Gaffer | Visible | No | Explicit non-goal. It risks unprovable market claims and adds no proof credibility. |
| Full terminal board with live match list | Ninety terminal | Yes, fixture-data UI | No | Visually rich, but broad consumer trading UX. We already have the narrower board a judge needs. |
| Replay Booth / commentary for price moves | Ninety | Yes | Already built, tightened | Deterministic replay copy gives the price path emotional clarity; ours now ties the locked state to settlement. |
| Dedicated pages for board, competition, bracket, account, leaders, moments, history, proofs | Ninety | Yes | Partially, already built | We split our proof product into Challenge, Replay, Markets, Proofs, Evidence. We should not chase tournament breadth. |
| Proofs page | Ninety | Yes, but proof pending/settlement disabled | No extra breadth | It is a useful contrast, not a target. Our product now highlights proof live vs proof pending without naming competitors. |
| Live market/program account cards | TxSettle | Yes | Already built | TxSettle exposes markets and program links. Our Markets screen and Evidence packet already cover durable state and tx artifacts. |
| Wallet-free proof panel / settled market proof | TxSettle | Yes | Exceed, do not copy | We already match the primitive and now exceed it with adversarial tamper rejection plus a cold-open proof challenge. |
| Wallet connect / token pool betting | TxSettle | Yes | No | Settlement track judge value is proof path, not a new wallet betting flow this late. |
| Login-gated dashboard | TrueBook URL probed | Login page only | No | No public working judge mode/tickets found at the deployed URL tested. |
| AI benchmark receipt/replay page | ProofMarket URL probed | Yes, unrelated domain | Pattern only | The receipt/replay framing is strong. We already have wallet-free receipt verification and Evidence packet; no AI benchmark features apply. |
| Login-gated app | Whistly URL probed | Login page only | No | No public working micro-market flow available without auth at the deployed URL tested. |

## Build Decisions From The Sweep

- Built/adapted: cold-open proof challenge, progress checklist, proof-live contrast panel, Evidence naming with guard names.
- Skipped deliberately: streaks, social loops, boosters, leaderboards, free-text markets, tournament bracket/account breadth, wallet betting rewrites.
- Product stance: ParaMarket should feel guided like a consumer app, but every interaction must make the settlement proof more legible.
