import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const technicians = await prisma.user.findMany({
      where: { role: "TECHNICIAN" },
      include: {
        assignedTickets: {
          where: {
            status: { in: ["ACCEPTED", "IN_PROGRESS"] },
          },
          select: { id: true, status: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = technicians.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      role: t.role,
      dutyStatus: (t.dutyStatus || "ON_DUTY") as "ON_DUTY" | "ON_BREAK" | "OFF_DUTY",
      lineUserId: t.lineUserId,
      activeTicketCount: t.assignedTickets.length,
    }));

    return NextResponse.json({ success: true, technicians: formatted });
  } catch (error) {
    console.error("Error fetching technicians:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch technicians" },
      { status: 500 }
    );
  }
}
