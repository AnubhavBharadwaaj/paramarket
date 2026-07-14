/**
 * Deterministic LMSR pricing in WAD fixed point.
 *
 * Architecture choice for Stage 3: LMSR powers off-chain live quotes and UI price
 * paths. Stage 2 settlement remains proof-gated parimutuel on-chain for auditability.
 */

export const WAD = 1_000_000_000_000_000_000n;
export const DEFAULT_LIQUIDITY = 100n * WAD;
const LN2_WAD = 693_147_180_559_945_309n;
const EXP_LIMIT = 40n * WAD;

export function cost(q: bigint[], b: bigint = DEFAULT_LIQUIDITY): bigint {
  validateInputs(q, b);
  const scaled = q.map((x) => divWad(x, b));
  const max = scaled.reduce((a, x) => (x > a ? x : a), scaled[0]);
  const sum = scaled.reduce((acc, x) => acc + expWad(x - max), 0n);
  return mulWad(b, max + lnWad(sum));
}

export function price(q: bigint[], i: number, b: bigint = DEFAULT_LIQUIDITY): bigint {
  validateInputs(q, b);
  if (!Number.isInteger(i) || i < 0 || i >= q.length) throw new Error("invalid option index");
  const scaled = q.map((x) => divWad(x, b));
  const max = scaled.reduce((a, x) => (x > a ? x : a), scaled[0]);
  const weights = scaled.map((x) => expWad(x - max));
  const sum = weights.reduce((a, x) => a + x, 0n);
  return (weights[i] * WAD) / sum;
}

export function costToBuy(
  q: bigint[],
  i: number,
  shares: bigint,
  b: bigint = DEFAULT_LIQUIDITY
): bigint {
  validateInputs(q, b);
  if (shares < 0n) throw new Error("shares must be non-negative");
  if (!Number.isInteger(i) || i < 0 || i >= q.length) throw new Error("invalid option index");
  const next = q.slice();
  next[i] += shares;
  return cost(next, b) - cost(q, b);
}

function validateInputs(q: bigint[], b: bigint) {
  if (q.length < 2) throw new Error("LMSR requires at least two outcomes");
  if (b <= 0n) throw new Error("liquidity b must be positive");
}

function mulWad(a: bigint, b: bigint): bigint {
  return (a * b) / WAD;
}

function divWad(a: bigint, b: bigint): bigint {
  return (a * WAD) / b;
}

function expWad(x: bigint): bigint {
  if (x > EXP_LIMIT || x < -EXP_LIMIT) throw new Error("exp input outside supported range");
  const k = floorDiv(x, LN2_WAD);
  const r = x - k * LN2_WAD;
  let term = WAD;
  let sum = WAD;
  for (let n = 1n; n <= 36n; n++) {
    term = (term * r) / WAD / n;
    if (term === 0n) break;
    sum += term;
  }
  return k >= 0n ? sum * pow2(k) : sum / pow2(-k);
}

function lnWad(x: bigint): bigint {
  if (x <= 0n) throw new Error("ln input must be positive");
  let k = 0n;
  let y = x;
  while (y >= 2n * WAD) {
    y /= 2n;
    k++;
  }
  while (y < WAD) {
    y *= 2n;
    k--;
  }

  const z = divWad(y - WAD, y + WAD);
  const z2 = mulWad(z, z);
  let term = z;
  let sum = 0n;
  for (let n = 1n; n <= 99n; n += 2n) {
    sum += term / n;
    term = mulWad(term, z2);
    if (term === 0n) break;
  }
  return k * LN2_WAD + 2n * sum;
}

function floorDiv(a: bigint, b: bigint): bigint {
  const q = a / b;
  const r = a % b;
  return r !== 0n && (r > 0n) !== (b > 0n) ? q - 1n : q;
}

function pow2(k: bigint): bigint {
  let out = 1n;
  for (let i = 0n; i < k; i++) out *= 2n;
  return out;
}
