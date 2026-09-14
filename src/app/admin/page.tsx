"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Clock,
  UserCheck,
  Wrench,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Cpu,
  Users,
  AlertCircle,
  ExternalLink,
  Radio,
} from "lucide-react";
import { Ticket, User as UserType } from "@/lib/types";

export default function AdminDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function fetchDashboardData(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const [ticketsRes, techsRes] = await Promise.all([
        fetch("/api/tickets"),
        fetch("/api/technicians"),
      ]);

      const [ticketsData, techsData] = await Promise.all([
        ticketsRes.json(),
        techsRes.json(),
      ]);

      if (ticketsData.success) setTickets(ticketsData.tickets);
      if (techsData.success) setTechnicians(techsData.technicians);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }

  // Polling every 3 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesStatus =
      statusFilter === "ALL" || t.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      t.ticketNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.machine.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.technician?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const createdCount = tickets.filter((t) => t.status === "CREATED").length;
  const acceptedCount = tickets.filter((t) => t.status === "ACCEPTED").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;
  const reopenedCount = tickets.filter((t) => t.status === "REOPENED").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            Admin Real-time Monitor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            มอนิเตอร์ภาพรวม Ticket ทุกสถานะ และความพร้อมของทีมช่าง (Auto-polling ทุก 3 วินาที)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Polling (3s)
          </span>

          <button
            onClick={() => fetchDashboardData(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter("CREATED")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "CREATED"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/50"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-xs font-bold text-amber-700 uppercase">รอรับ (CREATED)</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{createdCount}</div>
        </button>

        <button
          onClick={() => setStatusFilter("ACCEPTED")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "ACCEPTED"
              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-400/50"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-xs font-bold text-blue-700 uppercase">รับแล้ว (ACCEPTED)</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{acceptedCount}</div>
        </button>

        <button
          onClick={() => setStatusFilter("IN_PROGRESS")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "IN_PROGRESS"
              ? "bg-purple-50 border-purple-300 ring-2 ring-purple-400/50"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-xs font-bold text-purple-700 uppercase">กำลังซ่อม (PROGRESS)</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{inProgressCount}</div>
        </button>

        <button
          onClick={() => setStatusFilter("RESOLVED")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "RESOLVED"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/50"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-xs font-bold text-emerald-700 uppercase">สำเร็จ (RESOLVED)</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{resolvedCount}</div>
        </button>

        <button
          onClick={() => setStatusFilter("REOPENED")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "REOPENED"
              ? "bg-red-50 border-red-300 ring-2 ring-red-400/50"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="text-xs font-bold text-red-700 uppercase">วนกลับ (REOPENED)</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{reopenedCount}</div>
        </button>
      </div>

      {/* Technician Duty Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          ความพร้อมและจำนวนงานในมือของช่าง (Technicians Workload Matrix)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {technicians.map((t) => (
            <div
              key={t.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span>{t.name}</span>
                </div>
                <div className="text-[11px] text-slate-500">{t.phone || "-"}</div>
                
                {/* Duty Status Badge */}
                <div className="mt-1">
                  {t.dutyStatus === "ON_DUTY" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      🟢 เข้าเวร (On Duty)
                    </span>
                  )}
                  {t.dutyStatus === "ON_BREAK" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                      🟡 พักเบรก (On Break)
                    </span>
                  )}
                  {t.dutyStatus === "OFF_DUTY" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                      ⚪ ออกเวร (Off Duty)
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    (t.activeTicketCount ?? 0) === 0
                      ? "bg-blue-100 text-blue-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  คิวงาน: {t.activeTicketCount ?? 0} งาน
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Ticket Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        {/* Table Filters Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาตามเลข Ticket, เครื่องจักร, ช่าง..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">สถานะทั้งหมด ({tickets.length})</option>
              <option value="CREATED">CREATED ({createdCount})</option>
              <option value="ACCEPTED">ACCEPTED ({acceptedCount})</option>
              <option value="IN_PROGRESS">IN_PROGRESS ({inProgressCount})</option>
              <option value="RESOLVED">RESOLVED ({resolvedCount})</option>
              <option value="REOPENED">REOPENED ({reopenedCount})</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">เลขที่ Ticket</th>
                <th className="px-4 py-3">เครื่องจักร / จุดติดตั้ง</th>
                <th className="px-4 py-3">อาการที่แจ้ง</th>
                <th className="px-4 py-3">ผู้แจ้ง</th>
                <th className="px-4 py-3">ช่างผู้รับผิดชอบ</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-center">ดูรายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      #{t.ticketNo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{t.machine.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {t.machine.code} • {t.machine.location}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-700">
                      {t.issueDesc}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{t.reporterName}</div>
                      <div className="text-[11px] text-slate-400">{t.reporterPhone || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {t.technician ? (
                        <span className="font-semibold text-slate-800">
                          {t.technician.name}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">รอจัดสรร</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {t.status === "CREATED" && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          CREATED
                        </span>
                      )}
                      {t.status === "ACCEPTED" && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          ACCEPTED
                        </span>
                      )}
                      {t.status === "IN_PROGRESS" && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                          IN_PROGRESS
                        </span>
                      )}
                      {t.status === "RESOLVED" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          RESOLVED
                        </span>
                      )}
                      {t.status === "REOPENED" && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                          REOPENED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/ticket/${t.ticketNo}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-semibold text-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ติดตาม</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
