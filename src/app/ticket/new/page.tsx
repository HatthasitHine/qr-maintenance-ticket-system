"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QrCode,
  Wrench,
  Send,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  MapPin,
  Camera,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Machine } from "@/lib/types";

function TicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMachineIdOrCode = searchParams.get("machine_id") || "";

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [reporterName, setReporterName] = useState<string>("คุณสมศรี ใจดี (Operator)");
  const [reporterPhone, setReporterPhone] = useState<string>("086-666-7788");
  const [issueDesc, setIssueDesc] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("NORMAL");

  // Photo Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMachines() {
      try {
        const res = await fetch("/api/machines");
        const data = await res.json();
        if (data.success && data.machines.length > 0) {
          setMachines(data.machines);

          // Find by id or code
          const matched = data.machines.find(
            (m: Machine) =>
              m.id === initialMachineIdOrCode ||
              m.code.toUpperCase() === initialMachineIdOrCode.toUpperCase()
          );

          if (matched) {
            setSelectedMachineId(matched.id);
          } else {
            setSelectedMachineId(data.machines[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading machines:", err);
      }
    }
    loadMachines();
  }, [initialMachineIdOrCode]);

  const selectedMachine = machines.find((m) => m.id === selectedMachineId);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId || !reporterName.trim() || !issueDesc.trim()) {
      setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    setSubmitting(true);
    setError(null);

    let photoUrl: string | null = null;

    // Upload Photo if selected
    if (photoFile) {
      setUploadingPhoto(true);
      try {
        const formData = new FormData();
        formData.append("file", photoFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          photoUrl = uploadData.url;
        }
      } catch (err) {
        console.warn("Photo upload failed:", err);
      } finally {
        setUploadingPhoto(false);
      }
    }

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: selectedMachineId,
          reporterName: reporterName.trim(),
          reporterPhone: reporterPhone.trim() || null,
          issueDesc: issueDesc.trim(),
          urgency,
          photoBeforeUrl: photoUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        router.push(`/ticket/${data.ticket.ticketNo || data.ticket.id}`);
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการสร้างใบแจ้งซ่อม");
      }
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <QrCode className="w-6 h-6 text-blue-600" />
          แจ้งปัญหา / ส่งใบแจ้งซ่อมบำรุง
        </h1>
        <p className="text-xs text-slate-500">
          กรอกข้อมูลอาการเสีย ระบบจะทำการ Run Q หาช่างที่คิวน้อยที่สุดและส่งมอบหมายงานทันที
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Machine Selection Info Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> เครื่องจักร / อุปกรณ์ที่แจ้ง
            </span>
            {selectedMachine && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {selectedMachine.code}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.code}] {m.name} ({m.location})
                </option>
              ))}
            </select>

            {selectedMachine && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>สถานที่ติดตั้ง: {selectedMachine.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Urgency Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase">ระดับความเร่งด่วน</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "LOW", label: "ต่ำ (Low)" },
              { id: "NORMAL", label: "ปกติ (Normal)" },
              { id: "HIGH", label: "ด่วน (High)" },
              { id: "CRITICAL", label: "วิกฤต (Critical)" },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setUrgency(item.id)}
                className={`px-3 py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                  urgency === item.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Issue Description */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase">
            รายละเอียดอาการเสีย / ปัญหาที่พบ <span className="text-red-500">*</span>
          </label>
          <textarea
            value={issueDesc}
            onChange={(e) => setIssueDesc(e.target.value)}
            rows={3}
            placeholder="เช่น มีเสียงดังผิดปกติขณะทำงาน, อุณหภูมิสูงเกินกำหนด, มอเตอร์หยุดทำงานกะทันหัน..."
            className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            required
          />
        </div>

        {/* Real Photo Capture / Upload */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
            <span>แนบรูปถ่ายอาการเสีย (Photo Capture)</span>
            <span className="text-slate-400 font-normal">ไม่บังคับ</span>
          </label>

          {photoPreview ? (
            <div className="relative inline-block">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-36 h-36 object-cover rounded-xl border border-slate-200 shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-slate-500 space-y-1">
              <Camera className="w-6 h-6 text-blue-600" />
              <span className="text-xs font-semibold">เปิดกล้องถ่ายรูป หรือเลือกรูปจากมือถือ</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Reporter Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">
              ชื่อผู้แจ้ง <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="เช่น คุณสมศรี ใจดี"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">เบอร์โทรศัพท์ติดต่อ</label>
            <input
              type="tel"
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
              placeholder="เช่น 086-666-7788"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || uploadingPhoto}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {submitting || uploadingPhoto ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>กำลังส่งข้อมูล & รันคิวช่าง...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>ส่งใบแจ้งซ่อม & ค้นหาช่างอัตโนมัติ</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">กำลังโหลด...</div>}>
      <TicketForm />
    </Suspense>
  );
}
