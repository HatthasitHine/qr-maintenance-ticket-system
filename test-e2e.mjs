const fetch = globalThis.fetch;

let BASE_URL = "http://localhost:3000";

async function getBaseUrl() {
  try {
    const r = await fetch("http://localhost:3000/api/technicians");
    if (r.ok) return "http://localhost:3000";
  } catch (e) {}
  try {
    const r = await fetch("http://localhost:3001/api/technicians");
    if (r.ok) return "http://localhost:3001";
  } catch (e) {}
  return "http://localhost:3000";
}

async function runE2ETest() {
  BASE_URL = await getBaseUrl();
  console.log(`Using server URL: ${BASE_URL}`);
  console.log("==========================================");
  console.log("🚀 STARTING FULL SYSTEM E2E WORKFLOW TEST");
  console.log("==========================================");

  // 1. Create a New Machine & Generate QR
  console.log("\n[STEP 1] Testing Machine Creation & QR Setup...");
  const testCode = `TEST-ROBOT-${Math.floor(Math.random() * 1000)}`;
  const machineRes = await fetch(`${BASE_URL}/api/machines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: testCode,
      name: "หุ่นยนต์เชื่อมชิ้นงาน KUKA Spot Welding",
      location: "โรงงาน 3 - แผนกประกอบหลัก",
    }),
  });
  const machineData = await machineRes.json();
  console.log("Machine creation response:", machineData);
  if (!machineData.success) throw new Error("Failed to create machine");
  const machineId = machineData.machine.id;
  console.log(`✅ Machine Created: ${testCode} (ID: ${machineId})`);

  // 2. Query Technicians and ensure at least one ON_DUTY
  console.log("\n[STEP 2] Checking Available Technicians...");
  const techsRes = await fetch(`${BASE_URL}/api/technicians`);
  const techsData = await techsRes.json();
  console.log(`Found ${techsData.technicians.length} technicians.`);
  const targetTech = techsData.technicians[0];
  console.log(`Target Tech: ${targetTech.name} (${targetTech.id}) - Duty: ${targetTech.dutyStatus}`);

  // Set Tech to ON_DUTY
  const dutyRes = await fetch(`${BASE_URL}/api/technicians/${targetTech.id}/duty`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dutyStatus: "ON_DUTY" }),
  });
  const dutyData = await dutyRes.json();
  console.log(`✅ Tech Status updated to: ${dutyData.technician.dutyStatus}`);

  // 3. Scan & Report Ticket (Operator Flow)
  console.log("\n[STEP 3] Simulating Scan QR & Submitting Repair Ticket...");
  const ticketRes = await fetch(`${BASE_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      machineId: machineId,
      reporterName: "นายช่างควบคุมระบบทดสอบ",
      reporterPhone: "089-999-8877",
      issueDesc: "แขนกลข้อต่อที่ 3 มีอาการสะดุดและ Overheat 85°C",
      urgency: "HIGH",
    }),
  });
  const ticketData = await ticketRes.json();
  console.log("Ticket created:", ticketData);
  if (!ticketData.success) throw new Error("Failed to create ticket");
  const ticketId = ticketData.ticket.id;
  const ticketNo = ticketData.ticket.ticketNo;
  console.log(`✅ Ticket Created: #${ticketNo} (Status: ${ticketData.ticket.status})`);
  console.log(`Assigned to Tech: ${ticketData.ticket.technician?.name || "Auto-dispatched"}`);

  // 4. Technician Action: ACCEPT TICKET
  console.log("\n[STEP 4] Technician Accepting Ticket...");
  const acceptRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "ACCEPT",
      userId: targetTech.id,
    }),
  });
  const acceptData = await acceptRes.json();
  console.log("Accept response:", acceptData);
  if (!acceptData.success || acceptData.ticket.status !== "ACCEPTED") {
    throw new Error("Failed to accept ticket");
  }
  console.log(`✅ Ticket Status is now: ${acceptData.ticket.status}`);
  console.log(`Timestamp acceptedAt: ${acceptData.ticket.acceptedAt}`);

  // 5. Technician Action: ON-SITE START (QR Verification)
  console.log("\n[STEP 5] Technician Arrived On-Site & Scans QR to START Repair...");
  const startRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "START",
      userId: targetTech.id,
      machineCode: testCode, // Must match machine code
    }),
  });
  const startData = await startRes.json();
  console.log("Start repair response:", startData);
  if (!startData.success || startData.ticket.status !== "IN_PROGRESS") {
    throw new Error("Failed to start repair");
  }
  console.log(`✅ Ticket Status is now: ${startData.ticket.status}`);
  console.log(`startQrVerified: ${startData.ticket.startQrVerified}`);
  console.log(`Timestamp startedAt: ${startData.ticket.startedAt}`);

  // 6. Technician Action: CLOSE JOB / RESOLVE
  console.log("\n[STEP 6] Technician Finishes Repair & Submits Resolution Summary...");
  const resolveRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "RESOLVE",
      userId: targetTech.id,
      machineCode: testCode,
      resolutionNotes: "เปลี่ยนมอเตอร์เซอร์โวแกนที่ 3 และเติมจาระบีสังเคราะห์ พร้อมทดสอบ Calibration ผ่าน 100%",
      sparePartsUsed: "Servo Motor KUKA-A3 (1 ตัว), Grease Mobil-EP2",
      repairDurationMinutes: 25,
    }),
  });
  const resolveData = await resolveRes.json();
  console.log("Resolve response:", resolveData);
  if (!resolveData.success || resolveData.ticket.status !== "RESOLVED") {
    throw new Error("Failed to resolve ticket");
  }
  console.log(`✅ Ticket Status is now: ${resolveData.ticket.status}`);
  console.log(`Timestamp resolvedAt: ${resolveData.ticket.resolvedAt}`);
  console.log(`Duration: ${resolveData.ticket.repairDurationMinutes} นาที`);

  // 7. Verify Ticket Detail and Timeline Events
  console.log("\n[STEP 7] Verifying Final Ticket Details & Event Timeline...");
  const finalRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}`);
  const finalData = await finalRes.json();
  console.log(`Final Ticket Status: ${finalData.ticket.status}`);
  console.log(`Total Events Logged: ${finalData.ticket.events.length}`);
  finalData.ticket.events.forEach((ev, idx) => {
    console.log(`  Event ${idx + 1}: [${ev.eventType}] ${ev.description}`);
  });

  console.log("\n==========================================");
  console.log("🎉 ALL END-TO-END WORKFLOW TESTS PASSED 100%!");
  console.log("==========================================");
}

runE2ETest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
