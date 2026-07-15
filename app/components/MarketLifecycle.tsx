"use client";

import { useEffect, useMemo, useState } from "react";
import { DatabaseZap, ExternalLink, FileJson, WalletCards } from "lucide-react";
import { explorerTx, PARAMARKET_PROGRAM_ID } from "../lib/constants";
import {
  CORE_ACCOUNTS,
  MARKET_EVIDENCE,
  accountExplorer,
  checkTransaction,
  evidenceUrl,
  fetchMarketState,
  solanaFmTx,
  type DecodedMarketState,
  type MarketEvidence,
  type TxStatus,
} from "../lib/marketEvidence";

type MarketStatus = {
  state: DecodedMarketState | null;
  accountStatus: "checking" | "live" | "missing" | "error";
  txs: Record<keyof MarketEvidence["txs"], TxStatus>;
};

const txKinds: Array<keyof MarketEvidence["txs"]> = ["init", "settle", "claim"];

function short(s: string) {
  return `${s.slice(0, 7)}...${s.slice(-4)}`;
}

function formatLamports(value: string) {
  const lamports = Number(value);
  if (!Number.isFinite(lamports)) return value;
  return `${(lamports / 1_000_000_000).toFixed(4)} SOL`;
}

function predicateText(state: DecodedMarketState | null) {
  if (!state) return "loading market spec";
  const right = state.statKeyB ? ` ${state.op ?? ""} stat ${state.statKeyB}` : "";
  return `stat ${state.statKeyA}${right} ${state.comparison} ${state.threshold}`;
}

function TxEvidenceLink({
  market,
  kind,
  status,
}: {
  market: MarketEvidence;
  kind: keyof MarketEvidence["txs"];
  status: TxStatus;
}) {
  const sig = market.txs[kind];
  const file = `${market.evidencePrefix}-${kind}.json`;
  if (status === "live") {
    return (
      <>
      <a href={explorerTx(sig)} target="_blank" rel="noreferrer" title={sig}>
        {kind} <ExternalLink size={13} />
      </a>
      <a href={solanaFmTx(sig)} target="_blank" rel="noreferrer" title={sig}>
        fm <ExternalLink size={13} />
      </a>
      </>
    );
  }
  return (
    <a href={evidenceUrl(file)} target="_blank" rel="noreferrer" title={`${sig} is ${status}`}>
      {kind} JSON <FileJson size={13} />
    </a>
  );
}

function MarketStateCard({ market, status }: { market: MarketEvidence; status: MarketStatus }) {
  const state = status.state;
  const displayLabels = state?.outcomeLabels.some(Boolean) ? state.outcomeLabels : market.outcomeLabels;
  const winningLabel =
    state?.winningOutcome === null || state?.winningOutcome === undefined
      ? "-"
      : `${state.winningOutcome} (${displayLabels[state.winningOutcome] ?? "unknown"})`;

  return (
    <article className="market-state-card">
      <div className="market-state-head">
        <div>
          <strong>{market.name}</strong>
          <span>{predicateText(state)}</span>
        </div>
        <span className={`state-badge ${status.accountStatus}`}>
          {status.accountStatus === "live" ? "PDA live" : status.accountStatus}
        </span>
      </div>

      <dl className="state-grid">
        <div>
          <dt>settled</dt>
          <dd>{state ? String(state.settled) : "-"}</dd>
        </div>
        <div>
          <dt>winner</dt>
          <dd>{winningLabel}</dd>
        </div>
        <div>
          <dt>total pool</dt>
          <dd>{state ? formatLamports(state.totalPoolLamports) : "-"}</dd>
        </div>
        <div>
          <dt>fixture</dt>
          <dd>{state?.fixtureId ?? "-"}</dd>
        </div>
      </dl>

      <div className="pool-list">
        {displayLabels.map((label, index) => (
          <div key={`${market.id}-${label}-${index}`}>
            <span>{index}: {label}</span>
            <strong>{state ? formatLamports(state.poolTotalsLamports[index] ?? "0") : "-"}</strong>
          </div>
        ))}
      </div>

      <div className="account-links">
        <a href={accountExplorer(market.marketPda)} target="_blank" rel="noreferrer">
          Market PDA {short(market.marketPda)} <ExternalLink size={13} />
        </a>
        <a href={accountExplorer(market.vaultPda)} target="_blank" rel="noreferrer">
          Vault {short(market.vaultPda)} <ExternalLink size={13} />
        </a>
      </div>

      <div className="tx-links">
        {txKinds.map((kind) => (
          <TxEvidenceLink key={kind} market={market} kind={kind} status={status.txs[kind]} />
        ))}
      </div>
    </article>
  );
}

export function MarketLifecycle() {
  const [statuses, setStatuses] = useState<Record<string, MarketStatus>>(() =>
    Object.fromEntries(
      MARKET_EVIDENCE.map((market) => [
        market.id,
        {
          state: null,
          accountStatus: "checking",
          txs: { init: "checking", settle: "checking", claim: "checking" },
        },
      ])
    )
  );

  useEffect(() => {
    let cancelled = false;
    for (const market of MARKET_EVIDENCE) {
      fetchMarketState(market.marketPda)
        .then((state) => {
          if (cancelled) return;
          setStatuses((prev) => ({
            ...prev,
            [market.id]: {
              ...prev[market.id],
              state,
              accountStatus: state ? "live" : "missing",
            },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setStatuses((prev) => ({
            ...prev,
            [market.id]: { ...prev[market.id], accountStatus: "error" },
          }));
        });

      for (const kind of txKinds) {
        checkTransaction(market.txs[kind]).then((status) => {
          if (cancelled) return;
          setStatuses((prev) => ({
            ...prev,
            [market.id]: {
              ...prev[market.id],
              txs: { ...prev[market.id].txs, [kind]: status },
            },
          }));
        });
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const anyPruned = useMemo(
    () =>
      Object.values(statuses).some((status) =>
        Object.values(status.txs).some((txStatus) => txStatus === "pruned" || txStatus === "error")
      ),
    [statuses]
  );

  return (
    <section className="lifecycle-panel" aria-labelledby="lifecycle-title">
      <div className="panel-kicker">
        <WalletCards size={18} />
        durable market evidence
      </div>
      <h2 id="lifecycle-title">The market state is read live from devnet.</h2>
      <p>
        Transaction links are useful but devnet prunes history. The cards below fetch and decode each Market
        PDA directly, with settled state, winning outcome, and pool totals shown without a wallet.
      </p>

      <div className="durability-note">
        Devnet prunes old transactions from the public explorer and resets periodically. If a signature ages out,
        the account state above and the receipt verifier run live against current chain state; full transaction
        records are committed in the repo under <span className="mono">evidence/</span>.
      </div>

      {anyPruned && (
        <div className="prune-alert">
          Some transaction history is unavailable from public RPC right now. JSON evidence links are shown instead
          of dead explorer links.
        </div>
      )}

      <div className="market-state-list">
        {MARKET_EVIDENCE.map((market) => (
          <MarketStateCard key={market.id} market={market} status={statuses[market.id]} />
        ))}
      </div>

      <div className="core-account-links">
        {CORE_ACCOUNTS.map((account) => (
          <a href={accountExplorer(account.address)} target="_blank" rel="noreferrer" key={account.address}>
            <DatabaseZap size={14} />
            {account.label} {short(account.address)}
          </a>
        ))}
      </div>

      <div className="program-line">Paramarket program: {PARAMARKET_PROGRAM_ID}</div>
    </section>
  );
}
