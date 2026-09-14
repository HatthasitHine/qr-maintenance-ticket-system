"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  QrCode,
  Wrench,
  HardHat,
  LayoutDashboard,
  Cpu,
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "หน้าหลัก", icon: Home },
    { href: "/scan", label: "สแกน QR", icon: QrCode, highlight: true },
    { href: "/ticket/new", label: "แจ้งซ่อม", icon: Wrench },
    { href: "/technician", label: "หน้าช่าง", icon: HardHat },
    { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          if (link.highlight) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="-mt-5 flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-white">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-blue-700 mt-0.5">
                  {link.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
                isActive
                  ? "text-blue-600 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
