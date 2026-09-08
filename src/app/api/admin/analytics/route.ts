import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, userSettings, salaries, dailyBudgets, appCategories } from "@/db/schema";
import { requireUserId, unauthorized } from "@/lib/api";
import { todayKey, thisMonthKey } from "@/lib/shared";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") || undefined;
  const ym = searchParams.get("ym") || thisMonthKey();

  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-31`;

  // Filter conditions
  const conditions = [
    gte(transactions.date, monthStart),
    lte(transactions.date, monthEnd),
  ];

  if (targetUserId) {
    conditions.push(eq(transactions.userId, targetUserId));
  }

  const txs = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.spentAt));

  let totalExpense = 0;
  let totalIncome = 0;
  const categoryMap: Record<string, { count: number; total: number }> = {};
  const dailyMap: Record<string, { expense: number; income: number }> = {};

  for (const t of txs) {
    const amt = Number(t.amount);
    if (t.type === "expense") {
      totalExpense += amt;
      categoryMap[t.category] = categoryMap[t.category] || { count: 0, total: 0 };
      categoryMap[t.category].count += 1;
      categoryMap[t.category].total += amt;

      dailyMap[t.date] = dailyMap[t.date] || { expense: 0, income: 0 };
      dailyMap[t.date].expense += amt;
    } else {
      totalIncome += amt;
      dailyMap[t.date] = dailyMap[t.date] || { expense: 0, income: 0 };
      dailyMap[t.date].income += amt;
    }
  }

  const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    count: data.count,
    total: data.total,
    percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
  })).sort((a, b) => b.total - a.total);

  const dailyTrend = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    expense: data.expense,
    income: data.income,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return Response.json({
    ym,
    totalExpense,
    totalIncome,
    netSavings: totalIncome - totalExpense,
    transactionCount: txs.length,
    categoryBreakdown,
    dailyTrend,
  });
}
