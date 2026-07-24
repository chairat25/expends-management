import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userNotifications } from "@/db/schema";
import { sendWebPushNotification } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const { userId, title, body } = await req.json();

    if (!userId || !title?.trim() || !body?.trim()) {
      return Response.json(
        { error: "กรุณาระบุผู้ใช้ หัวข้อ และข้อความแจ้งเตือน" },
        { status: 400 },
      );
    }

    const notiTitle = String(title).trim();
    const notiBody = String(body).trim();

    // 1. Insert notification in DB for target user
    try {
      await db.insert(userNotifications).values({
        userId,
        title: notiTitle,
        message: notiBody,
        type: "system",
        link: "/",
      });
    } catch (dbErr) {
      console.error("Failed to insert userNotification in admin push", dbErr);
    }

    // 2. Send Native WebPush notification to target user's registered devices
    const pushResult = await sendWebPushNotification(userId, {
      title: notiTitle,
      body: notiBody,
      url: "/",
    });

    return Response.json({
      success: true,
      pushResult,
    });
  } catch (err: any) {
    return Response.json(
      { error: err.message || "เกิดข้อผิดพลาดในการยิงแจ้งเตือน" },
      { status: 500 },
    );
  }
}
