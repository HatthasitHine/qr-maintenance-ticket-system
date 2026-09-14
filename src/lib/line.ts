import { messagingApi } from "@line/bot-sdk";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

// Initialize LINE client if token is provided
const client = channelAccessToken
  ? new messagingApi.MessagingApiClient({
      channelAccessToken,
    })
  : null;

/**
 * Sends a 1-on-1 Flex Message to the assigned technician with machine details and an instant ACCEPT button.
 */
export async function sendLineTicketNotification({
  lineUserId,
  ticketNo,
  ticketId,
  machineName,
  machineCode,
  location,
  issueDesc,
  urgency,
  timeoutSeconds = 60,
  baseUrl = "http://localhost:3000",
}: {
  lineUserId?: string | null;
  ticketNo: string;
  ticketId: string;
  machineName: string;
  machineCode: string;
  location: string;
  issueDesc: string;
  urgency: string;
  timeoutSeconds?: number;
  baseUrl?: string;
}) {
  if (!client || !lineUserId) {
    console.log(
      `[LINE BOT SIMULATION] Push to User [${lineUserId || "NO_LINE_ID"}]: Ticket #${ticketNo} for ${machineName} (${machineCode})`
    );
    return false;
  }

  try {
    const urgencyColor =
      urgency === "CRITICAL"
        ? "#EF4444"
        : urgency === "HIGH"
        ? "#F59E0B"
        : "#3B82F6";

    await client.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: "flex",
          altText: `🚨 มีงานซ่อมบำรุงใหม่ #${ticketNo} (${machineCode})`,
          contents: {
            type: "bubble",
            header: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "🚨 งานซ่อมบำรุงใหม่ (New Ticket)",
                  weight: "bold",
                  color: "#FFFFFF",
                  size: "sm",
                },
                {
                  type: "text",
                  text: `#${ticketNo}`,
                  weight: "bold",
                  size: "xl",
                  color: "#FFFFFF",
                  margin: "xs",
                },
              ],
              backgroundColor: urgencyColor,
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  spacing: "sm",
                  contents: [
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "เครื่อง:",
                          color: "#888888",
                          size: "xs",
                          flex: 2,
                        },
                        {
                          type: "text",
                          text: `${machineName} (${machineCode})`,
                          wrap: true,
                          color: "#111111",
                          size: "xs",
                          flex: 5,
                          weight: "bold",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "สถานที่:",
                          color: "#888888",
                          size: "xs",
                          flex: 2,
                        },
                        {
                          type: "text",
                          text: location,
                          wrap: true,
                          color: "#333333",
                          size: "xs",
                          flex: 5,
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "อาการ:",
                          color: "#888888",
                          size: "xs",
                          flex: 2,
                        },
                        {
                          type: "text",
                          text: issueDesc,
                          wrap: true,
                          color: "#E11D48",
                          size: "xs",
                          flex: 5,
                          weight: "bold",
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "เวลากดรับ:",
                          color: "#888888",
                          size: "xs",
                          flex: 2,
                        },
                        {
                          type: "text",
                          text: `ภายใน ${timeoutSeconds} วินาที`,
                          color: "#F59E0B",
                          size: "xs",
                          flex: 5,
                          weight: "bold",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            footer: {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "sm",
                  color: "#10B981",
                  action: {
                    type: "uri",
                    label: "✅ กดรับงานทันที (Accept)",
                    uri: `${baseUrl}/technician?action=accept&ticket_id=${ticketId}`,
                  },
                },
                {
                  type: "button",
                  style: "link",
                  height: "sm",
                  action: {
                    type: "uri",
                    label: "🔍 ดูรายละเอียดหน้าเว็บ",
                    uri: `${baseUrl}/ticket/${ticketNo}`,
                  },
                },
              ],
            },
          },
        },
      ],
    });
    return true;
  } catch (err) {
    console.error("Error sending LINE push message:", err);
    return false;
  }
}
