import { DashboardShell } from "../components/DashboardShell";
import { StoryWalkthrough } from "../components/StoryWalkthrough";
import { AuditPacket } from "../components/AuditPacket";

export default function ProofsPage() {
  return (
    <DashboardShell
      active="proofs"
      eyebrow="proof reconstruction"
      title="The trust path, reconstructed."
      subtitle="A visual map of receipt proof, daily root PDA, TxOracle simulation, and fail-closed tamper rejection."
    >
      <StoryWalkthrough compact />
      <AuditPacket />
    </DashboardShell>
  );
}
