import { ExternalLink, WalletCards } from "lucide-react";
import { explorerTx, PARAMARKET_PROGRAM_ID } from "../lib/constants";

const rows = [
  {
    name: "T1 single-stat over/under",
    init: "3ucd6d4DRXJDHHhcfPDAUKChhpPLWRN8esEmn9wCWtqkf7MqYwybhM4uDb4ntuhYBxy8DtKJPf35K7ZDL5dXccqR",
    settle: "4gWe45YiDP3UjbQ1rFzWpEG5tQ3n3RbQWJJS6WQpbhifgdA3Epj4kdxmkRmNntrACVhsykTPgLVM5Zstt5W5nmx6",
    claim: "3dPLXUiRAd7SnwLU22z4oBksKgtmj7zYuwLVEpESN6wj2qesEP4hpSk2hJHgQ99KmcEwXxbj2wo2XFfHtKtY53v7",
  },
  {
    name: "T2 two-stat sum predicate",
    init: "5gUKJLewf4Txx4bWFZWRh32Jhmz4vSGSMMU721feHpXJ6HRc72UULYyGd6DgRT8Co5gZZquqQ3Zv8YWxjQzsfBmB",
    settle: "5b2NYByaYuCdz3xJhM2UoFwwgqNtBRHgwVftVgFozq6moQKdg1AfNp42MAReQqd4ery9LYLACZ2b5y347M4qCcGQ",
    claim: "5aXTakauqFoNmBBBYFZdUFeNhZKfQGKP4ccPk7Ra3uKW56RyMiZxMUmvEbCb9gfwcENBLkJ7mptxZ7iw2cbdHbGm",
  },
  {
    name: "T3 under/exact/over 3-way",
    init: "53HBasPqgtvVLbKWRdNVD75CstxZHDUvC7E4q4W5VSpz9LyVtAiDCsQvMNGYJRP78m6JvLsgACDG5hDYhcHWu8mg",
    settle: "4r9T3UPYcNJx7sB5ajCNADk6tkS8LNWnE89KgdDj4qPhHkNFPxT9Cb3h2YtXKPzohk27uQ5ZhX4oJxQSFPTz1TvL",
    claim: "5jmpuHYrU3Jnnu8yUNSyYTgFYQNSE8gWgAm3qgTTTqqGMiNMAmLqVr7md3sCz86pFBaCzF6rtEazGpCQn1TaK3wQ",
  },
];

export function MarketLifecycle() {
  return (
    <section className="lifecycle-panel" aria-labelledby="lifecycle-title">
      <div className="panel-kicker">
        <WalletCards size={18} />
        stage 2 market lifecycle
      </div>
      <h2 id="lifecycle-title">The market path is already green on devnet.</h2>
      <p>
        This UI keeps settlement architecture unchanged: binary markets are over/under, the 3-way market is
        under/exact/over, and claims pay from the parimutuel vault after proof settlement.
      </p>
      <div className="tx-table">
        {rows.map((row) => (
          <div className="tx-row" key={row.name}>
            <strong>{row.name}</strong>
            <a href={explorerTx(row.init)} target="_blank" rel="noreferrer">
              init <ExternalLink size={14} />
            </a>
            <a href={explorerTx(row.settle)} target="_blank" rel="noreferrer">
              settle <ExternalLink size={14} />
            </a>
            <a href={explorerTx(row.claim)} target="_blank" rel="noreferrer">
              claim <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>
      <div className="program-line">Paramarket program: {PARAMARKET_PROGRAM_ID}</div>
    </section>
  );
}
