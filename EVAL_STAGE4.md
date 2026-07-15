# EVAL_STAGE4.md

Deployed URL: https://txline-agent.vercel.app

Wallet-free verification: the browser loads `public/stage4/receipt-proof.json` and simulates the real devnet CPI path with `simulateTransaction`, `sigVerify:false`, and no signer or wallet.

Runtime dependency note: receipt proof and replay events are snapshotted static assets served by this app. The deployed verifier does not call `txline-dev.txodds.com`; it only calls Solana devnet RPC for simulation.

Receipt proof:

```text
fixture: 18213979
seq: 941
predicate: stat 1002 + stat 1003 == 1
timestamp: summary.updateStats.minTimestamp = 1783811701138
returnValue: true
slot: 476196715
compute: 205,992 CU
```

Receipt settlement tx:

https://explorer.solana.com/tx/5XKM2B9yJ8kwJvReBfG5kbeDvNA74jGTCZLMmct5EweeEuo8nMQjs2j7bE6aZBJqVBtiCYeSvsTYoLjq4XWoiVtg?cluster=devnet

Stage 1 TRUE predicate tx:

https://explorer.solana.com/tx/3Ssn7YTHUdbeQXRpTLnv8ifPcwDZHQiw3QnLXbLypuvgxanLZnbi7KJ3NjaiL1RZdqwu9kd13UocV4nePhZaUSQ2?cluster=devnet

Stage 1 FALSE predicate tx:

https://explorer.solana.com/tx/2VavzgtQt9595Lmr1sfkDR5TRZ4LTiYwmWZyp8e6y6Fps9xrRfAsxaFyPTecS3nQLTgBBzw7cBzQ1aeeGfaMJy88?cluster=devnet

Verified from the deployed Vercel origin in an incognito browser with no wallet.
