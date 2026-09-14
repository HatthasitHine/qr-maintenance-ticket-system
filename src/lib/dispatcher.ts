import { prisma } from "./prisma";
import { sendLineTicketNotification } from "./line";

// In-memory active timers map: ticketId -> NodeJS.Timeout
const activeTimers = new Map<string, NodeJS.Timeout>();

export const DEFAULT_TIMEOUT_SECONDS = parseInt(
  process.env.ASSIGNMENT_TIMEOUT_SECONDS || "60",
  10
);

/**
 * Finds the technician with the least number of active tickets (ACCEPTED / IN_PROGRESS)
 * who is currently ON_DUTY.
 */
export async function findLeastBusyTechnician(excludeUserIds: string[] = []) {
  const technicians = await prisma.user.findMany({
    where: {
      role: "TECHNICIAN",
      dutyStatus: "ON_DUTY",
      ...(excludeUserIds.length > 0 ? { id: { notIn: excludeUserIds } } : {}),
    },
    include: {
      assignedTickets: {
        where: {
          status: { in: ["ACCEPTED", "IN_PROGRESS"] },
        },
        select: { id: true },
      },
    },
  });

  if (technicians.length === 0) {
    // If all on-duty were excluded, fallback to any on-duty technician
    if (excludeUserIds.length > 0) {
      return findLeastBusyTechnician([]);
    }
    return null;
  }

  // Sort by number of active tickets ascending
  technicians.sort(
    (a, b) => a.assignedTickets.length - b.assignedTickets.length
  );

  return {
    ...technicians[0],
    activeTicketCount: technicians[0].assignedTickets.length,
  };
}

/**
 * Assigns a ticket to a technician and arms a timeout for auto-escalation.
 * Triggers LINE Flex Message notification.
 */
export async function assignTicket(
  ticketId: string,
  technicianId: string,
  timeoutSeconds: number = DEFAULT_TIMEOUT_SECONDS
) {
  // Clear any existing timer for this ticket
  if (activeTimers.has(ticketId)) {
    clearTimeout(activeTimers.get(ticketId));
    activeTimers.delete(ticketId);
  }

  const timeoutDate = new Date(Date.now() + timeoutSeconds * 1000);

  const [ticket, tech] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { machine: true },
    }),
    prisma.user.findUnique({ where: { id: technicianId } }),
  ]);

  if (!ticket || !tech) return null;

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      technicianId: tech.id,
      assignmentTimeout: timeoutDate,
    },
  });

  // Log Event
  await prisma.ticketEvent.create({
    data: {
      ticketId: ticket.id,
      actorName: "ระบบจัดคิวอัตโนมัติ",
      eventType: "ASSIGNED",
      description: `มอบหมายงานให้ช่าง ${tech.name} (มีเวลากดรับภายใน ${timeoutSeconds} วินาที)`,
      userId: tech.id,
    },
  });

  // Trigger LINE Bot Flex Message Notification
  try {
    await sendLineTicketNotification({
      lineUserId: tech.lineUserId,
      ticketNo: ticket.ticketNo,
      ticketId: ticket.id,
      machineName: ticket.machine.name,
      machineCode: ticket.machine.code,
      location: ticket.machine.location,
      issueDesc: ticket.issueDesc,
      urgency: ticket.urgency,
      timeoutSeconds,
    });
  } catch (err) {
    console.error("Failed to send LINE notification:", err);
  }

  // Arm In-Memory Timeout Timer
  const timer = setTimeout(async () => {
    try {
      await processTicketTimeout(ticketId, tech.id);
    } catch (err) {
      console.error(`Error processing timeout for ticket ${ticketId}:`, err);
    } finally {
      activeTimers.delete(ticketId);
    }
  }, timeoutSeconds * 1000);

  activeTimers.set(ticketId, timer);
  return updatedTicket;
}

/**
 * Process timeout: If still CREATED and not accepted, auto-reassign to next technician.
 */
export async function processTicketTimeout(
  ticketId: string,
  assignedTechId: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { technician: true },
  });

  if (!ticket) return;

  // Only reassign if ticket is STILL in CREATED status and assigned to this tech
  if (ticket.status === "CREATED" && ticket.technicianId === assignedTechId) {
    const prevTechName = ticket.technician?.name || "ช่างเดิม";

    // Find next technician excluding this timed-out technician
    const nextTech = await findLeastBusyTechnician([assignedTechId]);

    if (nextTech) {
      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          actorName: "ระบบจัดคิวอัตโนมัติ (Timeout)",
          eventType: "TIMEOUT_ESCALATED",
          description: `ช่าง ${prevTechName} ไม่ได้รับงานในเวลาที่กำหนด ➔ ส่งต่องานอัตโนมัติไปยังช่าง ${nextTech.name}`,
        },
      });

      // Reassign to new tech
      await assignTicket(ticket.id, nextTech.id, DEFAULT_TIMEOUT_SECONDS);
    }
  }
}

/**
 * Clears the timeout timer when a technician accepts the ticket.
 */
export function clearTicketTimer(ticketId: string) {
  if (activeTimers.has(ticketId)) {
    clearTimeout(activeTimers.get(ticketId));
    activeTimers.delete(ticketId);
  }
}
