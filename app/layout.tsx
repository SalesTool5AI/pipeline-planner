import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import AuthGate from "@/components/AuthGate";

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
      <body>
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
