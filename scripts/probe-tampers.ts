import fs from "node:fs";
import { simulateTamperedReceipt, type ReceiptProof, type TamperKind } from "../app/lib/receiptVerifier";

const proof = JSON.parse(fs.readFileSync("public/stage4/receipt-proof.json", "utf8")) as ReceiptProof;
const tampers: TamperKind[] = ["wrongTimestamp", "wrongStatKey", "wrongFixture"];

for (const tamper of tampers) {
  try {
    const result = await simulateTamperedReceipt(proof, tamper);
    console.log(`\n${tamper}`);
    console.log(`diff: ${result.diff}`);
    console.log(`guard: ${result.guardName}`);
    console.log(`error: ${result.error}`);
    console.log(`slot: ${result.slot}`);
    console.log(`cu: ${result.unitsConsumed ?? "-"}`);
    console.log(`log: ${result.guardLog}`);
    const context = result.logs.filter((line) => line.includes("Program log:") || line.includes("failed"));
    for (const line of context.slice(-8)) console.log(`  ${line}`);
  } catch (err) {
    console.log(`\n${tamper}`);
    console.log(`UNEXPECTED: ${err instanceof Error ? err.message : String(err)}`);
  }
}
