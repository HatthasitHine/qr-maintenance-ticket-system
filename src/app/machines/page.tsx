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

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-600" />
            ทะเบียนเครื่องจักร & สั่งพิมพ์ป้าย QR Code
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            พิมพ์ป้ายสติ๊กเกอร์ QR Code ไปติดหน้าเครื่องจักร สำหรับให้พนักงานสแกนแจ้งซ่อม
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>สั่งพิมพ์สติ๊กเกอร์ทั้งหมด (Print Badges)</span>
          </button>
        </div>
      </div>

      {/* QR Badges Grid (Styled for both Screen and Physical Paper Print) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4">
        {machines.map((machine) => (
          <div
            key={machine.id}
            className="bg-white rounded-2xl border-2 border-slate-300 p-5 text-center shadow-sm print:shadow-none print:border-black space-y-3 flex flex-col justify-between"
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
    </div>
  );
}
