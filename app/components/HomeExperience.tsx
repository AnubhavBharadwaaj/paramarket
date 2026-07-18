"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ReceiptText, XCircle } from "lucide-react";
import { DashboardOverview } from "./DashboardOverview";
import { DashboardShell } from "./DashboardShell";
import {
  loadReceiptProof,
  simulateReceipt,
  simulateTamperedReceipt,
  type TamperKind,
  type TamperResult,
  type VerifyResult,
} from "../lib/receiptVerifier";
import { markProofProgress } from "../lib/proofProgress";

type ProofAsset = Awaited<ReturnType<typeof loadReceiptProof>>;
type ColdScreen = "verify" | "break" | "done";

const storageKey = "paramarket-cold-open-complete-v2";

const tamperButtons: Array<{ kind: TamperKind; label: string }> = [
  { kind: "wrongTimestamp", label: "Wrong timestamp" },
  { kind: "wrongStatKey", label: "Wrong stat key" },
  { kind: "wrongFixture", label: "Wrong fixture" },
];

function ColdOpen({ onDone }: { onDone: () => void }) {
  const [proof, setProof] = useState<ProofAsset | null>(null);
  const [screen, setScreen] = useState<ColdScreen>("verify");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [tamper, setTamper] = useState<TamperResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReceiptProof().then(setProof).catch((err) => setError(err.message));
  }, []);

  function finish() {
    window.localStorage.setItem(storageKey, "true");
    if (window.location.search.includes("intro=1")) {
      window.history.replaceState(null, "", "/");
    }
    onDone();
  }

  async function verify() {
    if (!proof || loading) return;
    setLoading(true);
    setError(null);
    try {
      const simulation = await simulateReceipt(proof);
      setResult(simulation);
      if (simulation.returnValue) markProofProgress("verify");
      setScreen("break");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function breakProof(kind: TamperKind) {
    if (!proof || loading) return;
    setLoading(true);
    setError(null);
    try {
      const rejected = await simulateTamperedReceipt(proof, kind);
      setTamper(rejected);
      if (kind === "wrongTimestamp") markProofProgress("timestamp");
      if (kind === "wrongStatKey") markProofProgress("stat");
      setScreen("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`cold-open cold-${screen}`}>
      <button className="cold-skip" type="button" onClick={finish}>
        skip -&gt;
      </button>
      <div className="cold-mark">
        <ReceiptText size={26} />
        ParaMarket
      </div>

      {screen === "verify" && (
        <section className="cold-stage" aria-labelledby="cold-title">
          <div className="cold-kicker">NO WALLET - NO SIGN-UP</div>
          <h1 id="cold-title">Can you make a fake proof pass?</h1>
          <p>One button. Real chain. No wallet. Try it.</p>
          <button className="cold-primary" type="button" onClick={verify} disabled={!proof || loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
            {loading ? "Verifying..." : "Verify the real proof"}
          </button>
        </section>
      )}

      {screen === "break" && (
        <section className="cold-stage" aria-labelledby="cold-break-title">
          <div className="cold-kicker">VERIFIED ON-CHAIN - return {String(result?.returnValue)} - 205,992 CU</div>
          <h1 id="cold-break-title">Now break it.</h1>
          <p>Change one field. Same verifier. Watch the chain reject it.</p>
          <div className="cold-tamper-actions">
            {tamperButtons.map((button) => (
              <button key={button.kind} type="button" onClick={() => breakProof(button.kind)} disabled={loading}>
                {loading ? <Loader2 className="spin" size={16} /> : <XCircle size={16} />}
                {button.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {screen === "done" && (
        <section className="cold-stage" aria-labelledby="cold-done-title">
          <div className="cold-kicker">REJECTED BY CHAIN - {tamper?.guardName ?? "TimestampMismatch"} - validate_stat.rs:25</div>
          <h1 id="cold-done-title">That&apos;s the difference.</h1>
          <p>A green check is a claim. A rejection with a line number is proof the green check is not fake.</p>
          <button className="cold-primary" type="button" onClick={finish}>
            Open the board
          </button>
        </section>
      )}

      {error && <div className="cold-error">{error}</div>}
    </main>
  );
}

export function HomeExperience() {
  const [showBoard, setShowBoard] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("intro") === "1") {
      window.localStorage.removeItem(storageKey);
      setShowBoard(false);
      return;
    }
    setShowBoard(window.localStorage.getItem(storageKey) === "true");
  }, []);

  if (showBoard === null) {
    return <main className="cold-open" aria-label="Loading ParaMarket" />;
  }

  if (!showBoard) {
    return <ColdOpen onDone={() => setShowBoard(true)} />;
  }

  return (
    <DashboardShell
      active="board"
      eyebrow="judge dashboard"
      title="Proof live. Fake proofs fail."
      subtitle="One guided workspace for the exact thing judges need: verify the result, attack the proof, inspect chain state, then replay why the market resolved."
    >
      <DashboardOverview />
    </DashboardShell>
  );
}
