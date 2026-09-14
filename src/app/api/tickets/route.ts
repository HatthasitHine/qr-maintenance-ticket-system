import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findLeastBusyTechnician, assignTicket } from "@/lib/dispatcher";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const techId = searchParams.get("technicianId");
    const status = searchParams.get("status");
    const machineId = searchParams.get("machineId");

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(techId ? { technicianId: techId } : {}),
        ...(status ? { status } : {}),
        ...(machineId ? { machineId } : {}),
      },
      include: {
        machine: true,
        technician: true,
        events: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      machineId,
      reporterName,
      reporterPhone,
      issueDesc,
      urgency,
      photoBeforeUrl,
    } = body;

    if (!machineId || !reporterName || !issueDesc) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: "Machine not found" },
        { status: 404 }
      );
    }

    // Generate Ticket Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const todayCount = await prisma.ticket.count({
      where: {
        ticketNo: { startsWith: `TK-${dateStr}` },
      },
    });
    const ticketNo = `TK-${dateStr}-${String(todayCount + 1).padStart(3, "0")}`;

    // 1. Create Ticket with CREATED status
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo,
        machineId: machine.id,
        reporterName,
        reporterPhone: reporterPhone || null,
        issueDesc,
        urgency: urgency || "NORMAL",
        status: "CREATED",
        photoBeforeUrl: photoBeforeUrl || null,
      },
      include: {
        machine: true,
      },
    });

    // 2. Log CREATED Event
    await prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorName: reporterName,
        eventType: "CREATED",
        description: `แจ้งซ่อมเครื่องจักร ${machine.name} (${machine.code}) - อาการ: ${issueDesc}`,
      },
    });

    // 3. Auto Dispatch: Pick technician with least active tickets
    const leastBusyTech = await findLeastBusyTechnician();
    let assignedTicket = ticket;

    if (leastBusyTech) {
      const assigned = await assignTicket(ticket.id, leastBusyTech.id);
      if (assigned) {
        assignedTicket = {
          ...ticket,
          ...assigned,
        };
      }
    }

    return NextResponse.json(
      { success: true, ticket: assignedTicket },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
