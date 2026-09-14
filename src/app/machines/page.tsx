"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Printer,
  Plus,
  ArrowLeft,
  QrCode,
  MapPin,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  X,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import { Machine } from "@/lib/types";

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // New Machine Form Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newLocation, setNewLocation] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadMachines() {
    try {
      const res = await fetch("/api/machines");
      const data = await res.json();
      if (data.success) {
        setMachines(data.machines);
        generateQrCodes(data.machines);
      }
    } catch (err) {
      console.error("Error loading machines:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateQrCodes(machineList: Machine[]) {
    const images: Record<string, string> = {};
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    for (const m of machineList) {
      const targetUrl = `${origin}/ticket/new?machine_id=${m.id}`;
      try {
        const dataUrl = await QRCode.toDataURL(targetUrl, {
          width: 250,
          margin: 1,
          color: {
            dark: "#0F172A",
            light: "#FFFFFF",
          },
        });
        images[m.id] = dataUrl;
      } catch (e) {
        console.error("QR gen error:", e);
      }
    }
    setQrImages(images);
  }

  useEffect(() => {
    loadMachines();
  }, []);

  async function handleCreateMachine(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim() || !newLocation.trim()) {
      setErrorMsg("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          name: newName.trim(),
          location: newLocation.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewCode("");
        setNewName("");
        setNewLocation("");
        await loadMachines();
      } else {
        setErrorMsg(data.error || "เกิดข้อผิดพลาดในการสร้างเครื่องจักร");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-600" />
            ทะเบียนเครื่องจักร & ป้ายสแกน QR Code
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            สร้างเครื่องจักรใหม่ และสั่งพิมพ์ป้ายสติ๊กเกอร์ QR Code ไปติดหน้าเครื่องจักร
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>➕ เพิ่มเครื่องจักรใหม่ & สร้าง QR</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>สั่งพิมพ์ป้ายทั้งหมด (Print Badges)</span>
          </button>
        </div>
      </div>

      {/* QR Badges Grid (Styled for both Screen and Physical Paper Print) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4">
        {machines.map((machine) => (
          <div
            key={machine.id}
            className="bg-white rounded-2xl border-2 border-slate-300 p-5 text-center shadow-sm print:shadow-none print:border-black space-y-3 flex flex-col justify-between hover:border-blue-400 transition-colors"
          >
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                FIX TICKET • QR ซ่อมบำรุง
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                {machine.name}
              </h3>
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{machine.location}</span>
              </div>
            </div>

            {/* QR Code Canvas/Image */}
            <div className="py-2 flex justify-center">
              {qrImages[machine.id] ? (
                <img
                  src={qrImages[machine.id]}
                  alt={`QR ${machine.code}`}
                  className="w-44 h-44 rounded-xl border border-slate-200 print:border-none shadow-sm"
                />
              ) : (
                <div className="w-44 h-44 rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
                  กำลังสร้าง QR...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-xs tracking-wider">
                รหัสเครื่อง: {machine.code}
              </div>

              <div className="print:hidden pt-2 border-t border-slate-100 flex justify-center">
                <Link
                  href={`/ticket/new?machine_id=${machine.id}`}
                  className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> ทดสอบเปิดฟอร์ม
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD NEW MACHINE & AUTO-GENERATE QR */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                เพิ่มเครื่องจักรใหม่ & สร้าง QR Code
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateMachine} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  รหัสเครื่องจักร (Machine Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="เช่น CNC-03, PUMP-02, AC-401"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  ชื่อเครื่องจักร / รายละเอียด <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น เครื่องตัดเลเซอร์ไฟเบอร์ 3000W"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  สถานที่ติดตั้ง / โซน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="เช่น โรงงาน 2 - โซนตัดชิ้นงาน"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกและสร้าง QR ทันที"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
