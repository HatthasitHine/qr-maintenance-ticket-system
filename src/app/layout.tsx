import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Wrench, QrCode, HardHat, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "ระบบ Ticket ซ่อมบำรุง (Demo)",
  description: "Next.js + Prisma + SQLite Maintenance Ticket & Auto-dispatch System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased flex flex-col min-h-screen bg-slate-50 text-slate-900">
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                  FixTicket System <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-full">DEMO</span>
                </span>
                <p className="text-xs text-slate-500">ระบบแจ้งซ่อมและคิวงานช่างอัตโนมัติ</p>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/ticket/new"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">แจ้งปัญหา</span>
              </Link>
              <Link
                href="/technician"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              >
                <HardHat className="w-4 h-4" />
                <span className="hidden sm:inline">หน้าจอช่าง</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          ระบบ Ticket ซ่อมบำรุง (Demo) &copy; 2026 Powered by Next.js, Prisma & SQLite
        </footer>
      </body>
    </html>
  );
}
