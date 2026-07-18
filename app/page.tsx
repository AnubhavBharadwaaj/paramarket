import { Activity, CircleDollarSign, ReceiptText } from "lucide-react";
import { AuditPacket } from "./components/AuditPacket";
import { JudgeModeRail } from "./components/JudgeModeRail";
import { MarketLifecycle } from "./components/MarketLifecycle";
import { ReceiptVerifier } from "./components/ReceiptVerifier";
import { ReplayMarket } from "./components/ReplayMarket";
import { StoryWalkthrough } from "./components/StoryWalkthrough";

export default function Home() {
  return (
    <main>
      <nav className="topbar" aria-label="Primary">
        <div className="brand">
          <ReceiptText size={21} />
          ParaMarket
        </div>
        <div className="nav-pills">
          <a href="#challenge">challenge</a>
          <a href="#replay">replay</a>
          <a href="#evidence">evidence</a>
        </div>
      </nav>

      <div className="page-shell">
        <JudgeModeRail />
        <ReceiptVerifier />
        <StoryWalkthrough />

        <div className="metrics-row" aria-label="Product highlights">
          <div>
            <Activity size={20} />
            <span>Receipt verifier simulates the real TxOracle CPI path in-browser.</span>
          </div>
          <div>
            <CircleDollarSign size={20} />
            <span>LMSR provides deterministic live market prices; payout stays parimutuel.</span>
          </div>
        </div>

        <div className="content-grid">
          <ReplayMarket />
          <MarketLifecycle />
        </div>
        <AuditPacket />
      </div>
    </main>
  );
}
