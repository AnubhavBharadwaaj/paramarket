import { DashboardShell } from "../components/DashboardShell";
import { ReplayMarket } from "../components/ReplayMarket";

export default function ReplayPage() {
  return (
    <DashboardShell
      active="replay"
      eyebrow="historical match tape"
      title="Replay the match like a market."
      subtitle="The Booth explains every swing: the line starts live, pressure rises, one more goal resolves it, and the final proof can settle."
    >
      <ReplayMarket />
    </DashboardShell>
  );
}
