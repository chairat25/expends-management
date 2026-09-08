"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import clsx from "clsx";
import {
  BarChart3,
  Receipt,
  Wallet,
  FolderTree,
  Users,
  Bell,
  Plus,
  Trash2,
  Lock,
  LogOut,
  Sparkles,
  KeyRound,
  Mail,
  Send,
  Loader2,
  Calendar,
  Sun,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import type { AppCategory } from "@/db/schema";
import { AdminSkeletonLoading } from "@/components/Skeleton";
import {
  formatBaht,
  thisMonthKey,
  todayKey,
  CATEGORY_ICON,
  CATEGORY_LABEL,
  formatDayTH,
  formatTimeTH,
} from "@/lib/shared";

type AdminTab = "analytics" | "transactions" | "budgets" | "categories" | "users" | "push";

type UserItem = {
  id: string;
  email: string;
  createdAt: string;
};

type AnalyticsData = {
  ym: string;
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  transactionCount: number;
  categoryBreakdown: { category: string; count: number; total: number; percentage: number }[];
  dailyTrend: { date: string; expense: number; income: number }[];
};

type TransactionItem = {
  id: number;
  userId: string;
  date: string;
  spentAt: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
};

const PRESET_EMOJIS = [
  "🍚", "🧋", "🚕", "🧾", "🛍️", "🎬", "📦", "🚗", "🏠", "💊",
  "📌", "🛠️", "💳", "🐶", "💻", "✈️", "📱", "📑", "⚙️", "💰",
  "🎁", "🏥", "⭐️", "🍔", "☕️", "🎮", "⚽️", "🎓"
];

export default function AdminView() {
  const [tab, setTab] = useState<AdminTab>("analytics");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auth States
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [loginEmail, setLoginEmail] = useState("Pondkub1324@gmail.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Common Data
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedYm, setSelectedYm] = useState(thisMonthKey());

  // Analytics State
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Transactions State
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txFilterCategory, setTxFilterCategory] = useState<string>("");
  const [txFilterType, setTxFilterType] = useState<string>("");
  const [txSearch, setTxSearch] = useState<string>("");

  // Budgets State
  const [budgetMonthlySalary, setBudgetMonthlySalary] = useState<string>("15000");
  const [budgetDaily, setBudgetDaily] = useState<string>("500");
  const [budgetDailyDate, setBudgetDailyDate] = useState<string>(todayKey());
  const [envelopes, setEnvelopes] = useState<{ weekIndex: number; startDate: string; endDate: string; label: string; budgetAmount: number }[]>([]);
  const [savingBudget, setSavingBudget] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");
  const [newCatType, setNewCatType] = useState<"expense" | "income" | "both">("expense");

  // Push State
  const [pushTargetUserId, setPushTargetUserId] = useState<string>("");
  const [pushTitle, setPushTitle] = useState("🔔 แจ้งเตือนจาก Expense Dashboard");
  const [pushBody, setPushBody] = useState("สวัสดีครับ! ยอดงบประมาณของคุณได้รับการอัปเดตแล้ว");
  const [pushSending, setPushSending] = useState(false);
  const [pushResultMsg, setPushResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Load Users & Categories
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, catRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/categories"),
      ]);

      if (usersRes.status === 401 || catRes.status === 401) {
        setIsAuthRequired(true);
        setLoading(false);
        return;
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
        if (data.users?.length > 0 && !selectedUser) {
          setSelectedUser(data.users[0]);
          setPushTargetUserId(data.users[0].id);
        }
      }

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
    } catch (err: any) {
      setError("ไม่สามารถโหลดข้อมูลเริ่มต้นได้: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  // Load Analytics
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const query = new URLSearchParams({ ym: selectedYm });
      if (selectedUser) query.set("userId", selectedUser.id);
      const res = await fetch(`/api/admin/analytics?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Load analytics failed:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedYm, selectedUser]);

  useEffect(() => {
    if (tab === "analytics") void loadAnalytics();
  }, [tab, loadAnalytics]);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (selectedUser) query.set("userId", selectedUser.id);
      if (txFilterCategory) query.set("category", txFilterCategory);
      if (txFilterType) query.set("type", txFilterType);

      const res = await fetch(`/api/admin/transactions?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Load transactions failed:", err);
    }
  }, [selectedUser, txFilterCategory, txFilterType]);

  useEffect(() => {
    if (tab === "transactions") void loadTransactions();
  }, [tab, loadTransactions]);

  // Load Budgets for Selected User
  const loadBudgets = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/admin/budgets?userId=${selectedUser.id}&ym=${selectedYm}`);
      if (res.ok) {
        const data = await res.json();
        setBudgetMonthlySalary(String(data.salary || 0));

        const weeks = data.monthWeeks || [];
        const mappedEnvelopes = weeks.map((w: any) => {
          const match = data.envelopes?.find((e: any) => e.weekIndex === w.weekIndex);
          return {
            weekIndex: w.weekIndex,
            startDate: w.startDate,
            endDate: w.endDate,
            label: w.label,
            budgetAmount: match ? Number(match.budgetAmount) : 0,
          };
        });
        setEnvelopes(mappedEnvelopes);

        const todayBudget = data.dailyBudgets?.find((b: any) => b.date === budgetDailyDate);
        if (todayBudget) setBudgetDaily(String(todayBudget.amount));
      }
    } catch (err) {
      console.error("Load budgets failed:", err);
    }
  }, [selectedUser, selectedYm, budgetDailyDate]);

  useEffect(() => {
    if (tab === "budgets") void loadBudgets();
  }, [tab, loadBudgets]);

  // Save Budget
  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingBudget(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          ym: selectedYm,
          monthlySalary: parseFloat(budgetMonthlySalary) || 0,
          dailyBudget: parseFloat(budgetDaily) || 0,
          dailyDate: budgetDailyDate,
          envelopes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกงบประมาณไม่สำเร็จ");

      setSuccessMsg("บันทึกการตั้งค่างบประมาณสำเร็จ! ข้อมูลถูกส่งไปแสดงที่หน้าบ้านแล้ว ✨");
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingBudget(false);
    }
  }

  // Delete Transaction
  async function handleDeleteTx(id: number) {
    if (!confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`/api/admin/transactions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      alert("ลบรายการไม่สำเร็จ");
    }
  }

  // Add Category
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          icon: newCatIcon,
          type: newCatType,
          sortOrder: categories.length + 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCategories((prev) => [...prev, data.category]);
        setNewCatName("");
        setSuccessMsg("เพิ่มหมวดหมู่สำเร็จ!");
      }
    } catch (err) {
      setError("เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
  }

  // Handle Login
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthRequired(false);
        void loadInitialData();
      } else {
        setLoginError(data.error || "รหัสผ่านไม่ถูกต้อง");
      }
    } catch (err: any) {
      setLoginError(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoginLoading(false);
    }
  }

  // Handle Logout
  async function handleAdminLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAuthRequired(true);
  }

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        return (
          t.note?.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
      }
      return true;
    });
  }, [transactions, txSearch]);

  if (isAuthRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
        <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-3">
              <Lock size={22} />
            </div>
            <h1 className="text-lg font-bold text-white">Expense Dashboard</h1>
            <p className="mt-1 text-xs text-slate-400">เข้าสู่ระบบจัดการหลังบ้านและวิเคราะห์การเงิน</p>
          </div>

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            {loginError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">อีเมลแอดมิน</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">รหัสผ่าน</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 disabled:opacity-50 active:scale-[0.98]"
            >
              {loginLoading ? <Loader2 size={16} className="animate-spin" /> : "เข้าสู่ระบบ Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return <AdminSkeletonLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30">
      {/* 1. Dashboard Top Header (Mobile Optimized) */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-6 sm:py-3.5 space-y-2">
          {/* Top Line: Brand + User Select + Logout */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                <BarChart3 size={17} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                  Expense Dashboard
                </h1>
                <span className="hidden sm:inline text-[11px] text-slate-400">
                  ระบบวิเคราะห์และจัดการหลังบ้าน
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {users.length > 0 && (
                <div className="hidden sm:block">
                  <select
                    value={selectedUser?.id || ""}
                    onChange={(e) => {
                      const u = users.find((item) => item.id === e.target.value) || null;
                      setSelectedUser(u);
                      if (u) setPushTargetUserId(u.id);
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 outline-none focus:border-emerald-500 max-w-[200px] truncate"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleAdminLogout}
                className="flex h-8 sm:h-9 items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 text-xs font-medium text-rose-400 hover:bg-slate-800 active:scale-95 transition-all"
                title="ออกจากระบบ"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">ออก</span>
              </button>
            </div>
          </div>

          {/* Mobile User Dropdown row */}
          {users.length > 0 && (
            <div className="sm:hidden">
              <select
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const u = users.find((item) => item.id === e.target.value) || null;
                  setSelectedUser(u);
                  if (u) setPushTargetUserId(u.id);
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 py-1.5 px-3 text-xs font-medium text-slate-200 outline-none focus:border-emerald-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    👤 {u.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2. Navigation Tabs (Horizontal Touch Scroll with no scrollbars) */}
        <div className="border-t border-slate-800/60 bg-slate-950/90">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-1.5 sm:px-6 scrollbar-none">
            {[
              { id: "analytics" as AdminTab, label: "วิเคราะห์", icon: BarChart3 },
              { id: "transactions" as AdminTab, label: "ธุรกรรม", icon: Receipt },
              { id: "budgets" as AdminTab, label: "ตั้งงบ & เงินเดือน", icon: Wallet },
              { id: "categories" as AdminTab, label: "หมวดหมู่", icon: FolderTree },
              { id: "users" as AdminTab, label: "ผู้ใช้", icon: Users },
              { id: "push" as AdminTab, label: "Push", icon: Bell },
            ].map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95",
                    active
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  )}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6">
        {/* Toast Messages */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* TAB 1: Analytics Overview */}
        {tab === "analytics" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Header / Month Filter */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">📊 ภาพรวมและสถิติการเงิน</h2>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[280px] sm:max-w-none">
                  {selectedUser ? `ผู้ใช้: ${selectedUser.email}` : "ข้อมูลรวม"}
                </p>
              </div>

              <input
                type="month"
                value={selectedYm}
                onChange={(e) => setSelectedYm(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            {/* KPI Cards */}
            {analyticsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-5 shadow-lg">
                    <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-400 block">
                      รายจ่ายรวมเดือนนี้
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-1 text-lg sm:text-2xl font-black text-rose-400 truncate">
                      <span>฿</span>
                      <span>{formatBaht(analytics.totalExpense)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-5 shadow-lg">
                    <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-400 block">
                      รายรับรวมเดือนนี้
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-1 text-lg sm:text-2xl font-black text-emerald-400 truncate">
                      <span>฿</span>
                      <span>{formatBaht(analytics.totalIncome)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-5 shadow-lg">
                    <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-400 block">
                      เงินเก็บสุทธิ
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-1 text-lg sm:text-2xl font-black text-indigo-400 truncate">
                      <span>฿</span>
                      <span>{formatBaht(analytics.netSavings)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-5 shadow-lg">
                    <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-slate-400 block">
                      จำนวนรายการ
                    </span>
                    <div className="mt-1.5 text-lg sm:text-2xl font-black text-white truncate">
                      {analytics.transactionCount} รายการ
                    </div>
                  </div>
                </div>

                {/* Category Breakdown & Daily Trends */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:gap-6">
                  {/* Category Breakdown */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg space-y-3.5">
                    <h3 className="text-xs sm:text-sm font-bold text-white">สัดส่วนค่าใช้จ่ายแยกตามหมวดหมู่</h3>
                    {analytics.categoryBreakdown.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">ยังไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้</p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.categoryBreakdown.map((cat) => (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-300 truncate max-w-[180px] sm:max-w-none">
                                {(CATEGORY_ICON as Record<string, string>)[cat.category] || "📦"}{" "}
                                {(CATEGORY_LABEL as Record<string, string>)[cat.category] || cat.category} ({cat.count} รายการ)
                              </span>
                              <span className="text-slate-200 font-bold shrink-0">
                                ฿{formatBaht(cat.total)} ({cat.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Daily Trends */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg space-y-3.5">
                    <h3 className="text-xs sm:text-sm font-bold text-white">แนวโน้มการใช้จ่ายรายวัน</h3>
                    {analytics.dailyTrend.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">ยังไม่มีข้อมูลรายการในเดือนนี้</p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                        {analytics.dailyTrend.map((day) => (
                          <div
                            key={day.date}
                            className="flex items-center justify-between rounded-xl bg-slate-950 p-2.5 border border-slate-800/80 text-xs"
                          >
                            <span className="font-semibold text-slate-300">{formatDayTH(day.date)}</span>
                            <div className="flex items-center gap-2 sm:gap-3">
                              {day.income > 0 && (
                                <span className="text-emerald-400 font-medium">+฿{formatBaht(day.income)}</span>
                              )}
                              <span className="text-rose-400 font-bold">-฿{formatBaht(day.expense)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: All Transactions Ledger */}
        {tab === "transactions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">📑 บัญชีธุรกรรม</h2>
                <p className="text-[11px] sm:text-xs text-slate-400">ค้นหา ตรวจสอบ และจัดการประวัติรายการ</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="ค้นหา..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={txFilterType}
                  onChange={(e) => setTxFilterType(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500 shrink-0"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="expense">รายจ่าย</option>
                  <option value="income">รายรับ</option>
                </select>
              </div>
            </div>

            {/* Mobile Card View (Shown on mobile screens) */}
            <div className="space-y-2 sm:hidden">
              {filteredTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                  ไม่พบรายการธุรกรรม
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">
                        {(CATEGORY_ICON as Record<string, string>)[tx.category] || "📦"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {tx.note || (CATEGORY_LABEL as Record<string, string>)[tx.category] || tx.category}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDayTH(tx.date)} • {formatTimeTH(tx.spentAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={clsx(
                          "text-xs font-bold",
                          tx.type === "expense" ? "text-rose-400" : "text-emerald-400"
                        )}
                      >
                        {tx.type === "expense" ? "-" : "+"}฿{formatBaht(tx.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 active:scale-95"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table (Shown on screens >= sm) */}
            <div className="hidden sm:block rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="p-3.5">วันที่ & เวลา</th>
                      <th className="p-3.5">หมวดหมู่</th>
                      <th className="p-3.5">หมายเหตุ</th>
                      <th className="p-3.5">ประเภท</th>
                      <th className="p-3.5 text-right">จำนวนเงิน</th>
                      <th className="p-3.5 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-medium text-slate-200">
                          {formatDayTH(tx.date)} <span className="text-slate-500 font-normal">({formatTimeTH(tx.spentAt)})</span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-2 py-1 border border-slate-800">
                            <span>{(CATEGORY_ICON as Record<string, string>)[tx.category] || "📦"}</span>
                            <span>{(CATEGORY_LABEL as Record<string, string>)[tx.category] || tx.category}</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">{tx.note || "-"}</td>
                        <td className="p-3.5">
                          <span
                            className={clsx(
                              "inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                              tx.type === "expense"
                                ? "bg-rose-950/60 text-rose-400 border border-rose-500/20"
                                : "bg-emerald-950/60 text-emerald-400 border border-emerald-500/20"
                            )}
                          >
                            {tx.type === "expense" ? "รายจ่าย" : "รายรับ"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-100">
                          <span className={tx.type === "expense" ? "text-rose-400" : "text-emerald-400"}>
                            {tx.type === "expense" ? "-" : "+"}฿{formatBaht(tx.amount)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-rose-950/50 hover:text-rose-400"
                            title="ลบรายการ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Budget & Salary Planner */}
        {tab === "budgets" && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">💼 กำหนดงบประมาณ & เงินเดือน</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                ตัวเลขที่กำหนดที่นี่จะถูกส่งไปแสดงผลที่หน้าบ้าน (Expense Tracking App) ทันที
              </p>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 sm:space-y-6">
              {/* Top Monthly Salary & Daily Budget */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Wallet size={16} />
                    <label className="text-xs font-bold uppercase tracking-wider">เงินเดือน / งบประจำเดือน</label>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={budgetMonthlySalary}
                    onChange={(e) => setBudgetMonthlySalary(e.target.value)}
                    placeholder="15000"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-base sm:text-lg font-bold text-white outline-none focus:border-emerald-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500 block">บันทึกลง salaries & defaultSalary</span>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Sun size={16} />
                    <label className="text-xs font-bold uppercase tracking-wider">งบประมาณรายวัน (Daily Budget)</label>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      step="any"
                      value={budgetDaily}
                      onChange={(e) => setBudgetDaily(e.target.value)}
                      placeholder="500"
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-base sm:text-lg font-bold text-white outline-none focus:border-emerald-500"
                      required
                    />
                    <input
                      type="date"
                      value={budgetDailyDate}
                      onChange={(e) => setBudgetDailyDate(e.target.value)}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">บันทึกลง daily_budgets สำหรับวันที่เลือก</span>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">เดือนที่จัดสรร</label>
                    <input
                      type="month"
                      value={selectedYm}
                      onChange={(e) => setSelectedYm(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-xs sm:text-sm font-semibold text-white outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    เลือกเดือนเพื่อจัดสรรซองงบสัปดาห์ 5 สัปดาห์
                  </p>
                </div>
              </div>

              {/* Weekly Envelopes */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Calendar size={16} />
                  <h3 className="text-xs sm:text-sm font-bold">ซองงบประมาณรายสัปดาห์ (Weekly Envelopes)</h3>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5 sm:gap-3">
                  {envelopes.map((env, idx) => (
                    <div key={env.weekIndex} className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5">
                      <span className="text-xs font-semibold text-slate-300 block">{env.label}</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">฿</span>
                        <input
                          type="number"
                          step="any"
                          value={env.budgetAmount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setEnvelopes((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, budgetAmount: val } : item))
                            );
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pl-7 pr-2 text-xs sm:text-sm font-bold text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {env.startDate} ถึง {env.endDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 disabled:opacity-50 active:scale-[0.98]"
                >
                  {savingBudget ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>บันทึกการตั้งค่างบประมาณ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: Category Management */}
        {tab === "categories" && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">🏷️ จัดการหมวดหมู่</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">กำหนดหมวดหมู่และไอคอนที่ให้ผู้ใช้เลือก</p>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-lg space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-white">เพิ่มหมวดหมู่ใหม่</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ชื่อหมวดหมู่</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="เช่น กาแฟ, ท่องเที่ยว"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ไอคอน Emoji</label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="w-12 sm:w-16 rounded-xl border border-slate-800 bg-slate-950 py-2 text-center text-base text-white outline-none shrink-0"
                    />
                    <div className="flex gap-1 overflow-x-auto max-w-[200px] scrollbar-none">
                      {PRESET_EMOJIS.slice(0, 5).map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setNewCatIcon(em)}
                          className="rounded-lg bg-slate-950 p-1 text-sm hover:bg-slate-800"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ประเภท</label>
                  <select
                    value={newCatType}
                    onChange={(e: any) => setNewCatType(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white outline-none"
                  >
                    <option value="expense">รายจ่าย (Expense)</option>
                    <option value="income">รายรับ (Income)</option>
                    <option value="both">ทั้งสองประเภท</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-[0.98]"
                  >
                    <Plus size={16} />
                    <span>เพิ่มหมวดหมู่</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 sm:gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 sm:p-3 shadow-md min-w-0"
                >
                  <span className="text-xl shrink-0">{cat.icon}</span>
                  <span className="text-xs font-semibold text-slate-200 truncate">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Users List */}
        {tab === "users" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">👥 ผู้ใช้งานในระบบ ({users.length})</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">รายชื่อผู้ใช้ที่ลงทะเบียนใน Supabase</p>
            </div>

            {/* Mobile Users Cards */}
            <div className="space-y-2 sm:hidden">
              {users.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-white">👤 {u.email}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate max-w-[220px]">{u.id}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-400">
                      {u.createdAt ? formatDayTH(u.createdAt.slice(0, 10)) : "-"}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setTab("budgets");
                      }}
                      className="rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-900/50"
                    >
                      ตั้งค่างบประมาณ
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-3.5">ผู้ใช้ / อีเมล</th>
                    <th className="p-3.5">User ID</th>
                    <th className="p-3.5">วันที่สมัคร</th>
                    <th className="p-3.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-semibold text-white">👤 {u.email}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">{u.id}</td>
                      <td className="p-3.5 text-slate-400">{u.createdAt ? formatDayTH(u.createdAt.slice(0, 10)) : "-"}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setTab("budgets");
                          }}
                          className="rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-900/50"
                        >
                          ตั้งค่างบประมาณ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: Push Notification Testing */}
        {tab === "push" && (
          <div className="max-w-xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Bell size={18} />
              <h2 className="text-sm sm:text-base font-bold text-white">แผงทดสอบยิง Push Notification</h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">
              ทดสอบส่งสัญญาณ Web Push แจ้งเตือนไปยังหน้าจอล็อกสกรีนของมือถือผู้ใช้
            </p>

            {pushResultMsg && (
              <div
                className={clsx(
                  "rounded-xl p-3 text-xs",
                  pushResultMsg.success
                    ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-950/40 text-rose-300 border border-rose-500/30"
                )}
              >
                {pushResultMsg.text}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">เป้าหมายผู้ใช้</label>
                <select
                  value={pushTargetUserId}
                  onChange={(e) => setPushTargetUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">หัวข้อแจ้งเตือน</label>
                <input
                  type="text"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">ข้อความแจ้งเตือน</label>
                <textarea
                  rows={3}
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <button
                onClick={async () => {
                  if (!pushTargetUserId) return;
                  setPushSending(true);
                  setPushResultMsg(null);
                  try {
                    const res = await fetch("/api/admin/push/send", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: pushTargetUserId,
                        title: pushTitle.trim(),
                        body: pushBody.trim(),
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setPushResultMsg({
                        success: true,
                        text: `ยิงสัญญาณสำเร็จ! (${data.pushResult?.sentCount || 0} อุปกรณ์ได้รับสัญญาณ)`,
                      });
                    } else {
                      setPushResultMsg({ success: false, text: data.error || "ยิงสัญญาณไม่สำเร็จ" });
                    }
                  } catch (err: any) {
                    setPushResultMsg({ success: false, text: err.message || "เกิดข้อผิดพลาด" });
                  } finally {
                    setPushSending(false);
                  }
                }}
                disabled={pushSending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 disabled:opacity-50 active:scale-[0.98]"
              >
                {pushSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>ยิงสัญญาณ Push เข้ามือถือ</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
