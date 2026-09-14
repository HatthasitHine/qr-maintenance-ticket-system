import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Wrench, QrCode, HardHat, LayoutDashboard, Cpu } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "ระบบ Ticket ซ่อมบำรุง (Demo)",
  description: "Next.js + Prisma + SQLite Maintenance Ticket & Auto-dispatch System",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-16 sm:pb-0">
        {/* Top Navbar for Desktop */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                  FixTicket System <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-full">PRO</span>
                </span>
                <p className="text-xs text-slate-500">ระบบแจ้งซ่อมและคิวงานช่างอัตโนมัติ</p>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-2">
              <Link
                href="/scan"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>สแกน QR กล้อง</span>
              </Link>
              <Link
                href="/machines"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              >
                <Cpu className="w-4 h-4" />
                <span>พิมพ์ป้าย QR</span>
              </Link>
              <Link
                href="/technician"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              >
                <HardHat className="w-4 h-4" />
                <span>หน้าจอช่าง</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav />

        {/* Footer */}
        <footer className="hidden sm:block bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          ระบบ Ticket ซ่อมบำรุง &copy; 2026 Powered by Next.js, Prisma & SQLite
        </footer>
      </body>
    </html>
  );
}
