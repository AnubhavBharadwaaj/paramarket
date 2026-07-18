import { DashboardShell } from "../components/DashboardShell";
import { AuditPacket } from "../components/AuditPacket";
import { MarketLifecycle } from "../components/MarketLifecycle";

export default function EvidencePage() {
  return (
    <DashboardShell
      active="evidence"
      eyebrow="audit packet"
      title="Everything needed to verify the submission."
      subtitle="Open the raw receipt proof, durable tx JSON, deployed URL, settlement tx, and live account state from one evidence workspace."
    >
      <AuditPacket />
      <MarketLifecycle />
    </DashboardShell>
  );
}
