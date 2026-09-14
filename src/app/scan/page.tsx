"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QrCode,
  Camera,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Upload,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";

function CameraScannerComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "report"; // report | start | finish
  const ticketId = searchParams.get("ticket_id") || "";

  const [scanning, setScanning] = useState<boolean>(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    async function initScanner() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("rear") ||
              d.label.toLowerCase().includes("environment")
          );
          const chosenId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(chosenId);
          startCamera(chosenId);
        } else {
          setErrorMsg("ไม่พบกล้องในอุปกรณ์นี้ สามารถใช้ปุ่มจำลองด้านล่างได้");
        }
      } catch (err) {
        console.warn("Camera permission error:", err);
        setErrorMsg("กรุณาอนุญาตการเข้าถึงกล้อง หรือเลือกใช้ปุ่มจำลองด้านล่าง");
      }
    }

    initScanner();

    return () => {
      if (scannerRef.current) {
        try {
          if (
            typeof (scannerRef.current as any).getState === "function" &&
            (scannerRef.current as any).getState() === 2
          ) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch (e) {}
      }
    };
  }, []);

  async function startCamera(cameraId: string) {
    try {
      if (scannerRef.current) {
        try {
          if (
            typeof (scannerRef.current as any).getState === "function" &&
            (scannerRef.current as any).getState() === 2
          ) {
            await scannerRef.current.stop();
          }
        } catch (e) {}
      }

      const qr = new Html5Qrcode("qr-reader");
      scannerRef.current = qr;

      await qr.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScannedData(decodedText);
        },
        () => {}
      );
      setScanning(true);
      setErrorMsg(null);
    } catch (err: any) {
      console.error("Start camera failed:", err);
      setErrorMsg("ไม่สามารถเปิดกล้องได้: " + (err.message || err));
      setScanning(false);
    }
  }

  function handleScannedData(text: string) {
    let cleanText = (text || "").trim();
    if (!cleanText) return;

    setScanResult(cleanText);

    // Stop scanning safely once detected
    if (scannerRef.current) {
      try {
        if (
          typeof (scannerRef.current as any).getState === "function" &&
          (scannerRef.current as any).getState() === 2
        ) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      }
    }

    // Extract machine_id or machine code safely from text or URL
    let machineParam = cleanText;
    if (cleanText.includes("machine_id=")) {
      const match = cleanText.match(/machine_id=([^&#]+)/);
      if (match && match[1]) {
        machineParam = decodeURIComponent(match[1]);
      }
    } else if (cleanText.includes("/ticket/new/")) {
      const parts = cleanText.split("/ticket/new/");
      if (parts[1]) machineParam = decodeURIComponent(parts[1].split(/[?#]/)[0]);
    }

    let targetUrl = `/ticket/new?machine_id=${encodeURIComponent(machineParam)}`;
    if (mode === "start") {
      targetUrl = `/technician?action=start&ticket_id=${encodeURIComponent(
        ticketId
      )}&machine_code=${encodeURIComponent(machineParam)}`;
    } else if (mode === "finish") {
      targetUrl = `/technician?action=finish&ticket_id=${encodeURIComponent(
        ticketId
      )}&machine_code=${encodeURIComponent(machineParam)}`;
    }

    setTimeout(() => {
      window.location.href = targetUrl;
    }, 300);
  }

  // Handle Photo File Upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const qr = new Html5Qrcode("qr-reader");
      const result = await qr.scanFile(file, true);
      handleScannedData(result);
    } catch (err) {
      alert("ไม่พบ QR Code ในรูปภาพที่เลือก กรุณาลองใหม่อีกครั้ง");
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
        </Link>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
          {mode === "report" ? "สแกนแจ้งซ่อม" : mode === "start" ? "สแกนเริ่มซ่อม" : "สแกนปิดงาน"}
        </span>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <Camera className="w-6 h-6 text-blue-600" />
          {mode === "report"
            ? "ส่องกล้องสแกน QR หน้าเครื่อง"
            : mode === "start"
            ? "สแกน QR เพื่อเริ่มซ่อมหน้างาน"
            : "สแกน QR ยืนยันปิดงาน"}
        </h1>
        <p className="text-xs text-slate-500">
          นำกล้องมือถือส่องไปที่ป้าย QR Code ที่ติดอยู่บนเครื่องจักร
        </p>
      </div>

      {/* Camera Viewfinder Box */}
      <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800 relative aspect-square flex items-center justify-center">
        <div id="qr-reader" className="w-full h-full" />

        {scanResult && (
          <div className="absolute inset-0 bg-emerald-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 space-y-2 z-20">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 animate-bounce" />
            <div className="font-bold text-lg">สแกนสำเร็จ!</div>
            <div className="text-xs text-emerald-200 break-all">{scanResult}</div>
            <div className="text-xs text-slate-300">กำลังเปิดหน้าถัดไป...</div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Camera Controls & File Upload */}
      <div className="grid grid-cols-2 gap-3">
        {cameras.length > 1 && (
          <select
            value={selectedCameraId}
            onChange={(e) => {
              setSelectedCameraId(e.target.value);
              startCamera(e.target.value);
            }}
            className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                📷 {c.label || `Camera ${c.id.substring(0, 4)}`}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm">
          <Upload className="w-4 h-4 text-blue-600" />
          <span>เลือกรูป QR จากเครื่อง</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Quick Demo Simulator Buttons (Always works without webcam) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>ปุ่มจำลองการสแกน (Demo Instant Click):</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { code: "MC-01", name: "เครื่องฉีด CNC #1" },
            { code: "MC-02", name: "สายพาน Conveyor B2" },
            { code: "AC-301", name: "แอร์ห้อง 301" },
            { code: "PUMP-01", name: "ปั๊มน้ำหล่อเย็น" },
          ].map((m) => (
            <button
              key={m.code}
              onClick={() => handleScannedData(m.code)}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left text-xs transition-all"
            >
              <div className="font-bold text-slate-800">[{m.code}]</div>
              <div className="text-[10px] text-slate-500 truncate">{m.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ScanQrPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">กำลังโหลดกล้อง...</div>}>
      <CameraScannerComponent />
    </Suspense>
  );
}
