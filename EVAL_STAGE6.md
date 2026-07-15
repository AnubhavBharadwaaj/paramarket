# EVAL_STAGE6.md

Adversarial Verification Lab: the good receipt proof still verifies, and each tamper runs the same no-wallet devnet simulation path with one corrupted field.

Command:

```bash
npm run probe:tampers
```

Captured devnet output on 2026-07-15:

```text
wrongTimestamp
diff: ts: 1783811701138 -> 1783811922740
guard: TimestampMismatch
error: {"InstructionError":[1,{"Custom":6010}]}
slot: 476429242
cu: 12064
log: Program log: AnchorError thrown in programs/txoracle/src/instructions/merkle/validate_stat.rs:25. Error Code: TimestampMismatch. Error Number: 6010. Error Message: The timestamp provided for seed generation does not match the timestamp in the snapshot payload..

wrongStatKey
diff: statA.key: 1002 -> 1001
guard: InvalidStatProof
error: {"InstructionError":[1,{"Custom":6023}]}
slot: 476429243
cu: 103047
log: Program log: AnchorError thrown in programs/txoracle/src/utils.rs:232. Error Code: InvalidStatProof. Error Number: 6023. Error Message: Invalid stats proof for event.

wrongFixture
diff: fixtureSummary.fixtureId: 18213979 -> 999999
guard: InvalidMainTreeProof
error: {"InstructionError":[1,{"Custom":6004}]}
slot: 476429243
cu: 41320
log: Program log: AnchorError thrown in programs/txoracle/src/instructions/merkle/validate_stat.rs:73. Error Code: InvalidMainTreeProof. Error Number: 6004. Error Message: Invalid main tree proof. The summary does not belong to the on-chain root..
```

Notes:

- `wrongFixture` does not return `FixtureMismatch`; TxOracle rejects earlier at main-tree proof validation with `InvalidMainTreeProof`.
- The good proof path in `simulateReceipt()` is unchanged.
- The deployed app uses only static proof assets plus Solana devnet RPC; there are no runtime TxLINE API calls.
