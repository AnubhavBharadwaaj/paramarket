import { DashboardShell } from "../components/DashboardShell";
import { MarketLifecycle } from "../components/MarketLifecycle";

export default function MarketsPage() {
  return (
    <DashboardShell
      active="markets"
      eyebrow="live devnet accounts"
      title="Inspect the settled markets without trusting old tx links."
      subtitle="This screen fetches Market PDA state live: fixture, predicate, pool totals, settled flag, and winning outcome."
    >
      <MarketLifecycle />
    </DashboardShell>
  );
}
