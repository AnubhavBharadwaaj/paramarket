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
import { loadReceiptProof, simulateReceipt, type VerifyResult } from "../lib/receiptVerifier";

type ProofAsset = Awaited<ReturnType<typeof loadReceiptProof>>;

type RevealState = "idle" | "reconstructing" | "verified" | "failed";

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
  const verified = result?.ok === true;

  async function verify() {
    if (!proof) return;

    if (result) {
      skipRef.current = true;
      setRevealState(result.ok ? "verified" : "failed");
      setActiveStep(4);
      setRevealedNodes(proofNodes.length);
      return;
    }

    skipRef.current = false;
    setLoading(true);
    setError(null);
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

  const steps = [
    "Fetch proof",
    "Rebuild Merkle path",
    "Evaluate predicate",
    "Simulate TxOracle CPI",
    result?.ok ? "Verified on-chain" : "Await return value",
  ];

  return (
    <section className="receipt-panel" aria-labelledby="receipt-title">
      <div className="panel-kicker">
        <ShieldCheck size={18} />
        wallet-free receipt verification
      </div>
      <div className="receipt-grid">
        <div>
          <h1 id="receipt-title">Don't trust our oracle. Verify the result yourself.</h1>
          <p className="lead">
            Click verify to simulate the deployed devnet CPI path against TxOracle. No wallet, no signer,
            no private key. The browser rebuilds the exact `settle_spike` instruction from the receipt proof.
          </p>
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
        </div>
        <div className={`proof-reconstruction ${revealState}`}>
          <div className="receipt-top" aria-hidden="true" />
          <div className="status-line">
            <span className={verified ? "dot good" : revealState === "failed" ? "dot bad" : "dot"} />
            {verified ? "Verified on devnet simulation" : loading ? "Reconstructing proof" : "Ready to verify"}
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
            <strong className={activeStep >= 2 ? "lit" : ""}>
              {proof && activeStep >= 2
                ? `${proof.proof.statToProve.value} + ${proof.proof.statToProve2.value} == ${sum}`
                : "pending"}
            </strong>
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

          <div className={`paper-receipt ${verified ? "verified" : ""}`}>
            <div className="receipt-title">
              <ReceiptText size={17} />
              ParaMarket proof receipt
            </div>
            <dl>
              <div>
                <dt>Predicate</dt>
                <dd>{predicate}</dd>
              </div>
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
                <dd>{result ? String(result.returnValue) : activeStep >= 3 ? "simulating..." : "pending"}</dd>
              </div>
              <div>
                <dt>Slot</dt>
                <dd>{result ? result.slot.toLocaleString() : "-"}</dd>
              </div>
              <div>
                <dt>Compute</dt>
                <dd>{result?.unitsConsumed ? `${result.unitsConsumed.toLocaleString()} CU` : "-"}</dd>
              </div>
            </dl>
            <div className={`verified-stamp ${verified ? "show" : revealState === "failed" ? "fail" : ""}`}>
              {verified ? (
                <>
                  <CheckCircle2 size={18} />
                  VERIFIED ON-CHAIN
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

      {result && (
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
