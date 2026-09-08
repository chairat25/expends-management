import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { userSettings, salaries, dailyBudgets, weeklyEnvelopes } from "@/db/schema";
import { badRequest, requireUserId, unauthorized } from "@/lib/api";
import { thisMonthKey, getMonthWeeks } from "@/lib/shared";

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");
  if (!targetUserId) return badRequest("userId is required");

  const ym = searchParams.get("ym") || thisMonthKey();

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, targetUserId));

  const [salary] = await db
    .select()
    .from(salaries)
    .where(and(eq(salaries.userId, targetUserId), eq(salaries.ym, ym)));

  const envelopes = await db
    .select()
    .from(weeklyEnvelopes)
    .where(and(eq(weeklyEnvelopes.userId, targetUserId), eq(weeklyEnvelopes.ym, ym)));

  const dailyList = await db
    .select()
    .from(dailyBudgets)
    .where(eq(dailyBudgets.userId, targetUserId));

  const monthWeeks = getMonthWeeks(ym);

  return Response.json({
    ym,
    targetUserId,
    settings: settings || null,
    salary: salary ? Number(salary.amount) : Number(settings?.defaultSalary ?? 0),
    envelopes,
    dailyBudgets: dailyList,
    monthWeeks,
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const body = await req.json();
  const { targetUserId, ym, monthlySalary, dailyBudget, dailyDate, envelopes } = body;

  if (!targetUserId) return badRequest("targetUserId is required");
  const targetYm = ym || thisMonthKey();

  // 1. Update Monthly Salary
  if (monthlySalary !== undefined) {
    const numSalary = Number(monthlySalary);
    await db
      .insert(salaries)
      .values({
        userId: targetUserId,
        ym: targetYm,
        amount: numSalary.toFixed(2),
        receivedAt: `${targetYm}-01`,
        note: "กำหนดจาก Expense Dashboard",
      })
      .onConflictDoUpdate({
        target: [salaries.userId, salaries.ym],
        set: {
          amount: numSalary.toFixed(2),
        },
      });

    // Also update defaultSalary in user_settings
    await db
      .insert(userSettings)
      .values({
        userId: targetUserId,
        defaultSalary: numSalary.toFixed(2),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          defaultSalary: numSalary.toFixed(2),
        },
      });
  }

  // 2. Update Daily Budget for a specific date if provided
  if (dailyBudget !== undefined && dailyDate) {
    const numDaily = Number(dailyBudget);
    await db
      .insert(dailyBudgets)
      .values({
        userId: targetUserId,
        date: dailyDate,
        amount: numDaily.toFixed(2),
      })
      .onConflictDoUpdate({
        target: [dailyBudgets.userId, dailyBudgets.date],
        set: {
          amount: numDaily.toFixed(2),
        },
      });
  }

  // 3. Update Weekly Envelopes if provided
  if (Array.isArray(envelopes)) {
    for (const env of envelopes) {
      if (env.weekIndex && env.startDate && env.endDate && env.budgetAmount !== undefined) {
        await db
          .insert(weeklyEnvelopes)
          .values({
            userId: targetUserId,
            ym: targetYm,
            weekIndex: Number(env.weekIndex),
            startDate: env.startDate,
            endDate: env.endDate,
            budgetAmount: Number(env.budgetAmount).toFixed(2),
          })
          .onConflictDoUpdate({
            target: [weeklyEnvelopes.userId, weeklyEnvelopes.ym, weeklyEnvelopes.weekIndex],
            set: {
              budgetAmount: Number(env.budgetAmount).toFixed(2),
            },
          });
      }
    }
  }

  return Response.json({ success: true, message: "บันทึกการตั้งค่างบประมาณสำเร็จ" });
}
