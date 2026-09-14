export type TicketStatus =
  | "CREATED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REOPENED";

export type UrgencyLevel = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type DutyStatus = "ON_DUTY" | "ON_BREAK" | "OFF_DUTY";

export interface Machine {
  id: string;
  code: string;
  name: string;
  location: string;
  status: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  dutyStatus: DutyStatus;
  lineUserId?: string | null;
  activeTicketCount?: number;
}

export interface TicketEvent {
  id: string;
  ticketId: string;
  actorName: string;
  eventType: string;
  description: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNo: string;
  machineId: string;
  machine: Machine;
  reporterName: string;
  reporterPhone?: string | null;
  issueDesc: string;
  urgency: UrgencyLevel;
  status: TicketStatus;
  technicianId?: string | null;
  technician?: User | null;
  assignmentTimeout?: string | null;
  
  // Timestamps
  acceptedAt?: string | null;
  startedAt?: string | null;
  resolvedAt?: string | null;
  
  photoBeforeUrl?: string | null;
  photoAfterUrl?: string | null;
  sparePartsUsed?: string | null;
  repairDurationMinutes?: number | null;
  startQrVerified: boolean;
  finishQrVerified: boolean;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  events?: TicketEvent[];
}
