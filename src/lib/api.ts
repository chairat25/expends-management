import { z } from "zod";
import { cookies } from "next/headers";
import { getUser } from "./supabase/server";
import { BUDGET_MODES, CATEGORIES } from "./shared";

export const txInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็น YYYY-MM-DD"),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0").max(99_999_999),
  category: z.string().min(1).default("other"),
  note: z.string().max(300).default(""),
});

export const txPatch = txInput.partial();

export const categoryInput = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่").max(100),
  slug: z.string().min(1).optional(),
  icon: z.string().default("📦"),
  parentId: z.number().nullable().optional(),
  type: z.enum(["expense", "income", "both"]).default("expense"),
  sortOrder: z.number().default(0),
});

export const categoryPatch = categoryInput.partial().extend({
  isActive: z.boolean().optional(),
});

export const menuPatch = z.object({
  label: z.string().min(1).optional(),
  icon: z.string().optional(),
  parentId: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const monthPatch = z.object({
  openingBalance: z.coerce.number().min(0).max(99_999_999).optional(),
  note: z.string().max(300).optional(),
  closed: z.boolean().optional(),
});

export const carryOverPatch = z.object({
  savingsAmount: z.coerce.number().min(0).max(99_999_999),
});

export const settingsPatch = z.object({
  budgetMode: z.enum(BUDGET_MODES).optional(),
  defaultSalary: z.coerce.number().min(0).max(99_999_999).optional(),
});

export const salaryInput = z.object({
  ym: z.string().regex(/^\d{4}-\d{2}$/, "เดือนต้องเป็น YYYY-MM"),
  amount: z.coerce.number().positive("จำนวนเงินต้องมากกว่า 0").max(99_999_999),
  receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็น YYYY-MM-DD"),
  applyMode: z.enum(["opening_balance", "income_tx"]).default("opening_balance"),
  note: z.string().max(300).default(""),
});

export const dailyBudgetPatch = z.object({
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็น YYYY-MM-DD"))
    .min(1)
    .max(7),
  amount: z.coerce.number().min(0).max(99_999_999),
});

export const ymSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "เดือนต้องเป็น YYYY-MM");

export function badRequest(message: unknown) {
  return Response.json({ error: message }, { status: 400 });
}

export function unauthorized() {
  return Response.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลระบบ" }, { status: 401 });
}

export async function requireUserId(): Promise<string | null> {
  const user = await getUser();
  if (user?.id) return user.id;

  try {
    const store = await cookies();
    const adminSession = store.get("admin_session")?.value;
    if (adminSession === "authenticated_admin") {
      return "95ec1a71-84ba-4d92-938a-36ee54556a31"; // Default Admin ID
    }
  } catch {
    // Ignore error if not in request context
  }

  // พัฒนา/ทดสอบบนเครื่อง local: ใช้ ID ค่าเริ่มต้น
  if (process.env.NODE_ENV === "development") {
    return "00000000-0000-0000-0000-000000000000";
  }
  return null;
}
