"use client";

import { useEffect, useState, useMemo } from "react";
import clsx from "clsx";
import {
  Settings,
  FolderTree,
  ListFilter,
  Plus,
  Power,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  ShieldAlert,
  Lock,
  LogOut,
  Sparkles,
  KeyRound,
  Mail,
} from "lucide-react";
import type { AppCategory, AppMenu, UserMenuPreference } from "@/db/schema";
import { createClient } from "@/lib/supabase/client";
import { AdminSkeletonLoading } from "@/components/Skeleton";

type AdminTab = "categories" | "menus" | "users";

type UserItem = {
  id: string;
  email: string;
  createdAt: string;
};

const PRESET_EMOJIS = [
  "🍚", "🥤", "🚕", "🧾", "🛍️", "🎬", "📦", "🚗", "🏠", "💊",
  "📌", "🛠️", "💳", "🐶", "💻", "✈️", "📱", "📑", "⚙️", "💰",
  "🎁", "🏥", "⭐️", "🍔", "☕️", "🎮", "⚽️", "🎓"
];

export default function AdminView() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auth States
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [loginEmail, setLoginEmail] = useState("Pondkub1324@gmail.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [menus, setMenus] = useState<AppMenu[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [targetUserPrefs, setTargetUserPrefs] = useState<Record<string, boolean>>({});

  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");
  const [newCatParentId, setNewCatParentId] = useState<string>("root");
  const [newCatType, setNewCatType] = useState<"expense" | "income" | "both">("expense");

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [resCat, resMenu, resUsers] = await Promise.all([
        fetch("/api/admin/categories", { cache: "no-store" }),
        fetch("/api/admin/menus", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);

      if (resCat.status === 401 || resMenu.status === 401 || resUsers.status === 401) {
        setIsAuthRequired(true);
        setLoading(false);
        return;
      }

      setIsAuthRequired(false);

      if (resCat.ok) {
        const d = await resCat.json();
        setCategories(d.categories ?? []);
      }
      if (resMenu.ok) {
        const d = await resMenu.json();
        setMenus(d.menus ?? []);
      }
      if (resUsers.ok) {
        const d = await resUsers.json();
        const uList: UserItem[] = d.users ?? [];
        setUsers(uList);
        if (uList.length > 0 && !selectedUser) {
          setSelectedUser(uList[0]);
          void loadUserPrefs(uList[0].id);
        }
      }
    } catch (e) {
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูลหลังบ้าน");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      }

      setIsAuthRequired(false);
      setSuccessMsg("เข้าสู่ระบบผู้ดูแลระบบสำเร็จ!");
      void loadData();
    } catch (err: any) {
      setLoginError(err.message || "อีเมลหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setIsAuthRequired(true);
  }

  async function loadUserPrefs(userId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/menus`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        const prefMap: Record<string, boolean> = {};
        (d.preferences ?? []).forEach((p: UserMenuPreference) => {
          prefMap[p.menuKey] = p.isVisible;
        });
        setTargetUserPrefs(prefMap);
      }
    } catch (e) {
      setError("โหลดสิทธิ์เมนูของผู้ใช้ไม่สำเร็จ");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handleSelectUser(u: UserItem) {
    setSelectedUser(u);
    void loadUserPrefs(u.id);
  }

  const mainCategories = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories],
  );

  const mainMenus = useMemo(
    () => menus.filter((m) => m.parentId === null),
    [menus],
  );

  async function toggleCategoryActive(id: number, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c)),
        );
      }
    } catch (e) {
      setError("อัปเดตสถานะไม่สำเร็จ");
    }
  }

  async function updateCategoryParent(id: number, parentId: number | null) {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, parentId } : c)),
        );
        setSuccessMsg("ย้ายหมวดหมู่เรียบร้อยแล้ว");
      }
    } catch (e) {
      setError("ย้ายหมวดหมู่ไม่สำเร็จ");
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName,
          icon: newCatIcon || "📦",
          parentId: newCatParentId === "root" ? null : Number(newCatParentId),
          type: newCatType,
        }),
      });

      if (res.ok) {
        setNewCatName("");
        setNewCatIcon("📦");
        setNewCatParentId("root");
        setSuccessMsg("เพิ่มหมวดหมู่ใหม่เรียบร้อยแล้ว");
        void loadData();
      }
    } catch (e) {
      setError("เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
  }

  async function broadcastMenuUpdate() {
    // ส่งสัญญาณ Realtime เฉพาะตอนที่แอดมินกำลังอยู่ในหน้าจัดการสิทธิ์ผู้ใช้เท่านั้น
    if (tab !== "users") return;
    try {
      const supabase = createClient();
      await supabase.channel("menu-realtime-sync").send({
        type: "broadcast",
        event: "menu_updated",
        payload: { timestamp: Date.now() },
      });
    } catch {
      // ignore
    }
  }

  async function toggleMenuActive(id: number, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/menus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setMenus((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isActive: !currentActive } : m)),
        );
        void broadcastMenuUpdate();
      }
    } catch (e) {
      setError("อัปเดตสถานะเมนูไม่สำเร็จ");
    }
  }

  async function updateMenuParent(id: number, parentId: number | null) {
    try {
      const res = await fetch(`/api/admin/menus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId }),
      });
      if (res.ok) {
        setMenus((prev) =>
          prev.map((m) => (m.id === id ? { ...m, parentId } : m)),
        );
        setSuccessMsg("ย้ายเมนูเรียบร้อยแล้ว");
        void broadcastMenuUpdate();
      }
    } catch (e) {
      setError("ย้ายเมนูไม่สำเร็จ");
    }
  }

  async function toggleUserTargetMenuPreference(menuKey: string, currentVisible: boolean) {
    if (!selectedUser) return;
    const nextVisible = !currentVisible;
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/menus`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuKey, isVisible: nextVisible }),
      });

      if (res.ok) {
        setTargetUserPrefs((prev) => ({ ...prev, [menuKey]: nextVisible }));
        setSuccessMsg(
          nextVisible
            ? `เปิดการมองเห็นเมนู [${menuKey}] ให้ผู้ใช้แล้ว`
            : `ปิดสิทธิ์ซ่อนเมนู [${menuKey}] สำหรับผู้ใช้แล้ว`,
        );
        void broadcastMenuUpdate();
      }
    } catch (e) {
      setError("อัปเดตสิทธิ์เมนูผู้ใช้ไม่สำเร็จ");
    }
  }

  async function applyPreferenceToAllUsers(menuKey: string, isVisible: boolean) {
    try {
      await Promise.all(
        users.map((u) =>
          fetch(`/api/admin/users/${u.id}/menus`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ menuKey, isVisible }),
          }),
        ),
      );
      setTargetUserPrefs((prev) => ({ ...prev, [menuKey]: isVisible }));
      setSuccessMsg(
        isVisible
          ? `เปิดการมองเห็นเมนู [${menuKey}] ให้ผู้ใช้ทุกคนแล้ว`
          : `ปิดสิทธิ์ซ่อนเมนู [${menuKey}] สำหรับผู้ใช้ทุกคน (${users.length} คน) เรียบร้อยแล้ว`,
      );
      void broadcastMenuUpdate();
    } catch (e) {
      setError("อัปเดตสิทธิ์ผู้ใช้ทุกคนไม่สำเร็จ");
    }
  }

  if (isAuthRequired) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 pop-in pt-6">
        <div className="card space-y-4 p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-900/30 via-surface to-surface">
          <div className="text-center space-y-2">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Lock size={28} />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              เข้าสู่ระบบผู้ดูแลระบบ (Admin Portal)
            </h2>
            <p className="text-xs text-muted max-w-xs mx-auto">
              ระบบหลังบ้านสำหรับจัดการผู้ใช้งาน สิทธิ์เมนู และหมวดหมู่การเงิน
            </p>
          </div>

          {loginError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400 font-medium text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                <Mail size={13} className="text-indigo-400" /> อีเมลผู้ดูแลระบบ (Admin Email)
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Pondkub1324@gmail.com"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                <KeyRound size={13} className="text-indigo-400" /> รหัสผ่าน (Admin Password)
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={16} />
              {loginLoading ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบผู้ดูแลระบบ"}
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
    <div className="space-y-3 pop-in">
      <div className="card p-4 bg-accent/10 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="text-accent" size={20} />
          <div>
            <h2 className="font-bold text-base">Expense Tracking Management Dashboard</h2>
            <p className="text-[11px] text-muted">
              แดชบอร์ดหลังบ้าน สำหรับจัดการผู้ใช้ สิทธิ์การเห็นเมนู และหมวดหมู่ระบบ
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/25 active:scale-95 transition"
        >
          <LogOut size={14} />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {error && (
        <div
          onClick={() => setError(null)}
          className="cursor-pointer rounded-xl bg-expense-soft p-3 text-center text-xs text-expense"
        >
          {error} (แตะเพื่อปิด)
        </div>
      )}
      {successMsg && (
        <div
          onClick={() => setSuccessMsg(null)}
          className="cursor-pointer rounded-xl bg-income-soft p-3 text-center text-xs text-income font-medium"
        >
          {successMsg} (แตะเพื่อปิด)
        </div>
      )}

      <div className="flex rounded-xl bg-surface-2 p-1 text-xs">
        <button
          onClick={() => setTab("users")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 py-2 font-medium rounded-lg transition",
            tab === "users"
              ? "bg-surface text-accent font-semibold shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          <Users size={14} /> จัดการสิทธิ์ผู้ใช้ ({users.length})
        </button>
        <button
          onClick={() => setTab("categories")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 py-2 font-medium rounded-lg transition",
            tab === "categories"
              ? "bg-surface text-accent font-semibold shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          <FolderTree size={14} /> จัดการหมวดหมู่ ({categories.length})
        </button>
        <button
          onClick={() => setTab("menus")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 py-2 font-medium rounded-lg transition",
            tab === "menus"
              ? "bg-surface text-accent font-semibold shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          <ListFilter size={14} /> โครงสร้างเมนู ({menus.length})
        </button>
      </div>

      {tab === "users" ? (
        <div className="space-y-3">
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Users size={16} className="text-accent" />
              <h3 className="font-semibold text-xs text-foreground">
                เลือกผู้ใช้งานเพื่อจัดการสิทธิ์การมองเห็น (User Access Management)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={clsx(
                      "flex items-center justify-between rounded-xl border p-3 text-left transition",
                      isSelected
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border bg-surface-2/60 hover:bg-surface-2",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                        👤
                      </div>
                      <div>
                        <div className="font-bold text-xs text-foreground">{u.email}</div>
                        <div className="text-[10px] text-muted font-mono">
                          ID: {u.id.slice(0, 12)}...
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full font-medium">
                        เลือกอยู่
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedUser && (
            <div className="card p-4 space-y-3 bg-surface border-accent/40">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-accent" />
                  <h3 className="font-bold text-xs text-foreground">
                    สิทธิ์การมองเห็นเมนูของ: <span className="text-accent">{selectedUser.email}</span>
                  </h3>
                </div>
                <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-medium">
                  User ID: {selectedUser.id.slice(0, 8)}
                </span>
              </div>

              <p className="text-[11px] text-muted">
                แอดมินสามารถเปิดหรือปิดสิทธิ์เมนูเฉพาะของผู้ใช้คนนี้ได้ เมื่อปิดสิทธิ์ ผู้ใช้จะเห็นหน้าการแจ้งเตือน Soft-Tone เป็นกันเองเมื่อพยายามเข้าถึง
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {menus.map((m) => {
                  const isVisibleForUser = targetUserPrefs[m.key] !== false;
                  return (
                    <div
                      key={m.key}
                      className="flex flex-col gap-2 rounded-xl border border-border/80 bg-surface-2 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{m.label}</span>
                          <span className="text-[10px] text-muted">({m.key})</span>
                        </div>

                        <button
                          onClick={() =>
                            void toggleUserTargetMenuPreference(m.key, isVisibleForUser)
                          }
                          className={clsx(
                            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition active:scale-95",
                            isVisibleForUser
                              ? "bg-income/20 text-income hover:bg-income/30"
                              : "bg-expense/20 text-expense hover:bg-expense/30",
                          )}
                        >
                          {isVisibleForUser ? <Eye size={13} /> : <EyeOff size={13} />}
                          {isVisibleForUser ? "อนุญาตให้เห็น" : "ปิดสิทธิ์ (ซ่อนแล้ว)"}
                        </button>
                      </div>

                      <div className="flex justify-end pt-1 border-t border-border/40">
                        <button
                          onClick={() => void applyPreferenceToAllUsers(m.key, !isVisibleForUser)}
                          className="text-[10px] text-muted hover:text-accent underline transition"
                        >
                          {isVisibleForUser ? "ปิดสิทธิ์เมนูนี้ให้ผู้ใช้ทุกคน" : "เปิดสิทธิ์เมนูนี้ให้ผู้ใช้ทุกคน"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : tab === "categories" ? (
        <div className="space-y-3">
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Plus size={16} className="text-accent" />
              <h3 className="font-semibold text-xs text-foreground">เพิ่มหมวดหมู่ใหม่</h3>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3 text-xs">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="block text-[11px] font-medium text-muted mb-1">ไอคอน</label>
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-full text-center rounded-xl border border-border bg-surface-2 py-2 text-base outline-none font-sans"
                    placeholder="🍚"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] font-medium text-muted mb-1">ชื่อหมวดหมู่</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="เช่น ค่าเน็ต, ค่าฟิตเนส"
                    className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1.5">
                  เลือก Emoji ไอคอนประจำหมวดหมู่ (หรือพิมพ์เองในช่องด้านบน)
                </label>
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-1 p-2 rounded-xl border border-border/70 bg-surface-2/50 max-h-32 overflow-y-auto">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCatIcon(emoji)}
                      className={`flex h-8 items-center justify-center rounded-lg border text-sm transition ${
                        newCatIcon === emoji
                          ? "border-accent bg-accent/20 ring-1 ring-accent"
                          : "border-border/40 hover:bg-surface"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">หัวข้อหลัก/กลุ่ม</label>
                  <select
                    value={newCatParentId}
                    onChange={(e) => setNewCatParentId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-2.5 py-2 text-xs outline-none"
                  >
                    <option value="root">-- เป็นหมวดหมู่หลัก --</option>
                    {mainCategories.map((mc) => (
                      <option key={mc.id} value={mc.id}>
                        {mc.icon} {mc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">ประเภท</label>
                  <select
                    value={newCatType}
                    onChange={(e) =>
                      setNewCatType(e.target.value as "expense" | "income" | "both")
                    }
                    className="w-full rounded-xl border border-border bg-surface-2 px-2.5 py-2 text-xs outline-none"
                  >
                    <option value="expense">รายจ่าย (Expense)</option>
                    <option value="income">รายรับ (Income)</option>
                    <option value="both">ทั้งสองอย่าง (Both)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 font-semibold text-white transition hover:brightness-110 active:scale-95"
              >
                <Plus size={15} /> บันทึกหมวดหมู่ใหม่
              </button>
            </form>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-xs text-muted border-b border-border pb-2">
              รายการหมวดหมู่และหมวดหมู่ย่อย (ย้ายกลุ่ม / เปิด-ปิด)
            </h3>

            <div className="space-y-2">
              {mainCategories.map((mainCat) => {
                const subs = categories.filter((c) => c.parentId === mainCat.id);
                return (
                  <div key={mainCat.id} className="rounded-xl border border-border bg-surface-2/60 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{mainCat.icon}</span>
                        <span className="font-bold text-sm text-foreground">{mainCat.name}</span>
                        <span className="text-[10px] rounded-full bg-accent/10 px-2 py-0.5 text-accent font-medium">
                          หลัก
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCategoryActive(mainCat.id, mainCat.isActive)}
                          className={clsx(
                            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                            mainCat.isActive
                              ? "bg-income/20 text-income"
                              : "bg-expense/20 text-expense",
                          )}
                        >
                          <Power size={11} /> {mainCat.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </button>
                      </div>
                    </div>

                    {subs.length > 0 && (
                      <div className="mt-2 pl-4 space-y-1.5 border-l-2 border-accent/20">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between rounded-lg bg-surface p-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span>{sub.icon}</span>
                              <span className="font-medium">{sub.name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-[11px] text-muted">
                                <ArrowRightLeft size={11} />
                                <select
                                  value={sub.parentId ?? "root"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    void updateCategoryParent(
                                      sub.id,
                                      val === "root" ? null : Number(val),
                                    );
                                  }}
                                  className="rounded-lg border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] outline-none"
                                >
                                  {mainCategories.map((mc) => (
                                    <option key={mc.id} value={mc.id}>
                                      ย้ายไป {mc.name}
                                    </option>
                                  ))}
                                  <option value="root">ตั้งเป็นหมวดหลัก</option>
                                </select>
                              </div>

                              <button
                                onClick={() => toggleCategoryActive(sub.id, sub.isActive)}
                                className={clsx(
                                  "rounded-full px-2 py-0.5 text-[10px] font-medium transition",
                                  sub.isActive
                                    ? "bg-income/10 text-income"
                                    : "bg-expense/10 text-expense",
                                )}
                              >
                                {sub.isActive ? "เปิด" : "ปิด"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="border-b border-border pb-2">
            <h3 className="font-semibold text-xs text-muted">
              จัดการโครงสร้างเมนูระบบ (ระดับระบบ / Global Active Status)
            </h3>
          </div>

          <div className="space-y-2">
            {menus.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="font-bold text-foreground">{m.label}</div>
                  <span className="text-[10px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded">
                    [{m.key}]
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    <ArrowRightLeft size={11} />
                    <select
                      value={m.parentId ?? "root"}
                      onChange={(e) => {
                        const val = e.target.value;
                        void updateMenuParent(
                          m.id,
                          val === "root" ? null : Number(val),
                        );
                      }}
                      className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] outline-none"
                    >
                      <option value="root">เมนูหลัก (Nav Bar)</option>
                      {mainMenus
                        .filter((mm) => mm.id !== m.id)
                        .map((mm) => (
                          <option key={mm.id} value={mm.id}>
                            ย้ายเป็นเมนูย่อยใต้ {mm.label}
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    onClick={() => toggleMenuActive(m.id, m.isActive)}
                    className={clsx(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                      m.isActive
                        ? "bg-income/20 text-income"
                        : "bg-expense/20 text-expense",
                    )}
                  >
                    <Power size={11} /> {m.isActive ? "เปิดระบบ" : "ปิดระบบ"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
