"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, Terminal } from "lucide-react";
import {
  DAILY_ROOT_PDA,
  explorerTx,
  RECEIPT_SETTLEMENT_TX,
  STAGE1_TRUE_TX,
  TXORACLE_PROGRAM_ID,
} from "../lib/constants";
import { loadReceiptProof, simulateReceipt, type VerifyResult } from "../lib/receiptVerifier";

type ProofAsset = Awaited<ReturnType<typeof loadReceiptProof>>;

export function ReceiptVerifier() {
  const [proof, setProof] = useState<ProofAsset | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function verify() {
    if (!proof) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await simulateReceipt(proof));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="receipt-panel" aria-labelledby="receipt-title">
      <div className="panel-kicker">
        <ShieldCheck size={18} />
        wallet-free receipt verification
      </div>
      <div className="receipt-grid">
        <div>
          <h1 id="receipt-title">ParaMarket settles by replaying the proof, not by trusting the UI.</h1>
          <p className="lead">
            Click verify to simulate the deployed devnet CPI path against TxOracle. No wallet, no signer,
            no private key. The browser rebuilds the exact `settle_spike` instruction from the receipt proof.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={verify} disabled={!proof || loading}>
              {loading ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
              {loading ? "Simulating..." : "Verify receipt"}
            </button>
            <a className="link-button" href={explorerTx(RECEIPT_SETTLEMENT_TX)} target="_blank" rel="noreferrer">
              Settlement tx
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
        <div className="receipt-card">
          <div className="status-line">
            <span className={result?.ok ? "dot good" : "dot"} />
            {result?.ok ? "Verified on devnet simulation" : "Ready to verify"}
          </div>
          <dl className="facts">
            <div>
              <dt>Predicate</dt>
              <dd>{predicate}</dd>
            </div>
            <div>
              <dt>Batch timestamp</dt>
              <dd>{proof ? new Date(proof.proof.summary.updateStats.minTimestamp).toISOString() : "-"}</dd>
            </div>
            <div>
              <dt>Daily root PDA</dt>
              <dd className="mono">{DAILY_ROOT_PDA}</dd>
            </div>
            <div>
              <dt>TxOracle</dt>
              <dd className="mono">{TXORACLE_PROGRAM_ID.toBase58()}</dd>
            </div>
          </dl>
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
