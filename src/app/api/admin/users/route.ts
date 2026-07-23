import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireUserId, unauthorized } from "@/lib/api";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const userMap = new Map<string, { id: string; email: string; createdAt: string }>();

  // Dev user default
  userMap.set("00000000-0000-0000-0000-000000000000", {
    id: "00000000-0000-0000-0000-000000000000",
    email: "local-user@expense-tracker.dev (ผู้ใช้ปัจจุบัน)",
    createdAt: new Date().toISOString(),
  });

  try {
    const result = await db.execute(sql`
      SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC
    `);
    Array.from(result).forEach((row: any) => {
      const id = String(row.id);
      userMap.set(id, {
        id,
        email: row.email ? String(row.email) : `User ${id.slice(0, 8)}`,
        createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
      });
    });
  } catch (e) {
    try {
      const result = await db.execute(sql`
        SELECT DISTINCT user_id as id FROM user_settings
      `);
      Array.from(result).forEach((row: any) => {
        const id = String(row.id);
        if (!userMap.has(id)) {
          userMap.set(id, {
            id,
            email: `User ${id.slice(0, 8)}`,
            createdAt: new Date().toISOString(),
          });
        }
      });
    } catch {
      // ignore
    }
  }

  return Response.json({ users: Array.from(userMap.values()) });
}
