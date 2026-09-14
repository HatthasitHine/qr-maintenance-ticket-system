"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Clock,
  UserCheck,
  Wrench,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  MapPin,
  Phone,
  HardHat,
  ArrowLeft,
  Activity,
  RotateCcw,
  Check,
  Package,
  Timer,
} from "lucide-react";
import { Ticket } from "@/lib/types";

export default function TicketTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  async function fetchTicketData(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicket(data.ticket);
        setError(null);
      } else {
        setError(data.error || "ไม่พบข้อมูลใบแจ้งซ่อม");
      }
    } catch (err) {
      console.error(err);
      if (!silent) setError("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }

  // Initial load + Polling every 3 seconds
  useEffect(() => {
    fetchTicketData();
    const interval = setInterval(() => {
      fetchTicketData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [ticketId]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูล Ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">เกิดข้อผิดพลาด</h2>
        <p className="text-sm text-slate-500">{error || "ไม่พบใบแจ้งซ่อม"}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CREATED":
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">รอช่างกดรับ (CREATED)</span>;
      case "ACCEPTED":
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">ช่างรับงานแล้ว (ACCEPTED)</span>;
      case "IN_PROGRESS":
        return <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">กำลังดำเนินการซ่อม (IN PROGRESS)</span>;
      case "RESOLVED":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">ซ่อมเสร็จสิ้น (RESOLVED)</span>;
      case "REOPENED":
        return <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">ส่งกลับแก้ไขต่อ (REOPENED)</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-full">{status}</span>;
    }
  };

  const isCreated = true;
  const isAccepted = ["ACCEPTED", "IN_PROGRESS", "RESOLVED", "REOPENED"].includes(ticket.status);
  const isInProgress = ["IN_PROGRESS", "RESOLVED"].includes(ticket.status);
  const isResolved = ticket.status === "RESOLVED";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTicketData(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>อัปเดตสถานะสด (3s)</span>
          </button>
        </div>
      </div>

      {/* Main Ticket Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs font-semibold text-slate-400">หมายเลข Ticket</div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">#{ticket.ticketNo}</h1>
            <div className="text-xs text-slate-500 mt-0.5">
              แจ้งเมื่อ: {new Date(ticket.createdAt).toLocaleString("th-TH")}
            </div>
          </div>
          <div>{getStatusBadge(ticket.status)}</div>
        </div>

        {/* 4-Step Progress Bar with Real Timestamps */}
        <div className="grid grid-cols-4 gap-2 text-center relative py-2">
          {/* Step 1 */}
          <div className="space-y-1">
            <div
              className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm ${
                isCreated ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              1
            </div>
            <div className="text-xs font-bold text-slate-800">แจ้งปัญหา</div>
            <div className="text-[10px] text-slate-500">
              {new Date(ticket.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-1">
            <div
              className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm ${
                isAccepted ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              2
            </div>
            <div className="text-xs font-bold text-slate-800">ช่างรับงาน</div>
            <div className="text-[10px] text-slate-500">
              {ticket.acceptedAt
                ? new Date(ticket.acceptedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
                : "รอกดรับ"}
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-1">
            <div
              className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm ${
                isInProgress ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              3
            </div>
            <div className="text-xs font-bold text-slate-800">เริ่มซ่อม</div>
            <div className="text-[10px] text-slate-500">
              {ticket.startedAt
                ? new Date(ticket.startedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
                : "-"}
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-1">
            <div
              className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm ${
                isResolved
                  ? "bg-emerald-600 text-white"
                  : ticket.status === "REOPENED"
                  ? "bg-red-500 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isResolved ? "✓" : ticket.status === "REOPENED" ? "!" : "4"}
            </div>
            <div className="text-xs font-bold text-slate-800">
              {ticket.status === "REOPENED" ? "ส่งกลับแก้ไข" : "ปิดงาน"}
            </div>
            <div className="text-[10px] text-slate-500">
              {ticket.resolvedAt
                ? new Date(ticket.resolvedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
                : "-"}
            </div>
          </div>
        </div>

        {/* Machine & Problem Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 space-y-2">
            <div className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> เครื่องจักร / อุปกรณ์
            </div>
            <div className="font-bold text-sm text-slate-900">{ticket.machine.name}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{ticket.machine.location} (รหัส: {ticket.machine.code})</span>
            </div>
            <div className="text-xs text-slate-600 pt-1">
              <strong>อาการที่แจ้ง:</strong> {ticket.issueDesc}
            </div>

            {ticket.photoBeforeUrl && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-500 block mb-1">รูปถ่ายอาการเสีย:</span>
                <img
                  src={ticket.photoBeforeUrl}
                  alt="Before"
                  className="w-full h-36 object-cover rounded-lg border border-slate-200"
                />
              </div>
            )}
          </div>

          {/* Assigned Technician Info */}
          <div className="p-4 rounded-xl bg-slate-50 space-y-2">
            <div className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1.5">
              <HardHat className="w-4 h-4" /> ช่างผู้รับผิดชอบ
            </div>
            {ticket.technician ? (
              <div className="space-y-1">
                <div className="font-bold text-sm text-slate-900">{ticket.technician.name}</div>
                {ticket.technician.phone && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ticket.technician.phone}</span>
                  </div>
                )}

                <div className="pt-2 space-y-1">
                  <div className="text-xs flex items-center gap-1">
                    <span>ยืนยัน QR หน้างานเริ่มซ่อม:</span>
                    {ticket.startQrVerified ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> ยืนยันแล้ว
                      </span>
                    ) : (
                      <span className="text-slate-400">รอยืนยัน</span>
                    )}
                  </div>

                  {ticket.repairDurationMinutes && (
                    <div className="text-xs flex items-center gap-1 text-slate-700 font-medium">
                      <Timer className="w-3.5 h-3.5 text-purple-600" />
                      <span>เวลาซ่อมทั้งหมด: <strong>{ticket.repairDurationMinutes} นาที</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-600 font-medium py-2 flex items-center gap-1">
                <Clock className="w-4 h-4 animate-spin" /> กำลังจัดสรรคิวช่าง...
              </div>
            )}
          </div>
        </div>

        {/* Resolution Notes & After Photo If closed */}
        {(ticket.resolutionNotes || ticket.photoAfterUrl || ticket.sparePartsUsed) && (
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              ticket.status === "RESOLVED"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <div>
              <div className="font-bold text-xs uppercase mb-1">
                ผลการดำเนินงานจริง ({ticket.status})
              </div>
              <div className="text-sm">{ticket.resolutionNotes || "-"}</div>
            </div>

            {ticket.sparePartsUsed && (
              <div className="text-xs flex items-center gap-1.5 pt-1 border-t border-emerald-200/50">
                <Package className="w-3.5 h-3.5" />
                <span><strong>อะไหล่ที่เปลี่ยน:</strong> {ticket.sparePartsUsed}</span>
              </div>
            )}

            {ticket.photoAfterUrl && (
              <div className="pt-1">
                <span className="text-[10px] font-bold block mb-1">รูปถ่ายหลังซ่อมเสร็จ:</span>
                <img
                  src={ticket.photoAfterUrl}
                  alt="After repair"
                  className="w-40 h-40 object-cover rounded-lg border border-emerald-300"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticket Events Timeline Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          ประวัติและลำดับเหตุการณ์ (Audit Timeline)
        </h2>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {ticket.events && ticket.events.length > 0 ? (
            ticket.events.map((ev) => (
              <div key={ev.id} className="relative space-y-1">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{ev.actorName}</span>
                  <span className="text-slate-400">
                    {new Date(ev.createdAt).toLocaleTimeString("th-TH")}
                  </span>
                </div>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {ev.description}
                </p>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400">ยังไม่มีบันทึกเหตุการณ์</div>
          )}
        </div>
      </div>
    </div>
  );
}
