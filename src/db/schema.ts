import {
  pgTable,
  serial,
  text,
  date,
  uuid,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const txTypeEnum = pgEnum("tx_type", ["income", "expense"]);

export const budgetModeEnum = pgEnum("budget_mode", ["month", "week"]);

export const months = pgTable(
  "months",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    ym: text("ym").notNull(),
    openingBalance: numeric("opening_balance", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    note: text("note").notNull().default(""),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    savingsAmount: numeric("savings_amount", { precision: 12, scale: 2 }),
    savingsTxId: integer("savings_tx_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("months_user_ym_uq").on(t.userId, t.ym)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    date: date("date").notNull(),
    spentAt: timestamp("spent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    type: txTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: text("category").notNull().default("other"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tx_user_date_idx").on(t.userId, t.date)],
);

export const savingsTransactions = pgTable("savings_transactions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey(),
  budgetMode: budgetModeEnum("budget_mode").notNull().default("month"),
  defaultSalary: numeric("default_salary", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dailyBudgets = pgTable(
  "daily_budgets",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    date: date("date").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("daily_budgets_user_date_uq").on(t.userId, t.date)],
);

export const salaries = pgTable(
  "salaries",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    ym: text("ym").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    receivedAt: date("received_at").notNull(),
    applyMode: text("apply_mode").notNull().default("opening_balance"),
    incomeTxId: integer("income_tx_id"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("salaries_user_ym_uq").on(t.userId, t.ym)],
);

export const appCategories = pgTable("app_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📦"),
  parentId: integer("parent_id"),
  type: text("type").notNull().default("expense"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const appMenus = pgTable("app_menus", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  icon: text("icon").notNull().default("ListTodo"),
  parentId: integer("parent_id"),
  targetView: text("target_view").notNull().default("day"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userMenuPreferences = pgTable(
  "user_menu_preferences",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    menuKey: text("menu_key").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("user_menu_prefs_user_key_uq").on(t.userId, t.menuKey)],
);

export type Transaction = typeof transactions.$inferSelect;
export type Month = typeof months.$inferSelect;
export type SavingsTransaction = typeof savingsTransactions.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type DailyBudget = typeof dailyBudgets.$inferSelect;
export type Salary = typeof salaries.$inferSelect;
export type AppCategory = typeof appCategories.$inferSelect;
export type AppMenu = typeof appMenus.$inferSelect;
export type UserMenuPreference = typeof userMenuPreferences.$inferSelect;

