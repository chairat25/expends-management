export const CATEGORIES = [
  "food",
  "drink",
  "transport",
  "bill",
  "shopping",
  "fun",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  food: "อาหาร",
  drink: "เครื่องดื่ม",
  transport: "เดินทาง",
  bill: "บิล/ค่างวด",
  shopping: "ของใช้",
  fun: "บันเทิง",
  other: "อื่นๆ",
};

export const CATEGORY_ICON: Record<Category, string> = {
  food: "🍚",
  drink: "🥤",
  transport: "🚕",
  bill: "🧾",
  shopping: "🛍️",
  fun: "🎬",
  other: "📦",
};

export const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export const TH_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const TH_DAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

export const TZ = "Asia/Bangkok";

const bkkDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const bkkTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function todayKey(): string {
  return bkkDate.format(new Date());
}

export function thisMonthKey(): string {
  return todayKey().slice(0, 7);
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toMonthKey(d: Date): string {
  return toDateKey(d).slice(0, 7);
}

export function shiftDate(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return toDateKey(new Date(y, m - 1, d + delta));
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  return toMonthKey(new Date(y, m - 1 + delta, 1));
}

export function formatMonthTH(ym: string, short = false): string {
  const [y, m] = ym.split("-").map(Number);
  const names = short ? TH_MONTHS_SHORT : TH_MONTHS;
  return `${names[m - 1]} ${y + 543}`;
}

export function formatDayTH(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${TH_DAYS[dt.getDay()]} ${d} ${TH_MONTHS_SHORT[m - 1]}`;
}

export function formatTimeTH(iso: string): string {
  return `${bkkTime.format(new Date(iso))} น.`;
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function formatBaht(n: number): string {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const BUDGET_MODES = ["month", "week"] as const;
export type BudgetMode = (typeof BUDGET_MODES)[number];

export type MonthWeekInfo = {
  weekIndex: number;
  startDate: string;
  endDate: string;
  label: string;
  days: number;
};

export function getMonthWeeks(ym: string): MonthWeekInfo[] {
  const [y, m] = ym.split("-").map(Number);
  const totalDays = daysInMonth(ym);
  const weeks: MonthWeekInfo[] = [];

  let curDay = 1;
  let weekIndex = 1;

  while (curDay <= totalDays) {
    const startDate = `${ym}-${String(curDay).padStart(2, "0")}`;
    const dt = new Date(y, m - 1, curDay);
    const dow = dt.getDay(); // 0=Sun
    const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
    const endDayNum = Math.min(curDay + daysUntilSunday, totalDays);
    const endDate = `${ym}-${String(endDayNum).padStart(2, "0")}`;

    const numDays = endDayNum - curDay + 1;
    weeks.push({
      weekIndex,
      startDate,
      endDate,
      label: `สัปดาห์ที่ ${weekIndex} (${curDay} - ${endDayNum} ${TH_MONTHS_SHORT[m - 1]})`,
      days: numDays,
    });

    curDay = endDayNum + 1;
    weekIndex++;
  }

  return weeks;
}
