import { DashboardOverview } from "./components/DashboardOverview";
import { DashboardShell } from "./components/DashboardShell";

export default function Home() {
  return (
    <DashboardShell
      active="board"
      eyebrow="proof-settled prediction market"
      title="A dashboard for verifying the market, not trusting it."
      subtitle="Each workspace has one job: challenge the proof, replay the price, inspect live state, or open the audit packet."
    >
      <DashboardOverview />
    </DashboardShell>
  );
}
