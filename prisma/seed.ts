import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.ticketEvent.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.machine.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Machines
  const machines = await Promise.all([
    prisma.machine.create({
      data: {
        code: "MC-01",
        name: "เครื่องฉีดพลาสติกไฮดรอลิก CNC #1",
        location: "โรงงาน 1 - โซน A",
        status: "ACTIVE",
      },
    }),
    prisma.machine.create({
      data: {
        code: "MC-02",
        name: "สายพานลำเลียงอัตโนมัติ Conveyor B2",
        location: "โรงงาน 1 - โซน Packing",
        status: "ACTIVE",
      },
    }),
    prisma.machine.create({
      data: {
        code: "AC-301",
        name: "เครื่องปรับอากาศ VRV ห้องควบคุมกลาง 301",
        location: "อาคารบริหาร ชั้น 3",
        status: "ACTIVE",
      },
    }),
    prisma.machine.create({
      data: {
        code: "PUMP-01",
        name: "ปั๊มน้ำหล่อเย็น Main Booster Pump",
        location: "อาคารสาธารณูปโภค ชั้นใต้ดิน",
        status: "ACTIVE",
      },
    }),
  ]);

  console.log(`✅ Created ${machines.length} machines`);

  // 2. Create Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "ช่างสมชาย มั่นคง",
        email: "somchai@company.local",
        phone: "081-111-2233",
        role: "TECHNICIAN",
      },
    }),
    prisma.user.create({
      data: {
        name: "ช่างวิชัย เย็นสบาย",
        email: "wichai@company.local",
        phone: "082-222-3344",
        role: "TECHNICIAN",
      },
    }),
    prisma.user.create({
      data: {
        name: "ช่างธีระ สารพัดช่าง",
        email: "theera@company.local",
        phone: "083-333-4455",
        role: "TECHNICIAN",
      },
    }),
    prisma.user.create({
      data: {
        name: "ผู้ดูแลระบบ (Admin)",
        email: "admin@company.local",
        phone: "089-999-0000",
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        name: "คุณสมศรี ใจดี (Operator)",
        email: "somsri@company.local",
        phone: "086-666-7788",
        role: "OPERATOR",
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);
  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
