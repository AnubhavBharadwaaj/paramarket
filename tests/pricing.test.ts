import { test } from "node:test";
import assert from "node:assert/strict";
import { cost, costToBuy, DEFAULT_LIQUIDITY, price, WAD } from "../src/pricing/lmsr.ts";

const B = DEFAULT_LIQUIDITY;
const EPS = 10n;

function assertApprox(actual: bigint, expected: bigint, eps = EPS) {
  const diff = actual > expected ? actual - expected : expected - actual;
  assert.ok(diff <= eps, `expected ${actual} ~= ${expected} within ${eps}, diff=${diff}`);
}

function prices(q: bigint[]) {
  return q.map((_, i) => price(q, i, B));
}

test("known vectors: equal 2-way and 3-way markets", () => {
  assertApprox(cost([0n, 0n], B), 69_314_718_055_994_530_900n, 100n);
  assert.deepEqual(prices([0n, 0n]), [500_000_000_000_000_000n, 500_000_000_000_000_000n]);

  assertApprox(cost([0n, 0n, 0n], B), 109_861_228_866_810_967_900n, 100n);
  assert.deepEqual(prices([0n, 0n, 0n]), [
    333_333_333_333_333_333n,
    333_333_333_333_333_333n,
    333_333_333_333_333_333n,
  ]);
});

test("known vector: one 100-share buy moves a 2-way price to logistic(1)", () => {
  const q = [100n * WAD, 0n];
  assertApprox(price(q, 0, B), 731_058_578_630_004_879n, 100n);
  assertApprox(price(q, 1, B), 268_941_421_369_995_120n, 100n);
  assertApprox(costToBuy([0n, 0n], 0, 100n * WAD, B), 62_011_450_695_827_751_100n, 100n);
});

test("determinism: same buy sequence gives byte-identical path and final state", () => {
  const seq = [
    [0, 10n * WAD],
    [1, 7n * WAD],
    [0, 3n * WAD],
    [2, 11n * WAD],
    [1, 5n * WAD],
  ] as const;
  const run = () => {
    const q = [0n, 0n, 0n];
    const path = [];
    for (const [i, shares] of seq) {
      const quote = costToBuy(q, i, shares, B);
      q[i] += shares;
      path.push({ i, shares: shares.toString(), quote: quote.toString(), prices: prices(q).map(String) });
    }
    return JSON.stringify({ q: q.map(String), path });
  };
  assert.equal(run(), run());
});

test("property: prices sum to approximately one", () => {
  for (const q of [
    [0n, 0n],
    [20n * WAD, 5n * WAD],
    [3n * WAD, 9n * WAD, 12n * WAD],
    [75n * WAD, 12n * WAD, 41n * WAD],
  ]) {
    const sum = prices(q).reduce((a, x) => a + x, 0n);
    assertApprox(sum, WAD, BigInt(q.length));
  }
});

test("property: cost is monotonic as shares are added", () => {
  let q = [0n, 0n, 0n];
  let prev = cost(q, B);
  for (const [i, shares] of [
    [0, 1n * WAD],
    [1, 2n * WAD],
    [2, 3n * WAD],
    [0, 5n * WAD],
  ] as const) {
    q = q.slice();
    q[i] += shares;
    const next = cost(q, B);
    assert.ok(next >= prev, `${next} should be >= ${prev}`);
    prev = next;
  }
});

test("edge: 2-outcome and 3-outcome quotes are valid and ordered", () => {
  const two = prices([25n * WAD, 0n]);
  assert.ok(two[0] > two[1]);
  assertApprox(two[0] + two[1], WAD, 2n);

  const three = prices([0n, 10n * WAD, 20n * WAD]);
  assert.ok(three[2] > three[1]);
  assert.ok(three[1] > three[0]);
  assertApprox(three[0] + three[1] + three[2], WAD, 3n);
});
