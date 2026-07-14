# BUILD_SPEC.md — ParaMarket (Prediction Markets & Settlement, $12k)

Handoff for Codex/Claude Code with a terminal (anchor/solana/devnet API).
Stage 0 (auth + dual-feed ingest) is DONE and green on devnet. Build Stages
1->4 in order; don't advance past a stage until its eval gate passes.

## STRATEGY (read first — this is not an "invent a new primitive" build)

Full 33-repo recon is done. NO differentiator is unclaimed: LMSR pricing,
parametric predicates, and validate_stat settlement are ALL already built by
finished competitors. We are NOT trying to out-idea them. **We win on EXECUTION
and COMPLETENESS** — being the one submission that does the whole chain
correctly AND ships a clean, demo-able product, because the rubric weights
"User Experience" and is "judged heavily on the demo video."

### The competitor to beat: `Blessedbiello/finalwhistle`
- HAS: real LMSR (`lmsr.rs`), multi market-type state (match result, over/under,
  draw-no-bet, sum-threshold), real validate_stat CPI with correct per-epoch PDA.
- WEAK (our openings):
  1. **Frontend is empty (0 .tsx components — Vite boilerplate).** No product to
     demo on the axis the rubric weights most. THIS IS THE #1 OPENING.
  2. Has a `mock-txoracle` — likely demos settlement against a MOCK, not the real
     devnet txoracle. We settle against real `6pW64...` with a live explorer tx.
  3. No live deployed demo/video link. Programs-first, product-thin.

### Our win = finalwhistle's core, done + the product it lacks
- Match core: LMSR + parametric markets + real validate_stat settlement.
- BEAT on: (a) a clean working market UI with live SSE-driven prices; (b) a
  one-click **client-side verifiable-resolution receipt** (simulateTransaction
  re-verify, zero backend) — the 10-sec judge hook; (c) settle against REAL
  devnet txoracle on camera, not a mock; (d) evals at every stage.

## KEY UNBLOCKS (Codex hit these last session — both solved, verified against 2 competitors)

1. **daily_scores_roots PDA is PER-DAY.** Codex's AccountNotFound came from
   omitting the epoch buffer. Correct derivation (confirmed identical in both
   doxoracle and finalwhistle):
       epochDay = floor(ts_ms / 86_400_000)              // u16
       seeds = [ "daily_scores_roots", u16_le(epochDay) ]
       PDA = findProgramAddress(seeds, TXORACLE_PROGRAM_ID)
   The account only exists for days with anchored score data — derive it for the
   fixture's day, and that day must have roots inserted (use a historical fixture
   whose day already has roots; see historical endpoint below).

2. **Proof endpoint needs query params (bare path 404s):**
       GET /api/scores/stat-validation?fixtureId={id}&seq={seq}&statKey={key}[&statKey2={key2}]
   Also: GET /api/scores/snapshot/{fixtureId}  and
         GET /api/scores/historical/{fixtureId}  (for replay).
   `doxoracle/scripts/resolve-verified.mjs` is a COMPLETE working reference for
   fetch-validation -> derive-PDA -> CPI. Study it before writing the spike.

## Ground truth (reuse Stage 0)
- IDL: idl/txoracle_devnet.json. Devnet program 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J.
- Auth + dual feed DONE: src/client/{config,auth,subscribe,stream}.ts; activation
  via src/client/activate.ts -> .txline-token.json. Token-2022 ATA auto-created
  in subscribe.ts (Codex already fixed this — keep it).
- Predicate model: TraderPredicate{threshold:i32, comparison}, Comparison=
  GreaterThan|LessThan|EqualTo, BinaryExpression=Add|Subtract (two-stat),
  StatTerm{stat_to_prove:ScoreStat,...}. validate_stat(ts, fixture_summary,
  fixture_proof, main_tree_proof, predicate, stat_a, stat_b?, op?) -> bool.
- Stat keys: goals home/away 1002/1003; period mult +1000 (H1)/+2000 (H2);
  corners/cards keys per Soccer Feed doc — pull the table before hardcoding.

## STAGE 1 — settlement CPI spike (DE-RISK; Codex ~80% done, finish it)
Codex deployed paramarket_spike (CWCzF6shQBeGYNJcwip62WvoBM1P6QHCbnGm5MB3c8Pm),
CPI reaches TxOracle.ValidateStat, but failed on the PDA (now fixed above).
FINISH: with the correct per-epoch PDA + a real proof bundle from a HISTORICAL
fixture whose day has roots, get validate_stat to return TRUE and FALSE for a
TWO-stat predicate.
**Eval gate:** devnet tx, our program CPIs validate_stat for a 2-stat predicate,
reads TRUE and FALSE correctly, tx sigs in explorer. If impossible after using
the correct PDA + a real historical proof, STOP and report.

## STAGE 2 — parametric market program (Anchor)
initialize_market(fixture_id, MarketSpec) — templated, NOT hardcoded:
match-result, over/under any stat, range/band, two-stat (BinaryExpression).
settle_with_proof(...) rebuilds THIS market's predicate + CPIs validate_stat;
release on TRUE, revert on wrong/early/mismatch. claim() pays per pricing (S3).
Reference finalwhistle's fw-markets/state.rs for the market-type shape.
**Eval gate:** anchor test on devnet — init 3 different templates (corners O/U,
two-stat prop, goal band), bet, settle each via proof, claim. Tx sigs. Negatives:
wrong winner reverts; settle-before-min_final_ts reverts; predicate mismatch reverts.

## STAGE 3 — deterministic LMSR pricing (pure, on-chain-parity)
src/pricing/lmsr.ts — pure fns cost(q), price(q,i), costToBuy(q,i,shares),
fixed-point WAD/integer math. Fixed liquidity param b. Mirror in-program for
buy/sell OR off-chain w/ on-chain invariant checks (document choice; watch CU).
Reference finalwhistle's lmsr.rs (cost_wad/buy_cost) for the WAD approach.
**Eval gate (the rubric's "deterministic" point):** unit tests known q->exact
price; determinism test (replay same bet seq twice -> byte-identical path);
property test (prices sum ~1, cost monotonic).

## STAGE 4 — the product finalwhistle lacks (THIS is where we win)
- src/keeper/keeper.ts: watch dual feed (reuse stream.ts), on resolve fetch proof
  + settle_with_proof unattended.
- **Verifiable resolution receipt page**: re-verify score proof client-side via
  simulateTransaction, zero backend. THE 10-sec hook.
- **Clean market UI** (React): create/take a prop, live LMSR prices from SSE,
  resolution + receipt. This is the axis finalwhistle scores ~0 on — do it well.
- Demo (<=5 min): (1) hook; (2) create a two-stat prop; (3) live pricing;
  (4) trustless settle via REAL devnet validate_stat w/ explorer tx (NOT a mock);
  (5) client-side receipt re-verify; (6) determinism replay-twice-identical.
**Eval gate:** end-to-end devnet+replay: create->price->bet->resolve->claim->
re-verify receipt. Demo checklist all green.

## Demo = win condition
Matches end at submission close -> build on HISTORICAL replay so it works with no
live match during review. Must show: parametric market richer than 3-way,
deterministic pricing (twice identical), REAL validate_stat settlement w/ explorer
tx, client-side receipt verify, and a UI a judge can watch work. If it can't beat
finalwhistle on UX + a real (non-mock) settlement demo, it hasn't won.

## Submission checklist
- [ ] Demo video <=5 min (Loom/YouTube) — required to pass screening
- [ ] Public GitHub repo
- [ ] Deployed link OR functional devnet endpoint judges can test (no funds needed)
- [ ] Brief technical doc: idea + highlights + TxLINE endpoints used
- [ ] Feedback note on TxLINE API
- [ ] Owned by a real person/team (max 3); NEW project built for this hackathon