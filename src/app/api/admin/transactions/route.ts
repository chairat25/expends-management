import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { badRequest, requireUserId, unauthorized } from "@/lib/api";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const category = searchParams.get("category") || undefined;
  const type = searchParams.get("type") || undefined;

  const conditions: any[] = [];
  if (targetUserId) conditions.push(eq(transactions.userId, targetUserId));
  if (from) conditions.push(gte(transactions.date, from));
  if (to) conditions.push(lte(transactions.date, to));
  if (category) conditions.push(eq(transactions.category, category));
  if (type === "income" || type === "expense") conditions.push(eq(transactions.type, type));

  const rows = await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.spentAt), desc(transactions.id))
    .limit(200);

  return Response.json({ transactions: rows });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return badRequest("Transaction ID is required");

  await db.delete(transactions).where(eq(transactions.id, id));
  return Response.json({ success: true });
}
