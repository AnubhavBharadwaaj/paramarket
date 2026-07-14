export const spikeIdl = {
  address: "CWCzF6shQBeGYNJcwip62WvoBM1P6QHCbnGm5MB3c8Pm",
  metadata: {
    name: "paramarketSpike",
    version: "0.1.0",
    spec: "0.1.0",
  },
  instructions: [
    {
      name: "settleSpike",
      discriminator: [21, 28, 39, 96, 40, 193, 30, 224],
      accounts: [{ name: "dailyScoresMerkleRoots" }, { name: "txoracleProgram" }],
      args: [{ name: "args", type: { defined: { name: "validateStatArgs" } } }],
      returns: "bool",
    },
  ],
  types: [
    {
      name: "binaryExpression",
      type: { kind: "enum", variants: [{ name: "add" }, { name: "subtract" }] },
    },
    {
      name: "comparison",
      type: {
        kind: "enum",
        variants: [{ name: "greaterThan" }, { name: "lessThan" }, { name: "equalTo" }],
      },
    },
    {
      name: "proofNode",
      type: {
        kind: "struct",
        fields: [
          { name: "hash", type: { array: ["u8", 32] } },
          { name: "isRightSibling", type: "bool" },
        ],
      },
    },
    {
      name: "scoreStat",
      type: {
        kind: "struct",
        fields: [
          { name: "key", type: "u32" },
          { name: "value", type: "i32" },
          { name: "period", type: "i32" },
        ],
      },
    },
    {
      name: "scoresBatchSummary",
      type: {
        kind: "struct",
        fields: [
          { name: "fixtureId", type: "i64" },
          { name: "updateStats", type: { defined: { name: "scoresUpdateStats" } } },
          { name: "eventsSubTreeRoot", type: { array: ["u8", 32] } },
        ],
      },
    },
    {
      name: "scoresUpdateStats",
      type: {
        kind: "struct",
        fields: [
          { name: "updateCount", type: "i32" },
          { name: "minTimestamp", type: "i64" },
          { name: "maxTimestamp", type: "i64" },
        ],
      },
    },
    {
      name: "statTerm",
      type: {
        kind: "struct",
        fields: [
          { name: "statToProve", type: { defined: { name: "scoreStat" } },
          },
          { name: "eventStatRoot", type: { array: ["u8", 32] } },
          { name: "statProof", type: { vec: { defined: { name: "proofNode" } } } },
        ],
      },
    },
    {
      name: "traderPredicate",
      type: {
        kind: "struct",
        fields: [
          { name: "threshold", type: "i32" },
          { name: "comparison", type: { defined: { name: "comparison" } } },
        ],
      },
    },
    {
      name: "validateStatArgs",
      type: {
        kind: "struct",
        fields: [
          { name: "ts", type: "i64" },
          { name: "fixtureSummary", type: { defined: { name: "scoresBatchSummary" } } },
          { name: "fixtureProof", type: { vec: { defined: { name: "proofNode" } } } },
          { name: "mainTreeProof", type: { vec: { defined: { name: "proofNode" } } } },
          { name: "predicate", type: { defined: { name: "traderPredicate" } } },
          { name: "statA", type: { defined: { name: "statTerm" } } },
          { name: "statB", type: { option: { defined: { name: "statTerm" } } } },
          { name: "op", type: { option: { defined: { name: "binaryExpression" } } } },
        ],
      },
    },
  ],
} as const;
