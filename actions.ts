"use server";
// ===== Server Actions — الجسر بين المكونات وطبقة الخدمات =====
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import * as S from "@/lib/services";
import * as O from "@/lib/services-orders";
import * as SH from "@/lib/services-shipping";
import * as M from "@/lib/services-misc";
import { checkCredentials, createSession, destroySession, isAuthed, currentAdmin } from "@/lib/auth";
import { uploadToStorage } from "@/lib/db/supabase-store";
import type { OrderStatus, Settings } from "@/lib/types";
import { uid } from "@/lib/utils";

const guard = async () => { if (!isAuthed()) throw new Error("غير مصرح — سجل الدخول أولاً"); return currentAdmin() ?? undefined; };
const pub = (p: string) => { revalidatePath(p); };

// ---------- مصادقة ----------
const loginAttempts = new Map<string, { n: number; last: number }>();
export async function login(email: string, password: string) {
  const key = (email || "").trim().toLowerCase();
  const a = loginAttempts.get(key);
  if (a && a.n >= 5 && Date.now() - a.last < 10 * 60 * 1000) {
    return { ok: false, error: "محاولات كثيرة — انتظر 10 دقائق ثم أعد المحاولة" };
  }
  if (!checkCredentials(email, password)) {
    loginAttempts.set(key, { n: (a?.n ?? 0) + 1, last: Date.now() });
    await new Promise((r) => setTimeout(r, 900)); // يبطئ التخمين الآلي
    return { ok: false, error: "بيانات الدخول غير صحيحة" };
  }
  loginAttempts.delete(key);
  createSession(email);
  return { ok: true };
}
export async function logout() { destroySession(); return { ok: true }; }
export async function checkAuth() { return isAuthed(); }

// ---------- productos ----------
export const listProducts = async () => { await guard(); return S.listProducts(); };
export const getProduct = async (id: string) => { await guard(); return S.getProduct(id); };
export const saveProduct = async (input: Parameters<typeof S.saveProduct>[0]) => { const a = await guard(); const r = await S.saveProduct(input, a); pub("/admin/products"); return r; };
export const deleteProduct = async (id: string) => { const a = await guard(); await S.deleteProduct(id, a); pub("/admin/products"); };
export const duplicateProduct = async (id: string) => { const a = await guard(); const r = await S.duplicateProduct(id, a); pub("/admin/products"); return r; };
export const addInventory = async (productId: string, variantId: string | undefined, type: "in" | "out" | "adjustment", quantity: number, reason: string) => {
  const a = await guard(); const r = await S.addInventory(productId, variantId, type, quantity, reason, a); pub("/admin/inventory"); pub("/admin/products"); return r;
};

// ---------- الطلبات ----------
const ipOrderHits = new Map<string, number[]>();
export async function submitOrderPublic(input: O.SubmitInput) {
  const h = headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  // حماية من السبام: 6 طلبات كحد أقصى لكل IP خلال 10 دقائق
  const now = Date.now();
  const hits = (ipOrderHits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 6) throw new Error("عدد محاولات كبير من جهازك — انتظر قليلاً ثم أعد المحاولة");
  hits.push(now);
  ipOrderHits.set(ip, hits);
  const res = await O.submitOrder({ ...input, ip, userAgent: h.get("user-agent") ?? undefined });
  pub(`/p/${input.productSlug}`);
  return res;
}
export const listOrders = async (status?: OrderStatus | "all") => { await guard(); return O.listOrders(status); };
export const getOrder = async (id: string) => { await guard(); return O.getOrder(id); };
export const setOrderStatus = async (id: string, to: OrderStatus, note?: string) => { const a = await guard(); const r = await O.setOrderStatus(id, to, note, a); pub("/admin/orders"); return r; };
export const addCallLog = async (orderId: string, log: Parameters<typeof O.addCallLog>[1]) => { const a = await guard(); const r = await O.addCallLog(orderId, log, a); pub("/admin/orders"); return r; };
export const listCustomers = async () => { await guard(); return O.listCustomers(); };
export const getCustomer = async (id: string) => { await guard(); return O.getCustomer(id); };
export const updateCustomerNotes = async (id: string, notes: string) => { await guard(); return O.updateCustomerNotes(id, notes); };

// ---------- الشحن ----------
export const listProviders = async () => { await guard(); return SH.listProviders(); };
export const saveProvider = async (input: Parameters<typeof SH.saveProvider>[0]) => { const a = await guard(); const r = await SH.saveProvider(input, a); pub("/admin/shipping"); return r; };
export const testProvider = async (id: string) => { await guard(); return SH.testProvider(id); };
export const getRates = async () => { await guard(); return getRatesData(); };
async function getRatesData() { const { getDB } = await import("@/lib/db/store"); return (await getDB()).rates; }
export const saveRates = async (rates: Parameters<typeof SH.saveRates>[0]) => { const a = await guard(); await SH.saveRates(rates, a); pub("/admin/shipping"); };
export const listFreeRules = async () => { await guard(); return SH.listFreeRules(); };
export const saveFreeRules = async (rules: Parameters<typeof SH.saveFreeRules>[0]) => { const a = await guard(); await SH.saveFreeRules(rules, a); pub("/admin/shipping"); };
export const listShipments = async () => { await guard(); return SH.listShipments(); };
export const getShipment = async (id: string) => { await guard(); return SH.getShipment(id); };
export const createShipment = async (orderId: string) => { const a = await guard(); const r = await SH.createShipment(orderId, a); pub("/admin/shipping"); pub("/admin/orders"); return r; };
export const syncShipment = async (id: string) => { const a = await guard(); return SH.syncShipment(id, a); };
export const syncAllShipments = async () => { const a = await guard(); return SH.syncAllActive(a); };
export const sendOrdersToCourier = async (orderIds: string[]) => {
  const a = await guard();
  const results: { orderId: string; ok: boolean; tracking?: string; error?: string; existed?: boolean }[] = [];
  for (const id of orderIds) {
    try {
      const r = await SH.createShipment(id, a);
      results.push({ orderId: id, ok: true, tracking: r.sh.trackingNumber, existed: r.existed });
    } catch (e) {
      results.push({ orderId: id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  pub("/admin/orders"); pub("/admin/shipping");
  return results;
};
export const setShipmentStatus = async (id: string, status: Parameters<typeof SH.setShipmentStatus>[1], detail: string) => { const a = await guard(); return SH.setShipmentStatus(id, status, detail, a); };
export const setShipmentCost = async (id: string, cost: number) => { await guard(); return SH.setShipmentCost(id, cost); };
export const wilayaOptions = async () => SH.wilayaOptions();

// ---------- متفرقات ----------
export const getSettings = async () => { await guard(); return M.getSettings(); };
export const saveSettings = async (input: Partial<Settings>) => { const a = await guard(); const r = await M.saveSettings(input, a); pub("/admin/settings"); return r; };
export const listOffers = async () => { await guard(); return M.listOffers(); };
export const saveOffer = async (input: Parameters<typeof M.saveOffer>[0]) => { const a = await guard(); return M.saveOffer(input, a); };
export const deleteOffer = async (id: string) => { await guard(); await M.deleteOffer(id); };
export const listExpenses = async () => { await guard(); return M.listExpenses(); };
export const addExpense = async (input: Parameters<typeof M.addExpense>[0]) => { const a = await guard(); const r = await M.addExpense(input, a); pub("/admin/expenses"); return r; };
export const deleteExpense = async (id: string) => { await guard(); await M.deleteExpense(id); };
export const listReviews = async (productId?: string) => { await guard(); return M.listReviews(productId); };
export const saveReview = async (input: Parameters<typeof M.saveReview>[0]) => { await guard(); return M.saveReview(input); };
export const toggleReview = async (id: string, approved: boolean) => { await guard(); return M.toggleReview(id, approved); };
export const deleteReview = async (id: string) => { await guard(); await M.deleteReview(id); };
export const dashboardStats = async (from?: string, to?: string) => { await guard(); return M.dashboardStats(from, to); };
export const getAudit = async () => { await guard(); const { getDB } = await import("@/lib/db/store"); return (await getDB()).audit.slice(0, 100); };
export const getInventory = async () => { await guard(); const { getDB } = await import("@/lib/db/store"); return (await getDB()).inventory; };

// ---------- تسجيل الزيارات العامة ----------
export async function trackViewPublic(productSlug: string, productId: string | undefined, utm?: Parameters<typeof M.trackView>[3]) {
  const h = headers();
  await M.trackView(productSlug, productId, h.get("referer") ?? undefined, utm);
  return { ok: true };
}

// ---------- رفع الملفات ----------
export async function uploadFile(formData: FormData) {
  await guard();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("لا يوجد ملف");
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"];
  if (!allowed.includes(file.type)) throw new Error("نوع الملف غير مسموح — صور أو فيديو فقط");
  if (file.size > 25 * 1024 * 1024) throw new Error("حجم الملف أكبر من 25MB");

  let buf = Buffer.from(await file.arrayBuffer());
  let ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  let contentType = file.type;
  // ضغط الصور تلقائياً إلى WebP (صفحة أسرع = تكلفة إعلان أقل) — GIF يبقى كما هو
  if (file.type.startsWith("image/") && file.type !== "image/gif") {
    try {
      const sharp = (await import("sharp")).default;
      buf = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      ext = "webp";
      contentType = "image/webp";
    } catch (e) { console.warn("[upload] compress fallback to original:", e); }
  }
  const name = `${uid()}.${ext}`;

  // Supabase Storage أولاً (دائم على Vercel) — القرص المحلي احتياطاً
  const url = await uploadToStorage(buf, name, contentType);
  if (url) return { url };

  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
  return { url: `/uploads/${name}` };
}
