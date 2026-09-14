import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const machines = await prisma.machine.findMany({
      orderBy: { code: "asc" },
    });
    return NextResponse.json({ success: true, machines });
  } catch (error) {
    console.error("Error fetching machines:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch machines" },
      { status: 500 }
    );
  }
}
