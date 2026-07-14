import fs from "node:fs";
import path from "node:path";

const FIXTURE_ID = 18_213_979;
const SEQ = 941;
const STAT_KEY_A = 1002;
const STAT_KEY_B = 1003;
const API_BASE = "https://txline-dev.txodds.com/api";

type SavedToken = { jwt: string; apiToken: string };

function loadToken(): SavedToken {
  const saved = JSON.parse(fs.readFileSync(".txline-token.json", "utf8"));
  if (!saved.jwt || !saved.apiToken) {
    throw new Error(".txline-token.json is missing jwt/apiToken");
  }
  return { jwt: saved.jwt, apiToken: saved.apiToken };
}

function parseSse(text: string): unknown[] {
  return text
    .split(/\n\n+/)
    .flatMap((frame) => {
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!data) return [];
      try {
        return [JSON.parse(data)];
      } catch {
        return [];
      }
    });
}

function pickReplayEvents(events: any[]) {
  const interesting = events.filter((event) => {
    const stats = event.Stats ?? {};
    return (
      event.Seq === 0 ||
      event.Seq === SEQ ||
      event.Action === "coverage_update" ||
      event.Action === "game_state" ||
      Object.keys(stats).some((key) => ["1", "2", "1001", "1002", "1003", "1004", "7", "8"].includes(key))
    );
  });

  const sampled = interesting.filter((_, idx) => idx % Math.max(1, Math.floor(interesting.length / 36)) === 0);
  const mustHave = events.find((event) => event.Seq === SEQ);
  const combined = [...sampled, ...(mustHave ? [mustHave] : [])]
    .sort((a, b) => Number(a.Seq ?? 0) - Number(b.Seq ?? 0))
    .filter((event, idx, arr) => idx === 0 || event.Seq !== arr[idx - 1].Seq);

  return combined.slice(0, 48).map((event) => {
    const stats = event.Stats ?? {};
    return {
      seq: Number(event.Seq ?? 0),
      ts: Number(event.Ts ?? 0),
      action: String(event.Action ?? "score_update"),
      gameState: String(event.GameState ?? ""),
      score: {
        home: Number(stats["1"] ?? stats["1001"] ?? 0),
        away: Number(stats["2"] ?? stats["1002"] ?? 0),
      },
      h1Goals: {
        home: Number(stats["1001"] ?? 0),
        away: Number(stats["1002"] ?? 0),
      },
      corners: {
        home: Number(stats["7"] ?? stats["1007"] ?? 0),
        away: Number(stats["8"] ?? stats["1008"] ?? 0),
      },
    };
  });
}

async function main() {
  const token = loadToken();
  const headers = {
    Authorization: `Bearer ${token.jwt}`,
    "X-Api-Token": token.apiToken,
  };

  const proofUrl =
    `${API_BASE}/scores/stat-validation?fixtureId=${FIXTURE_ID}` +
    `&seq=${SEQ}&statKey=${STAT_KEY_A}&statKey2=${STAT_KEY_B}`;
  const proofRes = await fetch(proofUrl, { headers });
  if (!proofRes.ok) throw new Error(`proof fetch failed: ${proofRes.status} ${await proofRes.text()}`);
  const proof = await proofRes.json();

  const replayRes = await fetch(`${API_BASE}/scores/historical/${FIXTURE_ID}`, { headers });
  if (!replayRes.ok) throw new Error(`historical fetch failed: ${replayRes.status} ${await replayRes.text()}`);
  const replayText = await replayRes.text();
  const replayEvents = pickReplayEvents(parseSse(replayText));

  const publicDir = path.join("public", "stage4");
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(
    path.join(publicDir, "receipt-proof.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: proofUrl,
        fixtureId: FIXTURE_ID,
        seq: SEQ,
        proof,
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(publicDir, "replay-events.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: `${API_BASE}/scores/historical/${FIXTURE_ID}`,
        fixtureId: FIXTURE_ID,
        events: replayEvents,
      },
      null,
      2
    )
  );

  console.log(`wrote receipt proof for fixture ${FIXTURE_ID}, seq ${SEQ}`);
  console.log(`wrote ${replayEvents.length} replay events`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
