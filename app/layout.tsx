import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pipeline Planner",
  description: "Weekly sales planner — MEDDPICC × Cisco FY",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
