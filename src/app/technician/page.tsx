"use client";

import { useEffect, useState } from "react";
import {
  HardHat,
  Bell,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Check,
  RotateCcw,
  RefreshCw,
  MapPin,
  Cpu,
  User,
  ShieldAlert,
} from "lucide-react";
import { Ticket, User as UserType } from "@/lib/types";

export default function TechnicianPortalPage() {
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal State for Closing Job
  const [closingTicket, setClosingTicket] = useState<Ticket | null>(null);
  const [closeResolutionType, setCloseResolutionType] = useState<"RESOLVE" | "REOPEN">("RESOLVE");
  const [closeNotes, setCloseNotes] = useState<string>("");

  // Load Technicians
  useEffect(() => {
    async function loadTechs() {
      try {
        const res = await fetch("/api/technicians");
        const data = await res.json();
        if (data.success && data.technicians.length > 0) {
          setTechnicians(data.technicians);
          setSelectedTechId(data.technicians[0].id);
        }
      } catch (err) {
        console.error("Error loading technicians:", err);
      }
    }
    loadTechs();
  }, []);

  // Fetch Tickets for Selected Tech
  async function loadTechTickets(silent = false) {
    if (!selectedTechId) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/tickets?technicianId=${selectedTechId}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }

  // Polling every 3 seconds
  useEffect(() => {
    if (selectedTechId) {
      loadTechTickets();
      const interval = setInterval(() => {
        loadTechTickets(true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedTechId]);

  const selectedTech = technicians.find((t) => t.id === selectedTechId);

  // Categorize tickets
  const incomingTickets = tickets.filter((t) => t.status === "CREATED");
  const acceptedTickets = tickets.filter((t) => t.status === "ACCEPTED" || t.status === "REOPENED");
  const inProgressTickets = tickets.filter((t) => t.status === "IN_PROGRESS");
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED");

  // Handle Action
  async function handleTicketAction(
    ticketId: string,
    action: "ACCEPT" | "START" | "RESOLVE" | "REOPEN" | "TIMEOUT_ESCALATE",
    extraBody: Record<string, any> = {}
  ) {
    setActionLoading(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: selectedTechId,
          ...extraBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadTechTickets(false);
        if (action === "RESOLVE" || action === "REOPEN") {
          setClosingTicket(null);
          setCloseNotes("");
        }
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Tech Selector */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-inner">
            <HardHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                {selectedTech?.name || "หน้าจอช่างผู้ปฏิบัติงาน"}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                TECHNICIAN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              โทร: {selectedTech?.phone || "-"} | งานในคิวปัจจุบัน:{" "}
              <strong className="text-white font-bold">
                {acceptedTickets.length + inProgressTickets.length} งาน
              </strong>
            </p>
          </div>
        </div>

        {/* Switch Account */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              สลับบัญชีช่างเพื่อทดสอบ:
            </label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  👤 {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadTechTickets(false)}
            disabled={refreshing}
            className="mt-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Grid Work Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ======================================================== */}
        {/* COLUMN 1: INCOMING JOBS TO ACCEPT (CREATED) */}
        {/* ======================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
              1. งานใหม่ที่มอบหมาย (รอกดรับ)
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
              {incomingTickets.length}
            </span>
          </div>

          {incomingTickets.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              ไม่มีงานใหม่รอกดรับ
            </div>
          ) : (
            incomingTickets.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border-2 border-amber-300 p-4 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">#{t.ticketNo}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                    ความเร่งด่วน: {t.urgency}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-sm text-slate-900">{t.machine.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.machine.location} ({t.machine.code})</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                  <strong>อาการ:</strong> {t.issueDesc}
                </div>

                {/* Accept Button & Timeout Simulation */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleTicketAction(t.id, "ACCEPT")}
                    disabled={actionLoading === t.id}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> กดรับงานนี้เข้าคิว
                  </button>

                  <button
                    onClick={() => handleTicketAction(t.id, "TIMEOUT_ESCALATE")}
                    disabled={actionLoading === t.id}
                    className="w-full py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-500 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> ทดสอบ Timeout ส่งต่อช่างอื่น
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ======================================================== */}
        {/* COLUMN 2: IN QUEUE / READY TO START (ACCEPTED / REOPENED) */}
        {/* ======================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              2. ในคิวงาน (รอยืนยันเริ่มซ่อม)
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
              {acceptedTickets.length}
            </span>
          </div>

          {acceptedTickets.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              ไม่มีงานในคิวรอเริ่ม
            </div>
          ) : (
            acceptedTickets.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">#{t.ticketNo}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      t.status === "REOPENED"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {t.status === "REOPENED" ? "ส่งกลับแก้ไขต่อ" : "รับงานแล้ว"}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-sm text-slate-900">{t.machine.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.machine.location}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                  <strong>อาการ:</strong> {t.issueDesc}
                </div>

                {t.resolutionNotes && t.status === "REOPENED" && (
                  <div className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-100">
                    <strong>หมายเหตุเดิม:</strong> {t.resolutionNotes}
                  </div>
                )}

                {/* Start Button */}
                <button
                  onClick={() => handleTicketAction(t.id, "START")}
                  disabled={actionLoading === t.id}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" /> ถึงหน้างาน & เริ่มซ่อม (IN PROGRESS)
                </button>
              </div>
            ))
          )}
        </div>

        {/* ======================================================== */}
        {/* COLUMN 3: IN PROGRESS / CLOSE JOB (IN_PROGRESS) */}
        {/* ======================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-600" />
              3. กำลังซ่อมอยู่ (In Progress)
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
              {inProgressTickets.length}
            </span>
          </div>

          {inProgressTickets.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              ไม่มีงานที่กำลังซ่อมอยู่ขณะนี้
            </div>
          ) : (
            inProgressTickets.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-purple-300 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">#{t.ticketNo}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded animate-pulse">
                    กำลังซ่อม
                  </span>
                </div>

                <div>
                  <div className="font-bold text-sm text-slate-900">{t.machine.name}</div>
                  <div className="text-xs text-slate-500">{t.machine.location} ({t.machine.code})</div>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                  <strong>อาการ:</strong> {t.issueDesc}
                </div>

                {/* Close Job Trigger Button */}
                <button
                  onClick={() => {
                    setClosingTicket(t);
                    setCloseResolutionType("RESOLVE");
                    setCloseNotes("");
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ปิดงาน & สรุปผลการซ่อม
                </button>
              </div>
            ))
          )}

          {/* Recently Resolved Accordion Summary */}
          {resolvedTickets.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> งานที่เสร็จแล้ว ({resolvedTickets.length})
              </h3>
              <div className="space-y-1.5">
                {resolvedTickets.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-emerald-900">#{t.ticketNo}</span> - {t.machine.code}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700">RESOLVED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: CLOSE TICKET (RESOLVE OR REOPEN) */}
      {/* ======================================================== */}
      {closingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  ปิดงานซ่อม #{closingTicket.ticketNo}
                </h3>
                <p className="text-xs text-slate-500">
                  เครื่องจักร: {closingTicket.machine.name} ({closingTicket.machine.code})
                </p>
              </div>
              <button
                onClick={() => setClosingTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Choose Outcome */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">
                เลือกผลการดำเนินงานจริง <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCloseResolutionType("RESOLVE")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    closeResolutionType === "RESOLVE"
                      ? "border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1. สำเร็จ (RESOLVED)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ซ่อมเสร็จสมบูรณ์ ปลดออกจากคิวงาน
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCloseResolutionType("REOPEN")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    closeResolutionType === "REOPEN"
                      ? "border-red-600 bg-red-50/80 text-red-900 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-red-600" /> 2. ไม่สำเร็จ (REOPENED)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ยังไม่จบ วนกลับเข้าคิวช่างเดิม
                  </span>
                </button>
              </div>
            </div>

            {/* Resolution Notes Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">
                รายละเอียดการแก้ไข / สาเหตุ / หมายเหตุ <span className="text-red-500">*</span>
              </label>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                rows={3}
                placeholder={
                  closeResolutionType === "RESOLVE"
                    ? "เช่น เปลี่ยนลูกปืนสายพาน, เติมน้ำมันหล่อลื่น, ทดสอบเดินเครื่องปกติ..."
                    : "เช่น รออะไหล่สั่งจากต่างประเทศ, พบปัญหาลึกกว่าเดิม ต้องนัดตรวจสอบซ้ำ..."
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClosingTicket(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTicketAction(closingTicket.id, closeResolutionType, {
                    resolutionNotes: closeNotes.trim(),
                  })
                }
                disabled={actionLoading === closingTicket.id || !closeNotes.trim()}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 ${
                  closeResolutionType === "RESOLVE"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                }`}
              >
                ยืนยันบันทึกผลการซ่อม
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
