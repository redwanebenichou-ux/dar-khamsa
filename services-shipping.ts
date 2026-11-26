// ===== خدمات الشحن — DHD + جدول أسعار + شحن مجاني =====
import { getDB, mutate } from "@/lib/db/store";
import type { DB, ShippingProvider, ShippingRate, FreeShippingRule, Shipment, ShippingEvent, Order } from "@/lib/types";
import { uid, nowISO } from "@/lib/utils";
import { WILAYAS } from "@/lib/wilayas";
import { audit } from "@/lib/services";
import * as dhd from "@/lib/shipping/dhd";

export interface ShippingQuote { fee: number; free: boolean; source: "live" | "table" | "free_rule"; base: number; }

/** حساب سعر التوصيل — أولوية: قواعد الشحن المجاني → API حي → جدول ثابت */
export function computeShipping(db: DB, wilayaCode: number, method: "home" | "stopdesk", subtotal: number, productIds: string[]): ShippingQuote {
  const s = db.settings;
  const now = new Date();
  // توصيل مجاني للمكتب (Stop Desk) — إعداد عام أو حسب ولايات
  if (method === "stopdesk" && s.freeStopDeskShipping) {
    if (!s.freeStopDeskWilayas || s.freeStopDeskWilayas.length === 0 || s.freeStopDeskWilayas.includes(wilayaCode)) {
      return { fee: 0, free: true, source: "free_rule", base: 0 };
    }
  }
  // توصيل مجاني للمكتب — per-product
  if (method === "stopdesk" && productIds.length > 0) {
    const freeProduct = db.products.some((p) => productIds.includes(p.id) && p.freeStopDesk);
    if (freeProduct) return { fee: 0, free: true, source: "free_rule", base: 0 };
  }
  for (const r of db.freeRules.filter((x) => x.active)) {
    if (r.type === "all") return { fee: 0, free: true, source: "free_rule", base: 0 };
    if (r.type === "min_order" && r.minOrder != null && subtotal >= r.minOrder) return { fee: 0, free: true, source: "free_rule", base: 0 };
    if (r.type === "products" && (r.productIds ?? []).some((id) => productIds.includes(id))) return { fee: 0, free: true, source: "free_rule", base: 0 };
    if (r.type === "wilayas" && (r.wilayaCodes ?? []).includes(wilayaCode)) return { fee: 0, free: true, source: "free_rule", base: 0 };
    if (r.type === "period" && ((!r.start || new Date(r.start) <= now) && (!r.end || new Date(r.end) >= now))) return { fee: 0, free: true, source: "free_rule", base: 0 };
  }
  const rate = db.rates.find((r) => r.wilayaCode === wilayaCode);
  const base = method === "home" ? (rate?.home ?? s.defaultShippingHome) : (rate?.stopDesk ?? s.defaultShippingStopDesk);
  return { fee: base, free: false, source: "table", base };
}

export async function listProviders() { return (await getDB()).providers; }

export async function saveProvider(input: Partial<ShippingProvider> & { id: string }, actor?: string) {
  return mutate((db) => {
    const i = db.providers.findIndex((p) => p.id === input.id);
    if (i < 0) throw new Error("غير موجود");
    db.providers[i] = { ...db.providers[i], ...input };
    audit(db, "update", "provider", input.id, input.name ?? "", actor);
    return db.providers[i];
  });
}

export async function testProvider(id: string) {
  return mutate(async (db) => {
    const p = db.providers.find((x) => x.id === id);
    if (!p) throw new Error("غير موجود");
    const r = await dhd.dhdTestConnection(p);
    p.lastTest = { at: nowISO(), ok: r.ok, message: r.message };
    return p.lastTest;
  });
}

export async function saveRates(rates: ShippingRate[], actor?: string) {
  return mutate((db) => {
    db.rates = rates;
    audit(db, "update", "rates", undefined, `${rates.length} ولاية`, actor);
  });
}

export async function listFreeRules() { return (await getDB()).freeRules; }
export async function saveFreeRules(rules: FreeShippingRule[], actor?: string) {
  return mutate((db) => { db.freeRules = rules; audit(db, "update", "freeRules", undefined, `${rules.length} قاعدة`, actor); });
}

export async function listShipments() { return (await getDB()).shipments; }
export async function getShipment(id: string) { return (await getDB()).shipments.find((s) => s.id === id || s.orderId === id) ?? null; }

export async function createShipment(orderId: string, actor?: string) {
  return mutate(async (db) => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new Error("الطلب غير موجود");
    if (o.status !== "confirmed") throw new Error("لا يمكن إرسال طلب غير مؤكد");
    const existing = db.shipments.find((s) => s.orderId === orderId);
    if (existing) return { sh: existing, existed: true as const };
    const provider = db.providers.find((p) => p.active && p.code === "dhd") ?? db.providers.find((p) => p.active);
    if (!provider) throw new Error("لا يوجد مزوّد شحن فعّال");

    let tracking: string | undefined; let labelUrl: string | undefined; let apiMode: "live" | "local" = "local";
    let liveError: string | undefined;
    if (provider.token) {
      const r = await dhd.dhdCreateShipment(provider, o, db.settings.originWilaya ?? 16);
      if (r.ok && r.data) {
        apiMode = "live";
        tracking = r.data.trackingNumber;
        labelUrl = r.data.labelUrl;
      } else {
        liveError = r.error;
      }
    }
    if (!tracking) throw new Error(liveError || "فشل إنشاء الشحنة لدى DHD"); // لا شحنات محلية — الإرسال حقيقي فقط
    const t = nowISO();
    // تكلفة التوصيل الفعلية (ما يدفعه المتجر) — تُحسب من جدول الأسعار (أو default)
    const rate = db.rates.find((r) => r.wilayaCode === o.customer.wilayaCode);
    const actualCost = o.method === "home"
      ? (rate?.home ?? db.settings.defaultShippingHome)
      : (rate?.stopDesk ?? db.settings.defaultShippingStopDesk);
    const sh: Shipment = {
      id: uid(), orderId, providerId: provider.id, method: o.method,
      trackingNumber: tracking, labelUrl, status: "created", apiMode,
      events: [{ at: t, status: "created", detail: "أُرسلت الطلبية إلى DHD عبر API", source: "api" }],
      feeCharged: o.shippingFee, costActual: actualCost,
      createdAt: t, updatedAt: t,
    };
    db.shipments.unshift(sh);
    o.statusHistory.push({ at: t, from: o.status, to: o.status, note: `أُرسلت إلى DHD — تتبع: ${tracking}`, by: actor });
    audit(db, "shipment_create", "shipment", sh.id, `${sh.trackingNumber} (${apiMode})`, actor);
    return { sh, existed: false as const };
  });
}

export async function syncShipment(id: string, actor?: string) {
  return mutate(async (db) => {
    const sh = db.shipments.find((s) => s.id === id);
    if (!sh) throw new Error("غير موجودة");
    const provider = db.providers.find((p) => p.id === sh.providerId);
    if (provider?.token && sh.trackingNumber && sh.apiMode === "live") {
      const r = await dhd.dhdTrack(provider, sh.trackingNumber);
      if (r.ok && r.data?.events) {
        for (const ev of r.data.events) {
          if (!sh.events.some((e) => e.status === ev.status && e.at === ev.at)) {
            sh.events.push({ at: ev.at, status: ev.status, detail: ev.detail, source: "api" });
          }
        }
        if (r.data.status) {
          const raw = String(r.data.status).toLowerCase();
          const mapped: Shipment["status"] =
            raw.includes("deliver") ? "delivered" :
            raw.includes("return") ? "returned" :
            raw.includes("out_for") || raw.includes("out for") ? "out_for_delivery" :
            raw.includes("transit") ? "in_transit" :
            raw.includes("pickup") || raw.includes("picked") ? "picked_up" :
            raw.includes("fail") ? "failed" :
            "created";
          sh.status = mapped;
        }
        sh.updatedAt = nowISO();
        // ربط نتائج التوصيل بالطلب والمال والمخزون تلقائياً
        const o = db.orders.find((x) => x.id === sh.orderId);
        if (o) {
          if (sh.status === "delivered" && !o.deliveredAt) {
            o.deliveredAt = nowISO();
            audit(db, "delivered", "order", o.id, `تم التوصيل — تتبع ${sh.trackingNumber}`, actor);
          }
          if (sh.status === "returned") {
            // إرجاع مؤكد من المندوب — إعادة المخزون تلقائياً
            for (const i of o.items) {
              const p = db.products.find((x) => x.id === i.productId);
              if (p) {
                if (i.variantId) { const v = p.variants.find((x) => x.id === i.variantId); if (v) v.stock += i.quantity; }
                else p.stock += i.quantity;
                db.inventory.unshift({ id: uid(), productId: p.id, variantId: i.variantId, type: "return", quantity: i.quantity, reason: `مرتجع من المندوب — تتبع ${sh.trackingNumber}`, orderId: o.id, createdAt: nowISO(), createdBy: actor });
              }
            }
            audit(db, "shipment_returned", "order", o.id, `مرتجع — تتبع ${sh.trackingNumber}`, actor);
          }
        }
      }
    }
    audit(db, "shipment_sync", "shipment", sh.id, sh.trackingNumber, actor);
    return sh;
  });
}

/** مزامنة كل الشحنات النشطة (غير موصّلة/مرتجعة) */
export async function syncAllActive(actor?: string) {
  const db0 = await getDB();
  const active = db0.shipments.filter((s) => s.apiMode === "live" && !["delivered", "returned", "cancelled", "lost"].includes(s.status));
  const results: { tracking: string; ok: boolean; error?: string }[] = [];
  for (const s of active) {
    try { const sh = await syncShipment(s.id, actor); results.push({ tracking: s.trackingNumber ?? "", ok: true, error: undefined }); }
    catch (e) { results.push({ tracking: s.trackingNumber ?? "", ok: false, error: e instanceof Error ? e.message : String(e) }); }
  }
  return results;
}

export async function setShipmentStatus(id: string, status: Shipment["status"], detail: string, actor?: string) {
  return mutate((db) => {
    const sh = db.shipments.find((s) => s.id === id);
    if (!sh) throw new Error("غير موجودة");
    sh.status = status;
    sh.events.push({ at: nowISO(), status, detail, source: "manual" });
    sh.updatedAt = nowISO();
    audit(db, "shipment_status", "shipment", id, status, actor);
    return sh;
  });
}

export async function setShipmentCost(id: string, cost: number) {
  return mutate((db) => {
    const sh = db.shipments.find((s) => s.id === id);
    if (!sh) throw new Error("غير موجودة");
    sh.costActual = cost;
    sh.updatedAt = nowISO();
    return sh;
  });
}

export async function wilayaOptions() {
  return WILAYAS.map((w) => ({ code: w.code, ar: w.ar, fr: w.fr, communes: w.communes }));
}
