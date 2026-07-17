"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FastForward,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";
import {
  DAILY_ROOT_PDA,
  explorerTx,
  RECEIPT_SETTLEMENT_TX,
  STAGE1_TRUE_TX,
  TXORACLE_PROGRAM_ID,
} from "../lib/constants";
import {
  loadReceiptProof,
  simulateReceipt,
  simulateTamperedReceipt,
  type TamperKind,
  type TamperResult,
  type VerifyResult,
} from "../lib/receiptVerifier";

type ProofAsset = Awaited<ReturnType<typeof loadReceiptProof>>;

type RevealState = "idle" | "reconstructing" | "verified" | "failed";

const tamperOptions: Array<{
  kind: TamperKind;
  label: string;
  expected: string;
  description: string;
}> = [
  {
    kind: "wrongTimestamp",
    label: "Wrong timestamp",
    expected: "TimestampMismatch",
    description: "minTimestamp -> raw API ts",
  },
  {
    kind: "wrongStatKey",
    label: "Wrong stat key",
    expected: "InvalidStatProof",
    description: "stat 1002 -> stat 1001",
  },
  {
    kind: "wrongFixture",
    label: "Wrong fixture",
    expected: "InvalidMainTreeProof",
    description: "fixture 18213979 -> 999999",
  },
];

function sleep(ms: number, skipRef: MutableRefObject<boolean>) {
  if (skipRef.current || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashLabel(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export function ReceiptVerifier() {
  const [proof, setProof] = useState<ProofAsset | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [tamperResult, setTamperResult] = useState<TamperResult | null>(null);
  const [activeTamper, setActiveTamper] = useState<TamperKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealState, setRevealState] = useState<RevealState>("idle");
  const [activeStep, setActiveStep] = useState(-1);
  const [revealedNodes, setRevealedNodes] = useState(0);
  const skipRef = useRef(false);

  useEffect(() => {
    loadReceiptProof().then(setProof).catch((err) => setError(err.message));
  }, []);

  const predicate = useMemo(() => {
    if (!proof) return "loading proof...";
    const p = proof.proof;
    return `stat ${p.statToProve.key} + stat ${p.statToProve2.key} == ${
      p.statToProve.value + p.statToProve2.value
    }`;
  }, [proof]);

  const proofNodes = useMemo(() => {
    if (!proof) return [];
    const p = proof.proof;
    return [
      ...p.statProof.map((node, index) => ({
        label: `stat ${p.statToProve.key} proof ${index + 1}`,
        hash: hashLabel(node.hash),
        side: node.isRightSibling ? "right" : "left",
      })),
      { label: "stat root", hash: hashLabel(p.eventStatRoot), side: "root" },
      ...p.statProof2.map((node, index) => ({
        label: `stat ${p.statToProve2.key} proof ${index + 1}`,
        hash: hashLabel(node.hash),
        side: node.isRightSibling ? "right" : "left",
      })),
      ...p.subTreeProof.map((node, index) => ({
        label: `fixture subtree ${index + 1}`,
        hash: hashLabel(node.hash),
        side: node.isRightSibling ? "right" : "left",
      })),
      ...p.mainTreeProof.map((node, index) => ({
        label: `daily tree ${index + 1}`,
        hash: hashLabel(node.hash),
        side: node.isRightSibling ? "right" : "left",
      })),
      { label: "daily root PDA", hash: `${DAILY_ROOT_PDA.slice(0, 8)}...${DAILY_ROOT_PDA.slice(-4)}`, side: "pda" },
    ];
  }, [proof]);

  const sum = proof ? proof.proof.statToProve.value + proof.proof.statToProve2.value : 0;
  const verified = result?.ok === true && !tamperResult;
  const rejected = Boolean(tamperResult);

  async function verify() {
    if (!proof) return;

    if (result) {
      setTamperResult(null);
      setActiveTamper(null);
      skipRef.current = true;
      setRevealState(result.ok ? "verified" : "failed");
      setActiveStep(4);
      setRevealedNodes(proofNodes.length);
      return;
    }

    skipRef.current = false;
    setLoading(true);
    setError(null);
    setTamperResult(null);
    setActiveTamper(null);
    setResult(null);
    setRevealState("reconstructing");
    setActiveStep(0);
    setRevealedNodes(0);
    try {
      await sleep(480, skipRef);
      setActiveStep(1);
      for (let index = 1; index <= proofNodes.length; index += 1) {
        setRevealedNodes(index);
        await sleep(index === proofNodes.length ? 180 : 70, skipRef);
      }
      await sleep(260, skipRef);
      setActiveStep(2);
      await sleep(520, skipRef);
      setActiveStep(3);
      const simulation = await simulateReceipt(proof);
      setResult(simulation);
      setActiveStep(4);
      setRevealState(simulation.ok ? "verified" : "failed");
    } catch (err) {
      setActiveStep(4);
      setRevealState("failed");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function skipAnimation() {
    skipRef.current = true;
    setRevealedNodes(proofNodes.length);
    if (activeStep < 3) setActiveStep(3);
  }

  async function tamper(kind: TamperKind) {
    if (!proof || loading) return;
    skipRef.current = false;
    setLoading(true);
    setError(null);
    setTamperResult(null);
    setActiveTamper(kind);
    setRevealState("reconstructing");
    setActiveStep(0);
    setRevealedNodes(0);
    try {
      await sleep(320, skipRef);
      setActiveStep(1);
      for (let index = 1; index <= proofNodes.length; index += 1) {
        setRevealedNodes(index);
        await sleep(index === proofNodes.length ? 120 : 48, skipRef);
      }
      setActiveStep(2);
      await sleep(360, skipRef);
      setActiveStep(3);
      const rejectedProof = await simulateTamperedReceipt(proof, kind);
      setTamperResult(rejectedProof);
      setActiveStep(4);
      setRevealState("failed");
    } catch (err) {
      setActiveStep(4);
      setRevealState("failed");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function restoreGoodProof() {
    setTamperResult(null);
    setActiveTamper(null);
    setError(null);
    if (result) {
      setRevealState("verified");
      setActiveStep(4);
      setRevealedNodes(proofNodes.length);
      return;
    }
    await verify();
  }

  const steps = [
    "Fetch proof",
    "Rebuild Merkle path",
    "Evaluate predicate",
    "Simulate TxOracle CPI",
    tamperResult ? "Rejected by chain" : result?.ok ? "Verified on-chain" : "Await return value",
  ];
  const activeTamperCopy = tamperOptions.find((option) => option.kind === activeTamper);
  const predicateResultText = tamperResult
    ? tamperResult.guardName
    : activeTamperCopy && activeStep >= 2
      ? activeTamperCopy.expected
      : proof && activeStep >= 2
        ? `${proof.proof.statToProve.value} + ${proof.proof.statToProve2.value} == ${sum}`
        : "pending";

  return (
    <section className="receipt-panel" aria-labelledby="receipt-title">
      <div className="panel-kicker">
        <ShieldCheck size={18} />
        wallet-free receipt verification
      </div>
      <div className="receipt-grid">
        <div>
          <h1 id="receipt-title">Can you make this fake proof pass?</h1>
          <p className="lead">
            Good proof verifies. One corrupted field fails. Same verifier, same TxOracle, no wallet.
          </p>
          <div className="falsifiability-line">
            <span>GOOD PROOF -&gt; TRUE</span>
            <span>WRONG TIMESTAMP -&gt; TimestampMismatch</span>
            <span>WRONG STAT -&gt; InvalidStatProof</span>
            <span>WRONG FIXTURE -&gt; InvalidMainTreeProof</span>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={verify} disabled={!proof || loading}>
              {loading ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
              {loading ? "Reconstructing..." : result ? "Show verified receipt" : "Verify receipt"}
            </button>
            {loading && (
              <button className="link-button" type="button" onClick={skipAnimation}>
                <FastForward size={16} />
                Skip animation
              </button>
            )}
            <a className="link-button" href={explorerTx(RECEIPT_SETTLEMENT_TX)} target="_blank" rel="noreferrer">
              Settlement tx
              <ExternalLink size={16} />
            </a>
          </div>

          <div className="tamper-panel">
            <div>
              <strong>Green checks are easy. Falsifiability is harder.</strong>
              <p>Change one field. Same verifier. Chain rejects it.</p>
            </div>
            <div className="tamper-actions">
              {tamperOptions.map((option) => (
                <button
                  className={activeTamper === option.kind ? "tamper-button active" : "tamper-button"}
                  disabled={!proof || loading}
                  key={option.kind}
                  onClick={() => tamper(option.kind)}
                  type="button"
                >
                  <span>{option.label}</span>
                  <small>{option.description}</small>
                </button>
              ))}
              <button className="tamper-button restore" disabled={!proof || loading} onClick={restoreGoodProof} type="button">
                <span>Restore good proof</span>
                <small>return to VERIFIED</small>
              </button>
            </div>
          </div>
        </div>
        <div className={`proof-reconstruction ${revealState}`}>
          <div className="receipt-top" aria-hidden="true" />
          <div className="status-line">
            <span className={verified ? "dot good" : revealState === "failed" ? "dot bad" : "dot"} />
            {verified
              ? "Verified on devnet simulation"
              : rejected
                ? "Rejected by devnet simulation"
                : loading
                  ? "Reconstructing proof"
                  : "Ready to verify"}
          </div>

          <div className="proof-steps" aria-label="Verification steps">
            {steps.map((step, index) => (
              <div
                className={`proof-step ${index < activeStep ? "done" : ""} ${index === activeStep ? "active" : ""}`}
                key={step}
              >
                <span>{index + 1}</span>
                {step}
              </div>
            ))}
          </div>

          <div className="predicate-strip">
            <span>{activeStep >= 0 ? predicate : "proof waits inside the receipt"}</span>
            <strong className={activeStep >= 2 ? "lit" : ""}>{predicateResultText}</strong>
          </div>

          <div className="merkle-ladder" aria-label="Merkle proof path">
            {proofNodes.map((node, index) => (
              <div className={`merkle-node ${index < revealedNodes ? "visible" : ""}`} key={`${node.label}-${index}`}>
                <span>{node.label}</span>
                <code>{node.hash}</code>
                <em>{node.side}</em>
              </div>
            ))}
          </div>

          <div className={`paper-receipt ${verified ? "verified" : rejected ? "rejected" : ""}`}>
            <div className="receipt-title">
              <ReceiptText size={17} />
              {rejected ? "Tampered proof receipt" : "ParaMarket proof receipt"}
            </div>
            <dl>
              <div>
                <dt>Predicate</dt>
                <dd>{predicate}</dd>
              </div>
              {(tamperResult || activeTamperCopy) && (
                <div>
                  <dt>Tamper</dt>
                  <dd>{tamperResult?.diff ?? activeTamperCopy?.description}</dd>
                </div>
              )}
              <div>
                <dt>Daily root PDA</dt>
                <dd>{DAILY_ROOT_PDA.slice(0, 12)}...{DAILY_ROOT_PDA.slice(-6)}</dd>
              </div>
              <div>
                <dt>TxOracle</dt>
                <dd>{TXORACLE_PROGRAM_ID.toBase58().slice(0, 12)}...</dd>
              </div>
              <div>
                <dt>Return</dt>
                <dd>{tamperResult ? "false / error" : result ? String(result.returnValue) : activeStep >= 3 ? "simulating..." : "pending"}</dd>
              </div>
              {tamperResult && (
                <div>
                  <dt>Guard</dt>
                  <dd>{tamperResult.guardName}</dd>
                </div>
              )}
              <div>
                <dt>Slot</dt>
                <dd>{tamperResult ? tamperResult.slot.toLocaleString() : result ? result.slot.toLocaleString() : "-"}</dd>
              </div>
              <div>
                <dt>Compute</dt>
                <dd>
                  {tamperResult?.unitsConsumed
                    ? `${tamperResult.unitsConsumed.toLocaleString()} CU`
                    : result?.unitsConsumed
                      ? `${result.unitsConsumed.toLocaleString()} CU`
                      : "-"}
                </dd>
              </div>
            </dl>
            <div className={`verified-stamp ${verified ? "show" : revealState === "failed" ? "fail" : ""}`}>
              {verified ? (
                <>
                  <CheckCircle2 size={18} />
                  VERIFIED ON-CHAIN
                </>
              ) : rejected ? (
                <>
                  <XCircle size={18} />
                  REJECTED BY CHAIN
                </>
              ) : revealState === "failed" ? (
                <>
                  <XCircle size={18} />
                  VERIFICATION FAILED
                </>
              ) : (
                "AWAITING SIMULATION"
              )}
            </div>
          </div>

          {!loading && !result && !error && (
            <p className="proof-hint">Click once to rebuild the receipt proof path; repeat clicks reveal instantly.</p>
          )}
          {loading && activeStep >= 3 && (
            <p className="proof-hint">Simulating validate_stat against TxOracle {TXORACLE_PROGRAM_ID.toBase58().slice(0, 6)}...</p>
          )}
        </div>
      </div>

      {result && !tamperResult && (
        <div className="verify-output">
          <div className="output-head">
            <Terminal size={17} />
            return value: <strong>{String(result.returnValue)}</strong>
            <span>slot {result.slot.toLocaleString()}</span>
            {result.unitsConsumed ? <span>{result.unitsConsumed.toLocaleString()} CU</span> : null}
          </div>
          <pre>{result.verdictLog}</pre>
        </div>
      )}
      {tamperResult && (
        <div className="verify-output rejected-output">
          <div className="output-head">
            <XCircle size={17} />
            guard: <strong>{tamperResult.guardName}</strong>
            <span>slot {tamperResult.slot.toLocaleString()}</span>
            {tamperResult.unitsConsumed ? <span>{tamperResult.unitsConsumed.toLocaleString()} CU</span> : null}
          </div>
          <pre>{tamperResult.guardLog}</pre>
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
      <p className="source-line">
        Stage 1 proof tx:{" "}
        <a href={explorerTx(STAGE1_TRUE_TX)} target="_blank" rel="noreferrer">
          {STAGE1_TRUE_TX.slice(0, 10)}...
        </a>
      </p>
    </section>
  );
}
