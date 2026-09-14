import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, location, status } = body;

    if (!code || !name || !location) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรหัสเครื่องจักร, ชื่อ, และสถานที่ติดตั้งให้ครบ" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Check duplicate code
    const existing = await prisma.machine.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `รหัสเครื่องจักร ${cleanCode} มีอยู่ในระบบแล้ว` },
        { status: 400 }
      );
    }

    const newMachine = await prisma.machine.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        location: location.trim(),
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, machine: newMachine }, { status: 201 });
  } catch (error) {
    console.error("Error creating machine:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create machine" },
      { status: 500 }
    );
  }
}
