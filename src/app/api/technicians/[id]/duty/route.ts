import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { dutyStatus } = body;

    if (!["ON_DUTY", "ON_BREAK", "OFF_DUTY"].includes(dutyStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid dutyStatus value" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { dutyStatus },
    });

    return NextResponse.json({
      success: true,
      message: `เปลี่ยนสถานะเป็น ${dutyStatus} สำเร็จ`,
      technician: updated,
    });
  } catch (error) {
    console.error("Error updating duty status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update duty status" },
      { status: 500 }
    );
  }
}
