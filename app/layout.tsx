import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { getSessionRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Kabatu Farm",
  description: "Operations ledger for Kabatu Farm — livestock, crops, inventory, and financials.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole();

  return (
    <html lang="en">
    <body className="flex min-h-screen">
    <Sidebar role={role} />
    <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">{children}</div>
    <BottomNav role={role} />
    </body>
    </html>
  );
}
