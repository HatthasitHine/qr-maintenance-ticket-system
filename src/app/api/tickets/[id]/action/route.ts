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
    const { action, userId, machineCode, resolutionNotes } = body;

    const ticket = await prisma.ticket.findFirst({
      where: { OR: [{ id }, { ticketNo: id }] },
      include: { machine: true, technician: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    const actor = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : ticket.technician;

    const actorName = actor ? actor.name : "ช่างผู้ปฏิบัติงาน";

    switch (action) {
      // ----------------------------------------------------
      // ACTION: ACCEPT TICKET
      // ----------------------------------------------------
      case "ACCEPT": {
        if (ticket.status !== "CREATED" && ticket.status !== "REOPENED") {
          return NextResponse.json(
            {
              success: false,
              error: `ไม่สามารถรับงานได้เนื่องจากสถานะปัจจุบันคือ ${ticket.status}`,
            },
            { status: 400 }
          );
        }

        // Clear timeout timer
        clearTicketTimer(ticket.id);

        const updated = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "ACCEPTED",
            assignmentTimeout: null,
            technicianId: actor?.id || ticket.technicianId,
          },
          include: { machine: true, technician: true },
        });

        await prisma.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorName,
            eventType: "ACCEPTED",
            description: `ช่าง ${actorName} กดรับงานเข้าคิวเรียบร้อยแล้ว`,
            userId: actor?.id,
          },
        });

        return NextResponse.json({
          success: true,
          message: "รับงานเรียบร้อยแล้ว",
          ticket: updated,
        });
      }

      // ----------------------------------------------------
      // ACTION: START REPAIR (Scan QR / Confirm On-site)
      // ----------------------------------------------------
      case "START": {
        if (ticket.status !== "ACCEPTED") {
          return NextResponse.json(
            {
              success: false,
              error: `ไม่สามารถเริ่มงานได้เนื่องจากสถานะปัจจุบันคือ ${ticket.status} (ต้องเป็น ACCEPTED)`,
            },
            { status: 400 }
          );
        }

        // If machineCode verification is supplied, check match
        if (
          machineCode &&
          machineCode.trim().toUpperCase() !== ticket.machine.code.toUpperCase()
        ) {
          return NextResponse.json(
            {
              success: false,
              error: `รหัสเครื่องจักรไม่ถูกต้อง (เครื่องนี้คือ ${ticket.machine.code})`,
            },
            { status: 400 }
          );
        }

        const updated = await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: "IN_PROGRESS" },
          include: { machine: true, technician: true },
        });

        await prisma.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorName,
            eventType: "STARTED",
            description: `ช่าง ${actorName} ยืนยันถึงหน้างานและเริ่มดำเนินการซ่อม`,
            userId: actor?.id,
          },
        });

        return NextResponse.json({
          success: true,
          message: "เริ่มดำเนินการซ่อมเรียบร้อยแล้ว",
          ticket: updated,
        });
      }

      // ----------------------------------------------------
      // ACTION: RESOLVE (Finish with Success)
      // ----------------------------------------------------
      case "RESOLVE": {
        if (ticket.status !== "IN_PROGRESS") {
          return NextResponse.json(
            {
              success: false,
              error: `ไม่สามารถปิดงานได้เนื่องจากสถานะปัจจุบันคือ ${ticket.status} (ต้องเป็น IN_PROGRESS)`,
            },
            { status: 400 }
          );
        }

        const notes = resolutionNotes || "ซ่อมบำรุงเสร็จสิ้นตามมาตรฐาน";

        const updated = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolutionNotes: notes,
          },
          include: { machine: true, technician: true },
        });

        await prisma.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorName,
            eventType: "RESOLVED",
            description: `ปิดงานซ่อม [สำเร็จ]: ${notes}`,
            userId: actor?.id,
          },
        });

        return NextResponse.json({
          success: true,
          message: "ปิดงานสำเร็จ จบกระบวนการ",
          ticket: updated,
        });
      }

      // ----------------------------------------------------
      // ACTION: REOPEN (Finish with Failure / Needs further work)
      // ----------------------------------------------------
      case "REOPEN": {
        if (ticket.status !== "IN_PROGRESS") {
          return NextResponse.json(
            {
              success: false,
              error: `ไม่สามารถปรับสถานะได้เนื่องจากสถานะปัจจุบันคือ ${ticket.status}`,
            },
            { status: 400 }
          );
        }

        const notes =
          resolutionNotes ||
          "ซ่อมไม่สำเร็จ / รออะไหล่เพิ่มเติม วนกลับเข้าคิวช่างเดิม";

        const updated = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "REOPENED",
            resolutionNotes: notes,
          },
          include: { machine: true, technician: true },
        });

        await prisma.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            actorName,
            eventType: "REOPENED",
            description: `ปิดงาน [ไม่สำเร็จ]: ${notes} ➔ ส่งกลับเข้าคิวช่างเดิม (${ticket.technician?.name || "ช่างเดิม"})`,
            userId: actor?.id,
          },
        });

        return NextResponse.json({
          success: true,
          message: "บันทึกผลไม่สำเร็จ และวนงานกลับเข้าคิวช่างเดิมแล้ว",
          ticket: updated,
        });
      }

      // ----------------------------------------------------
      // ACTION: TIMEOUT ESCALATION TRIGGER
      // ----------------------------------------------------
      case "TIMEOUT_ESCALATE": {
        if (ticket.status === "CREATED" && ticket.technicianId) {
          await processTicketTimeout(ticket.id, ticket.technicianId);
          const refreshed = await prisma.ticket.findUnique({
            where: { id: ticket.id },
            include: { machine: true, technician: true },
          });
          return NextResponse.json({
            success: true,
            message: "ประมวลผล timeout escalation เรียบร้อยแล้ว",
            ticket: refreshed,
          });
        }
        return NextResponse.json({
          success: true,
          message: "ไม่มีการเปลี่ยนแปลง (ตั๋วไม่ได้อยู่ในสถานะ CREATED หรือรับงานแล้ว)",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing ticket action:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process ticket action" },
      { status: 500 }
    );
  }
}
