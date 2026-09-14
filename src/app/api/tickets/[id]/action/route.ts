import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearTicketTimer, processTicketTimeout } from "@/lib/dispatcher";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      action,
      userId,
      machineCode,
      resolutionNotes,
      photoAfterUrl,
      sparePartsUsed,
      repairDurationMinutes,
    } = body;

    // Use Prisma Transaction to prevent Race Conditions (Concurrency Lock)
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { OR: [{ id }, { ticketNo: id }] },
        include: { machine: true, technician: true },
      });

      if (!ticket) {
        throw new Error("NOT_FOUND");
      }

      const actor = userId
        ? await tx.user.findUnique({ where: { id: userId } })
        : ticket.technician;

      const actorName = actor ? actor.name : "ช่างผู้ปฏิบัติงาน";
      const now = new Date();

      switch (action) {
        // ----------------------------------------------------
        // ACTION: ACCEPT TICKET (Records acceptedAt)
        // ----------------------------------------------------
        case "ACCEPT": {
          if (ticket.status !== "CREATED" && ticket.status !== "REOPENED") {
            throw new Error(`ALREADY_PROCESSED: งานนี้อยู่ในสถานะ ${ticket.status} แล้ว`);
          }

          // Clear timeout timer
          clearTicketTimer(ticket.id);

          const updated = await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "ACCEPTED",
              acceptedAt: now,
              assignmentTimeout: null,
              technicianId: actor?.id || ticket.technicianId,
            },
            include: { machine: true, technician: true },
          });

          await tx.ticketEvent.create({
            data: {
              ticketId: ticket.id,
              actorName,
              eventType: "ACCEPTED",
              description: `ช่าง ${actorName} กดรับงานเข้าคิวเมื่อ ${now.toLocaleTimeString("th-TH")}`,
              userId: actor?.id,
            },
          });

          return { message: "รับงานเรียบร้อยแล้ว", ticket: updated };
        }

        // ----------------------------------------------------
        // ACTION: START REPAIR (Records startedAt)
        // ----------------------------------------------------
        case "START": {
          if (ticket.status !== "ACCEPTED") {
            throw new Error(`INVALID_STATE: ต้องอยู่ในสถานะ ACCEPTED ก่อน (ปัจจุบันคือ ${ticket.status})`);
          }

          let verified = false;
          if (machineCode) {
            if (machineCode.trim().toUpperCase() !== ticket.machine.code.toUpperCase()) {
              throw new Error(`QR_MISMATCH: รหัสเครื่องจักรไม่ถูกต้อง (เครื่องนี้คือ ${ticket.machine.code})`);
            }
            verified = true;
          }

          const updated = await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "IN_PROGRESS",
              startedAt: now,
              startQrVerified: verified || ticket.startQrVerified,
            },
            include: { machine: true, technician: true },
          });

          await tx.ticketEvent.create({
            data: {
              ticketId: ticket.id,
              actorName,
              eventType: "STARTED",
              description: verified
                ? `ช่าง ${actorName} สแกน QR ยืนยันถึงหน้าเครื่องจักร (${ticket.machine.code}) และเริ่มซ่อมเมื่อ ${now.toLocaleTimeString("th-TH")}`
                : `ช่าง ${actorName} เริ่มดำเนินการซ่อมเมื่อ ${now.toLocaleTimeString("th-TH")}`,
              userId: actor?.id,
            },
          });

          return { message: "เริ่มดำเนินการซ่อมเรียบร้อยแล้ว", ticket: updated };
        }

        // ----------------------------------------------------
        // ACTION: RESOLVE (Records resolvedAt & duration)
        // ----------------------------------------------------
        case "RESOLVE": {
          if (ticket.status !== "IN_PROGRESS") {
            throw new Error(`INVALID_STATE: ต้องอยู่ในสถานะ IN_PROGRESS ก่อนปิดงาน`);
          }

          let verified = false;
          if (machineCode) {
            if (machineCode.trim().toUpperCase() !== ticket.machine.code.toUpperCase()) {
              throw new Error(`QR_MISMATCH: รหัสเครื่องจักรไม่ถูกต้อง (เครื่องนี้คือ ${ticket.machine.code})`);
            }
            verified = true;
          }

          const notes = resolutionNotes || "ซ่อมบำรุงเสร็จสิ้นตามมาตรฐาน";

          // Calculate duration in minutes if startedAt exists
          let calculatedDuration = repairDurationMinutes;
          if (!calculatedDuration && ticket.startedAt) {
            const diffMs = now.getTime() - new Date(ticket.startedAt).getTime();
            calculatedDuration = Math.max(1, Math.round(diffMs / (1000 * 60)));
          }

          const updated = await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "RESOLVED",
              resolvedAt: now,
              resolutionNotes: notes,
              photoAfterUrl: photoAfterUrl || ticket.photoAfterUrl,
              sparePartsUsed: sparePartsUsed || ticket.sparePartsUsed,
              repairDurationMinutes: calculatedDuration || null,
              finishQrVerified: verified || ticket.finishQrVerified,
            },
            include: { machine: true, technician: true },
          });

          await tx.ticketEvent.create({
            data: {
              ticketId: ticket.id,
              actorName,
              eventType: "RESOLVED",
              description: `ปิดงานซ่อม [สำเร็จ] เมื่อ ${now.toLocaleTimeString("th-TH")}: ${notes}${
                calculatedDuration ? ` (ใช้เวลาซ่อม ${calculatedDuration} นาที)` : ""
              }${sparePartsUsed ? ` (อะไหล่: ${sparePartsUsed})` : ""}`,
              userId: actor?.id,
            },
          });

          return { message: "ปิดงานสำเร็จ จบกระบวนการ", ticket: updated };
        }

        // ----------------------------------------------------
        // ACTION: REOPEN (Records re-entry timestamp)
        // ----------------------------------------------------
        case "REOPEN": {
          if (ticket.status !== "IN_PROGRESS") {
            throw new Error(`INVALID_STATE: ไม่สามารถปรับสถานะได้`);
          }

          const notes = resolutionNotes || "ซ่อมไม่สำเร็จ / รออะไหล่เพิ่มเติม วนกลับเข้าคิวช่างเดิม";

          const updated = await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: "REOPENED",
              resolutionNotes: notes,
              photoAfterUrl: photoAfterUrl || ticket.photoAfterUrl,
              sparePartsUsed: sparePartsUsed || ticket.sparePartsUsed,
            },
            include: { machine: true, technician: true },
          });

          await tx.ticketEvent.create({
            data: {
              ticketId: ticket.id,
              actorName,
              eventType: "REOPENED",
              description: `ปิดงาน [ไม่สำเร็จ] เมื่อ ${now.toLocaleTimeString("th-TH")}: ${notes} ➔ วนงานกลับเข้าคิวช่างเดิม`,
              userId: actor?.id,
            },
          });

          return { message: "บันทึกผลไม่สำเร็จ และวนงานกลับเข้าคิวช่างเดิมแล้ว", ticket: updated };
        }

        // ----------------------------------------------------
        // ACTION: TIMEOUT ESCALATION TRIGGER
        // ----------------------------------------------------
        case "TIMEOUT_ESCALATE": {
          if (ticket.status === "CREATED" && ticket.technicianId) {
            await processTicketTimeout(ticket.id, ticket.technicianId);
            const refreshed = await tx.ticket.findUnique({
              where: { id: ticket.id },
              include: { machine: true, technician: true },
            });
            return { message: "ประมวลผล timeout escalation สำเร็จ", ticket: refreshed };
          }
          return { message: "ไม่มีการเปลี่ยนแปลง" };
        }

        default:
          throw new Error(`INVALID_ACTION: ${action}`);
      }
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Error processing ticket action:", error);
    const msg = error.message || "Failed to process ticket action";
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg === "NOT_FOUND" ? 404 : 400 }
    );
  }
}
