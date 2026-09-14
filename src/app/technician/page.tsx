"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Camera,
  Image as ImageIcon,
  X,
  Volume2,
  VolumeX,
  Radio,
} from "lucide-react";
import { Ticket, User as UserType, DutyStatus } from "@/lib/types";

// Simple Web Audio API Synthesizer for alerts
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (e) {
    // Ignore audio permission block
  }
}

function TechnicianPortalContent() {
  const searchParams = useSearchParams();
  const urlAction = searchParams.get("action"); // start | finish
  const urlTicketId = searchParams.get("ticket_id");
  const urlMachineCode = searchParams.get("machine_code");
  const urlTechId = searchParams.get("tech_id");

  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get("tech_id");
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem("selected_technician_id");
      if (saved) return saved;
    }
    return "";
  });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sound notification flag
  const prevIncomingCount = useRef<number>(0);

  // Modal State for On-site Start Verification
  const [startTicket, setStartTicket] = useState<Ticket | null>(null);
  const [startMachineCode, setStartMachineCode] = useState<string>("");

  // Modal State for Closing Job
  const [closingTicket, setClosingTicket] = useState<Ticket | null>(null);
  const [closeResolutionType, setCloseResolutionType] = useState<"RESOLVE" | "REOPEN">("RESOLVE");
  const [closeNotes, setCloseNotes] = useState<string>("");
  const [spareParts, setSpareParts] = useState<string>("");
  const [closeMachineCode, setCloseMachineCode] = useState<string>("");
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  // Check and trigger action from scan redirect (Only once)
  const handledUrlRef = useRef<string>("");

  useEffect(() => {
    if (urlAction && urlTicketId && tickets.length > 0) {
      const urlKey = `${urlAction}-${urlTicketId}-${urlMachineCode || ""}`;
      if (handledUrlRef.current === urlKey) return;

      const target = tickets.find((t) => t.id === urlTicketId || t.ticketNo === urlTicketId);
      if (target) {
        handledUrlRef.current = urlKey;
        if (urlAction === "start") {
          setStartTicket(target);
          if (urlMachineCode) setStartMachineCode(urlMachineCode);
        } else if (urlAction === "finish") {
          setClosingTicket(target);
          if (urlMachineCode) setCloseMachineCode(urlMachineCode);
        }

        // Clean URL query params but preserve tech_id
        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("action");
          currentUrl.searchParams.delete("ticket_id");
          currentUrl.searchParams.delete("machine_code");
          window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search);
        }
      }
    }
  }, [urlAction, urlTicketId, urlMachineCode, tickets]);

  // Load Technicians
  async function loadTechs() {
    try {
      const res = await fetch("/api/technicians");
      const data = await res.json();
      if (data.success && data.technicians.length > 0) {
        setTechnicians(data.technicians);
        
        // Priority: 1. urlTechId, 2. localStorage, 3. current state, 4. first tech
        const savedId = typeof window !== "undefined" ? localStorage.getItem("selected_technician_id") : "";
        const preferredId = urlTechId || savedId || selectedTechId;
        const exists = data.technicians.some((t: UserType) => t.id === preferredId);
        
        const finalId = exists ? preferredId : data.technicians[0].id;
        setSelectedTechId(finalId);
        if (typeof window !== "undefined") {
          localStorage.setItem("selected_technician_id", finalId);
        }
      }
    } catch (err) {
      console.error("Error loading technicians:", err);
    }
  }

  useEffect(() => {
    loadTechs();
  }, [urlTechId]);

  function handleSelectTechnician(id: string) {
    setSelectedTechId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_technician_id", id);
      const url = new URL(window.location.href);
      url.searchParams.set("tech_id", id);
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }

  // Fetch Tickets for Selected Tech
  async function loadTechTickets(silent = false) {
    if (!selectedTechId) return;
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/tickets?technicianId=${selectedTechId}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);

        const incoming = data.tickets.filter((t: Ticket) => t.status === "CREATED");
        if (incoming.length > prevIncomingCount.current) {
          playChimeSound();
        }
        prevIncomingCount.current = incoming.length;
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

  // Toggle Duty Status with Optimistic UI update
  async function updateDutyStatus(newStatus: DutyStatus) {
    if (!selectedTechId) return;

    // 1. Optimistic update in UI state immediately
    setTechnicians((prev) =>
      prev.map((t) => (t.id === selectedTechId ? { ...t, dutyStatus: newStatus } : t))
    );

    // 2. Persist to API
    try {
      const res = await fetch(`/api/technicians/${selectedTechId}/duty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dutyStatus: newStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "ไม่สามารถเปลี่ยนสถานะได้");
        await loadTechs();
      }
    } catch (err) {
      console.error("Error updating duty status:", err);
      await loadTechs();
    }
  }

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
        setStartTicket(null);
        setClosingTicket(null);
        setCloseNotes("");
        setSpareParts("");
        setAfterPhotoFile(null);
        setAfterPhotoPreview(null);
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

  // Handle Close Job Submit with photo upload
  async function submitCloseJob() {
    if (!closingTicket) return;
    if (!closeNotes.trim()) {
      alert("กรุณากรอกบันทึกผลการซ่อม");
      return;
    }

    let photoUrl: string | null = null;
    if (afterPhotoFile) {
      setUploadingPhoto(true);
      try {
        const formData = new FormData();
        formData.append("file", afterPhotoFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await res.json();
        if (uploadData.success) {
          photoUrl = uploadData.url;
        }
      } catch (err) {
        console.warn("Upload failed:", err);
      } finally {
        setUploadingPhoto(false);
      }
    }

    await handleTicketAction(closingTicket.id, closeResolutionType, {
      resolutionNotes: closeNotes.trim(),
      sparePartsUsed: spareParts.trim() || null,
      machineCode: closeMachineCode.trim() || null,
      photoAfterUrl: photoUrl,
    });
  }

  const currentDuty = selectedTech?.dutyStatus || "ON_DUTY";

  return (
    <div className="space-y-6">
      {/* Top Header & Tech Selector */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-inner">
              <HardHat className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  {selectedTech?.name || "หน้าจอช่างผู้ปฏิบัติงาน"}
                </h1>
                
                {/* Active Duty Status Badge */}
                {currentDuty === "ON_DUTY" && (
                  <span className="text-xs px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    พร้อมรับงาน (On Duty)
                  </span>
                )}
                {currentDuty === "ON_BREAK" && (
                  <span className="text-xs px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    พักเบรก (On Break)
                  </span>
                )}
                {currentDuty === "OFF_DUTY" && (
                  <span className="text-xs px-3 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/40 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    ออกเวร (Off Duty)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                โทร: {selectedTech?.phone || "-"} | คิวงานในมือ:{" "}
                <strong className="text-white font-bold">
                  {incomingTickets.length + acceptedTickets.length + inProgressTickets.length} งาน
                </strong>
                {incomingTickets.length > 0 && (
                  <span className="text-amber-300 ml-1.5 text-[11px]">
                    (ใหม่ {incomingTickets.length})
                  </span>
                )}
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
                onChange={(e) => handleSelectTechnician(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    👤 {t.name} ({t.dutyStatus === "ON_DUTY" ? "🟢 On" : t.dutyStatus === "ON_BREAK" ? "🟡 Break" : "⚪ Off"})
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

        {/* Duty Status Controller Bar (Interactive Click) */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Radio className="w-4 h-4 text-blue-400" />
            <span>ปรับสถานะเวรปฏิบัติการของคุณ:</span>
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: "ON_DUTY", label: "🟢 เข้าเวร / พร้อมรับงาน", activeClass: "bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-md" },
              { id: "ON_BREAK", label: "🟡 พักเบรก", activeClass: "bg-amber-600 text-white ring-2 ring-amber-300 shadow-md" },
              { id: "OFF_DUTY", label: "⚪ ออกเวร", activeClass: "bg-slate-600 text-white ring-2 ring-slate-300 shadow-md" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => updateDutyStatus(st.id as DutyStatus)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentDuty === st.id
                    ? st.activeClass
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
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

                {t.photoBeforeUrl && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">รูปอาการที่แจ้ง:</span>
                    <img
                      src={t.photoBeforeUrl}
                      alt="Before"
                      className="w-full h-28 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                )}

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
                    <span>{t.machine.location} ({t.machine.code})</span>
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

                {/* Start Repair Button with QR Verification */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setStartTicket(t);
                      setStartMachineCode("");
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera className="w-4 h-4" /> สแกน QR ยืนยันถึงหน้างาน & เริ่มซ่อม
                  </button>
                </div>
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
                    setSpareParts("");
                    setCloseMachineCode("");
                    setAfterPhotoFile(null);
                    setAfterPhotoPreview(null);
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> สแกน QR ปิดงาน & สรุปผล
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
      {/* MODAL 1: ON-SITE START REPAIR QR VERIFICATION */}
      {/* ======================================================== */}
      {startTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" /> ยืนยันถึงหน้างานเริ่มซ่อม
              </h3>
              <button onClick={() => setStartTicket(null)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
              <div>ใบงาน: <strong>#{startTicket.ticketNo}</strong></div>
              <div>เครื่องจักร: <strong>{startTicket.machine.name}</strong> ({startTicket.machine.code})</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">
                สแกนกล้อง หรือกรอกรหัสเครื่องจักรยืนยัน
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={startMachineCode}
                  onChange={(e) => setStartMachineCode(e.target.value)}
                  placeholder={`กรอก ${startTicket.machine.code} หรือสแกน QR`}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <Link
                  href={`/scan?mode=start&ticket_id=${startTicket.id}&tech_id=${selectedTechId}`}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" /> กล้อง
                </Link>
              </div>

              {/* Quick test match button */}
              <button
                type="button"
                onClick={() => setStartMachineCode(startTicket.machine.code)}
                className="text-[11px] text-blue-600 hover:underline font-semibold block text-left pt-1"
              >
                ⚡ จำลองสแกนรหัสหน้าเครื่อง ({startTicket.machine.code})
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setStartTicket(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={() =>
                  handleTicketAction(startTicket.id, "START", {
                    machineCode: startMachineCode.trim(),
                  })
                }
                disabled={actionLoading === startTicket.id}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md"
              >
                ยืนยันเริ่มซ่อม (IN_PROGRESS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CLOSE TICKET (RESOLVE OR REOPEN) */}
      {/* ======================================================== */}
      {closingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
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
                rows={2}
                placeholder={
                  closeResolutionType === "RESOLVE"
                    ? "เช่น เปลี่ยนลูกปืนสายพาน, เติมน้ำมันหล่อลื่น, ทดสอบเดินเครื่องปกติ..."
                    : "เช่น รออะไหล่สั่งจากต่างประเทศ, พบปัญหาลึกกว่าเดิม ต้องนัดตรวจซ้ำ..."
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Spare Parts Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">
                อะไหล่หรืออุปกรณ์ที่เปลี่ยน (ไม่บังคับ)
              </label>
              <input
                type="text"
                value={spareParts}
                onChange={(e) => setSpareParts(e.target.value)}
                placeholder="เช่น สายพาน V-Belt #B52 (1 เส้น), ซีลยางกันรั่ว (ถ้าไม่มีเว้นว่าง)"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            {/* Photo After Repair */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">
                แนบรูปถ่ายหลังซ่อมเสร็จ (Photo After)
              </label>
              {afterPhotoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={afterPhotoPreview}
                    alt="After preview"
                    className="w-28 h-28 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAfterPhotoFile(null);
                      setAfterPhotoPreview(null);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer text-xs text-slate-600">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>ถ่ายรูปหลังซ่อม หรือเลือกรูป</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setAfterPhotoFile(f);
                        setAfterPhotoPreview(URL.createObjectURL(f));
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
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
                onClick={submitCloseJob}
                disabled={actionLoading === closingTicket.id || uploadingPhoto || !closeNotes.trim()}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 ${
                  closeResolutionType === "RESOLVE"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                }`}
              >
                {uploadingPhoto ? "กำลังอัปโหลดรูป..." : "ยืนยันบันทึกผลการซ่อม"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TechnicianPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">กำลังโหลดข้อมูลช่าง...</div>}>
      <TechnicianPortalContent />
    </Suspense>
  );
}
