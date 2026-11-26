// ===== خدمات: إعدادات، عروض، مصاريف، تقييمات، views، تحليلات =====
import { getDB, mutate } from "@/lib/db/store";
import type { Settings, Offer, Expense, Review, PageView, Order } from "@/lib/types";
import { uid, nowISO } from "@/lib/utils";
import { audit } from "@/lib/services";

export async function getSettings() { return (await getDB()).settings; }
export async function saveSettings(input: Partial<Settings>, actor?: string) {
  return mutate((db) => {
    db.settings = { ...db.settings, ...input, updatedAt: nowISO() };
    audit(db, "update", "settings", undefined, "تحديث الإعدادات", actor);
    return db.settings;
  });
}

// ---------- العروض ----------
export async function listOffers() { return (await getDB()).offers; }
export async function saveOffer(input: Partial<Offer> & { name: string }, actor?: string) {
  return mutate((db) => {
    const t = nowISO();
    if (input.id) {
      const i = db.offers.findIndex((o) => o.id === input.id);
      if (i < 0) throw new Error("غير موجود");
      db.offers[i] = { ...db.offers[i], ...input };
      audit(db, "update", "offer", input.id, input.name, actor);
      return db.offers[i];
    }
    const o: Offer = { id: uid(), name: input.name, type: input.type ?? "percent", value: input.value ?? 0, productIds: input.productIds ?? [], code: input.code, start: input.start, end: input.end, active: input.active ?? true, countdownEnd: input.countdownEnd, createdAt: t };
    db.offers.unshift(o);
    audit(db, "create", "offer", o.id, o.name, actor);
    return o;
  });
}
export async function deleteOffer(id: string) {
  return mutate((db) => { db.offers = db.offers.filter((o) => o.id !== id); });
}

// ---------- المصاريف ----------
export async function listExpenses() { return (await getDB()).expenses; }
export async function addExpense(input: { label: string; category: Expense["category"]; amount: number; date?: string; note?: string; orderId?: string }, actor?: string) {
  return mutate((db) => {
    const e: Expense = { id: uid(), label: input.label, category: input.category, amount: input.amount, date: input.date ?? nowISO().slice(0, 10), note: input.note, orderId: input.orderId, createdAt: nowISO() };
    db.expenses.unshift(e);
    audit(db, "create", "expense", e.id, `${e.label} — ${e.amount}`, actor);
    return e;
  });
}
export async function deleteExpense(id: string) {
  return mutate((db) => { db.expenses = db.expenses.filter((e) => e.id !== id); });
}

// ---------- التقييمات ----------
export async function listReviews(productId?: string) {
  const r = (await getDB()).reviews;
  return productId ? r.filter((x) => x.productId === productId) : r;
}
export async function saveReview(input: { productId: string; author: string; rating: number; text: string; approved?: boolean }) {
  return mutate((db) => {
    const r: Review = { id: uid(), productId: input.productId, author: input.author || "زبون", rating: Math.max(1, Math.min(5, input.rating)), text: input.text, approved: input.approved ?? true, createdAt: nowISO() };
    db.reviews.unshift(r);
    return r;
  });
}
export async function toggleReview(id: string, approved: boolean) {
  return mutate((db) => {
    const r = db.reviews.find((x) => x.id === id);
    if (r) r.approved = approved;
    return r;
  });
}
export async function deleteReview(id: string) {
  return mutate((db) => { db.reviews = db.reviews.filter((r) => r.id !== id); });
}

// ---------- Views ----------
export async function trackView(pageSlug: string, productId: string | undefined, referrer: string | undefined, utm?: PageView["utm"]) {
  return mutate((db) => {
    const v: PageView = { id: uid(), pageSlug, productId, at: nowISO(), referrer, utm };
    db.views.unshift(v);
    if (db.views.length > 5000) db.views.length = 5000;
    return v;
  });
}

// ---------- التحليلات ----------
export interface DashboardStats {
  totalOrders: number; byStatus: Record<string, number>;
  deliveredCount: number; returnedCount: number;
  revenueDelivered: number; revenueConfirmedPipeline: number;
  costsDelivered: number; expensesTotal: number; netProfit: number;
  bestSellers: { productId: string; name: string; qty: number; revenue: number }[];
  views: number; ordersToday: number; recentOrders: Order[]; recentAudit: unknown[];
}

// التوصيل الآن يُحدد من تتبع شركة التوصيل (deliveredAt يُضبط عند مزامنة الشحنة)
const COMPLETED = ["confirmed"];

export async function dashboardStats(from?: string, to?: string): Promise<DashboardStats> {
  const db = await getDB();
  const f = from ? new Date(from) : undefined;
  const t = to ? new Date(to + "T23:59:59") : undefined;
  const inRange = (iso: string) => (!f || new Date(iso) >= f) && (!t || new Date(iso) <= t);
  const orders = db.orders.filter((o) => inRange(o.createdAt));
  const byStatus: Record<string, number> = {};
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

  const delivered = orders.filter((o) => o.deliveredAt);
  const pipeline = orders.filter((o) => COMPLETED.includes(o.status) && !o.deliveredAt);
  const revenueDelivered = delivered.reduce((s, o) => s + o.total - o.shippingFee, 0);
  const revenueConfirmedPipeline = pipeline.reduce((s, o) => s + o.total - o.shippingFee, 0);
  const costsDelivered = delivered.reduce((s, o) => {
    const itemsCost = o.items.reduce((a, i) => a + i.costPrice * i.quantity, 0);
    const shipCost = o.shippingCostActual ?? o.shippingFee;
    return s + itemsCost + shipCost + db.settings.packagingCost * o.items.reduce((a, i) => a + i.quantity, 0);
  }, 0);
  const expenses = db.expenses.filter((e) => inRange(e.date + "T12:00:00"));
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const sellers = new Map<string, { productId: string; name: string; qty: number; revenue: number }>();
  for (const o of orders.filter((x) => x.status !== "cancelled")) {
    for (const i of o.items) {
      const cur = sellers.get(i.productId) ?? { productId: i.productId, name: i.productName, qty: 0, revenue: 0 };
      cur.qty += i.quantity;
      cur.revenue += i.unitPrice * i.quantity;
      sellers.set(i.productId, cur);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return {
    totalOrders: orders.length,
    byStatus,
    deliveredCount: delivered.length,
    returnedCount: db.shipments.filter((s) => ["returned", "return_in_transit"].includes(s.status)).length,
    revenueDelivered,
    revenueConfirmedPipeline,
    costsDelivered,
    expensesTotal,
    netProfit: revenueDelivered - costsDelivered - expensesTotal,
    bestSellers: Array.from(sellers.values()).sort((a, b) => b.qty - a.qty).slice(0, 8),
    views: db.views.filter((v) => inRange(v.at)).length,
    ordersToday: db.orders.filter((o) => o.createdAt.slice(0, 10) === today).length,
    recentOrders: orders.slice(0, 10),
    recentAudit: db.audit.slice(0, 15),
  };
}
