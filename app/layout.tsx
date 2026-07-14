import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ParaMarket",
  description: "Proof-settled prediction markets on TxLINE devnet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
