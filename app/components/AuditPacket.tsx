import { ExternalLink, FileJson, Link2 } from "lucide-react";
import { explorerTx, RECEIPT_SETTLEMENT_TX } from "../lib/constants";
import { MARKET_EVIDENCE, accountExplorer, evidenceUrl } from "../lib/marketEvidence";

const deployedUrl = "https://txline-agent.vercel.app";

export function AuditPacket() {
  return (
    <section className="audit-packet" aria-labelledby="audit-packet-title">
      <div>
        <div className="panel-kicker">
          <FileJson size={18} />
          audit packet
        </div>
        <h2 id="audit-packet-title">Everything a judge needs to verify the claim.</h2>
      </div>
      <div className="audit-links">
        <a href="/stage4/receipt-proof.json" target="_blank" rel="noreferrer">
          receipt proof <ExternalLink size={13} />
        </a>
        <a href="https://github.com/AnubhavBharadwaaj/paramarket/blob/main/EVAL_STAGE6.md" target="_blank" rel="noreferrer">
          tamper results <ExternalLink size={13} />
        </a>
        <a href={accountExplorer(MARKET_EVIDENCE[0].marketPda)} target="_blank" rel="noreferrer">
          Market PDA state <ExternalLink size={13} />
        </a>
        <a href={evidenceUrl("stage2-t1-settle.json")} target="_blank" rel="noreferrer">
          evidence JSON <ExternalLink size={13} />
        </a>
        <a href={explorerTx(RECEIPT_SETTLEMENT_TX)} target="_blank" rel="noreferrer">
          receipt settlement tx <ExternalLink size={13} />
        </a>
        <a href={deployedUrl} target="_blank" rel="noreferrer">
          <Link2 size={13} />
          deployed URL
        </a>
      </div>
    </section>
  );
}
