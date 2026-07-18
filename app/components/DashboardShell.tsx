import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  DatabaseZap,
  FileJson,
  LayoutDashboard,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Board", key: "board", icon: LayoutDashboard },
  { href: "/challenge", label: "Challenge", key: "challenge", icon: ReceiptText },
  { href: "/replay", label: "Replay", key: "replay", icon: TrendingUp },
  { href: "/markets", label: "Markets", key: "markets", icon: DatabaseZap },
  { href: "/proofs", label: "Proofs", key: "proofs", icon: BadgeCheck },
  { href: "/evidence", label: "Evidence", key: "evidence", icon: FileJson },
];

const ticker = [
  "WC26 LIVE",
  "fixture 18213979",
  "return true",
  "205,992 CU",
  "TimestampMismatch",
  "Market PDA live",
  "Over 2.5 locked",
];

export function DashboardShell({
  active,
  children,
  eyebrow,
  title,
  subtitle,
}: {
  active: string;
  children: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="terminal-shell">
      <div className="ticker-strip" aria-label="Live proof ticker">
        {ticker.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <header className="terminal-header">
        <Link className="terminal-brand" href="/">
          <ReceiptText size={24} />
          <span>ParaMarket</span>
          <em>devnet</em>
        </Link>
        <nav className="terminal-nav" aria-label="Dashboard">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link className={active === item.key ? "active" : ""} href={item.href} key={item.key}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="terminal-status">
          <span>feed static</span>
          <strong>devnet rpc</strong>
        </div>
      </header>

      <section className="workspace-heading">
        {eyebrow && <div className="workspace-eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>

      {children}
    </main>
  );
}
