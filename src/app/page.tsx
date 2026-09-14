import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  QrCode,
  HardHat,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  Wrench,
  ArrowRight,
  Cpu,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [machines, technicians, tickets] = await Promise.all([
    prisma.machine.findMany({ orderBy: { code: "asc" } }),
    prisma.user.findMany({
      where: { role: "TECHNICIAN" },
      include: {
        assignedTickets: {
          where: { status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
        },
      },
    }),
    prisma.ticket.findMany({
      include: { machine: true, technician: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const createdCount = tickets.filter((t) => t.status === "CREATED").length;
  const inProgressCount = tickets.filter((t) =>
    ["ACCEPTED", "IN_PROGRESS"].includes(t.status)
  ).length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <span>⚡ Next.js + Prisma + SQLite Full-stack Demo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            ระบบ Ticket แจ้งซ่อมและรันคิวช่างอัตโนมัติ
          </h1>
          <p className="text-sm sm:text-base text-blue-100 font-light leading-relaxed">
            สแกน QR หน้าเครื่อง ➔ สร้าง Ticket (CREATED) ➔ ระบบรันคิวหาช่างคิวน้อยสุด ➔ มี Timeout ส่งต่อช่างถัดไป ➔ ช่างรับงาน ➔ สแกนเริ่มซ่อม ➔ ปิดงาน (สำเร็จ / ไม่สำเร็จ)
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/ticket/new"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md hover:bg-amber-300 transition-all"
            >
              <QrCode className="w-4 h-4" /> แจ้งซ่อมทันที
            </Link>
            <Link
              href="/technician"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white border border-white/30 backdrop-blur-sm hover:bg-white/25 transition-all"
            >
              <HardHat className="w-4 h-4" /> หน้าจอช่าง
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900/40 px-5 py-2.5 text-sm font-semibold text-white border border-white/20 backdrop-blur-sm hover:bg-slate-900/60 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stat Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{createdCount}</div>
            <div className="text-xs text-slate-500 font-medium">รอช่างกดรับ (CREATED)</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{inProgressCount}</div>
            <div className="text-xs text-slate-500 font-medium">กำลังดำเนินการ (In Progress)</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{resolvedCount}</div>
            <div className="text-xs text-slate-500 font-medium">ซ่อมเสร็จสิ้น (RESOLVED)</div>
          </div>
        </div>
      </div>

      {/* Machine QR Simulation Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              จำลองการสแกน QR หน้าเครื่องจักร (Simulate QR Scan)
            </h2>
            <p className="text-xs text-slate-500">
              คลิกที่เครื่องจักรด้านล่างเพื่อเปิดฟอร์มแจ้งซ่อมพร้อม `machine_id` ใน URL
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {machines.map((machine) => (
            <Link
              key={machine.id}
              href={`/ticket/new?machine_id=${machine.id}`}
              className="group rounded-xl border-2 border-dashed border-slate-200 p-4 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                    {machine.code}
                  </span>
                  <QrCode className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="font-bold text-slate-800 text-sm leading-snug">
                  {machine.name}
                </div>
                <div className="text-xs text-slate-500">{machine.location}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>แจ้งซ่อมเครื่องนี้</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Technician Queue Status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <HardHat className="w-5 h-5 text-blue-600" />
          ความพร้อมและคิวงานของทีมช่าง (Technician Duty)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className="rounded-xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-sm text-slate-900">{tech.name}</div>
                <div className="text-xs text-slate-500">{tech.phone || "ไม่มีเบอร์โทร"}</div>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    tech.assignedTickets.length === 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  คิวงาน: {tech.assignedTickets.length} งาน
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
