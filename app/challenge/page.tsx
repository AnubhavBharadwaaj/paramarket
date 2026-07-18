import { DashboardShell } from "../components/DashboardShell";
import { ReceiptVerifier } from "../components/ReceiptVerifier";

export default function ChallengePage() {
  return (
    <DashboardShell
      active="challenge"
      eyebrow="judge challenge mode"
      hideHeading
      title="Verify the real receipt. Then try to make a fake one pass."
      subtitle="Same browser verifier, same TxOracle simulation, no wallet. The good proof returns true; tampered proofs fail with named guards."
    >
      <ReceiptVerifier />
    </DashboardShell>
  );
}
