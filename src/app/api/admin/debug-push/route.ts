import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export async function GET() {
  try {
    const subs = await db.select().from(pushSubscriptions);
    return Response.json({ count: subs.length, subscriptions: subs });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
