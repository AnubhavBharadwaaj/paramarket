"use client";

export type ProofProgressKey = "verify" | "timestamp" | "stat" | "inspect";

const storageKey = "paramarket-proof-progress";

export function readProofProgress(): Record<ProofProgressKey, boolean> {
  if (typeof window === "undefined") {
    return { verify: false, timestamp: false, stat: false, inspect: false };
  }
  try {
    return {
      verify: false,
      timestamp: false,
      stat: false,
      inspect: false,
      ...JSON.parse(window.localStorage.getItem(storageKey) ?? "{}"),
    };
  } catch {
    return { verify: false, timestamp: false, stat: false, inspect: false };
  }
}

export function markProofProgress(key: ProofProgressKey) {
  if (typeof window === "undefined") return;
  const next = { ...readProofProgress(), [key]: true };
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("paramarket-proof-progress", { detail: next }));
}
