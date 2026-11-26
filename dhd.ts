// ===== DHD Livraison — Adapter عبر منصة Ecotrack (بواسطة dzship) =====
// DHD تعمل على منصة Ecotrack (النطاق platform.dhd-dz.com).
// نستعمل واجهة dzship الموحدة (freeship.dzbuild.com) التي تحمل خرائط Ecotrack
// لكل شركة: توكنك يمر مرة واحدة لكل طلب ولا يُخزن عندهم أبداً.
// حد الاستعمال: 200 طلب/ساعة و60 تتبع/دقيقة — أكثر من كافٍ لمتجر واحد.
import type { Order, ShippingProvider } from "@/lib/types";

const DZSHIP_BASE = process.env.DZSHIP_BASE_URL || "https://freeship.dzbuild.com";

interface DzResult<T> { ok: boolean; data?: T; error?: string; }

async function dzCall<T>(path: string, body: unknown, method = "POST"): Promise<DzResult<T>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 ثانية مهلة
    
    const res = await fetch(DZSHIP_BASE + path, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const text = await res.text();
    let json: unknown;
    try { json = text ? JSON.parse(text) : undefined; } catch { json = { raw: text.slice(0, 300) }; }
    
    if (!res.ok) {
      const j = json as { error?: string; message?: string; code?: string };
      const errorDetails = String(j?.error ?? j?.message ?? `HTTP ${res.status}`).slice(0, 300);
      
      // تحليل الأخطاء الشائعة وتقديم رسائل أفضل
      let errorMessage = errorDetails;
      if (j?.code === "INVALID_TOKEN") {
        errorMessage = "التوكن غير صالح أو منتهي الصلاحية — تحقق من التوكن في إعدادات DHD";
      } else if (j?.code === "RATE_LIMIT") {
        errorMessage = "تجاوزت حد الطلبات — حاول مرة أخرى بعد دقيقة";
      } else if (res.status === 401) {
        errorMessage = "غير مصرح بالوصول — تحقق من التوكن";
      } else if (res.status === 404) {
        errorMessage = "النقطة النهائية غير موجودة — تحقق من عنوان API";
      }
      
      return { ok: false, error: errorMessage };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "انتهت المهلة — الاتصال بطيء جداً" };
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function creds(p: ShippingProvider) {
  return { courier: p.code === "dhd" ? "dhd" : p.code, credentials: { token: p.token ?? "" } };
}

/** اختبار الاتصال: نجيب بأسعار 16→16 — توكن صالح = نجاح، وإلا رسالة واضحة */
export async function dhdTestConnection(p: ShippingProvider) {
  if (!p.token) return { ok: false, message: "أدخل توكن DHD أولاً" };
  
  // محاولة الحصول على سعر للتحقق من التوكن
  const r = await dzCall<{ fees?: unknown }>("/v1/rates", { 
    ...creds(p), 
    options: { fromWilaya: 16 }, 
    query: { toWilaya: 16, deliveryType: "home", codAmount: 1000 } 
  });
  
  if (r.ok) {
    return { 
      ok: true, 
      message: "الاتصال ناجح مع DHD ✓ — التوكن صالح والأسعار متاحة",
      details: "يمكن الآن إرسال الطلبات إلى DHD الحقيقية"
    };
  }
  
  // رسائل خطأ محسنة
  let errorMessage = `فشل الاتصال: ${r.error}`;
  if (r.error?.includes("INVALID_TOKEN")) {
    errorMessage = "التوكن غير صالح أو منتهي الصلاحية — تحقق من التوكن في إعدادات DHD";
  } else if (r.error?.includes("RATE_LIMIT")) {
    errorMessage = "تجاوزت حد الطلبات — حاول مرة أخرى بعد دقيقة";
  } else if (r.error?.includes("NETWORK")) {
    errorMessage = "مشكلة في الاتصال بالإنترنت — تحقق من اتصالك";
  }
  
  return { ok: false, message: errorMessage };
}

export interface DhdRateQuote { home: number; stopDesk: number; source: "live" | "fallback"; }
export async function dhdGetRates(p: ShippingProvider, wilayaCode: number, fromWilaya = 16): Promise<DhdRateQuote | null> {
  // استجابة dzship: { deliveryFee, returnFee, total, currency, raw: { tarif, tarif_stopdesk } }
  const home = await dzCall<{ deliveryFee?: number; raw?: { tarif?: string; tarif_stopdesk?: string } }>("/v1/rates", { ...creds(p), options: { fromWilaya }, query: { toWilaya: wilayaCode, deliveryType: "home", codAmount: 1000 } });
  const desk = await dzCall<{ deliveryFee?: number; raw?: { tarif?: string; tarif_stopdesk?: string } }>("/v1/rates", { ...creds(p), options: { fromWilaya }, query: { toWilaya: wilayaCode, deliveryType: "stopdesk", codAmount: 1000 } });
  const h = home.data?.deliveryFee ?? Number(home.data?.raw?.tarif);
  const s = desk.data?.deliveryFee ?? Number(desk.data?.raw?.tarif_stopdesk);
  if (!Number.isFinite(h) && !Number.isFinite(s)) return null;
  return { home: Number.isFinite(h) ? h : 0, stopDesk: Number.isFinite(s) ? s : 0, source: "live" };
}

export interface DhdCreateResult { trackingNumber?: string; labelUrl?: string; raw?: unknown; }
export async function dhdCreateShipment(p: ShippingProvider, order: Order, fromWilaya = 16): Promise<DzResult<DhdCreateResult>> {
  if (!p.token) return { ok: false, error: "لا يوجد توكن — شحنة محلية فقط" };
  
  const items = order.items.map((i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity}`).join(", ");
  
  // التحقق من صحة البيانات قبل الإرسال
  if (!order.customer.firstName || !order.customer.lastName) {
    return { ok: false, error: "الاسم مطلوب لإنشاء الشحنة" };
  }
  
  if (!order.customer.phone || order.customer.phone.replace(/\D/g, "").length < 9) {
    return { ok: false, error: "رقم الهاتف غير صالح" };
  }
  
  if (!order.customer.wilayaCode || !order.customer.commune) {
    return { ok: false, error: "الولاية والبلدية مطلوبة لإنشاء الشحنة" };
  }
  
  if (!order.customer.address || order.customer.address.trim().length < 5) {
    return { ok: false, error: "العنوان غير صالح" };
  }
  
  const r = await dzCall<{ trackingNumber?: string; labelUrl?: string; status?: string; error?: { code: string; message: string } }>("/v1/orders", {
    ...creds(p),
    options: { fromWilaya },
    order: {
      reference: order.number,
      recipient: {
        fullName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        phone: order.customer.phone,
        wilayaCode: order.customer.wilayaCode,
        communeName: order.customer.commune,
        addressLine: order.customer.address,
      },
      deliveryType: order.method === "home" ? "home" : "stopdesk",
      productList: items || order.number,
      codAmount: order.total,
    },
  });
  
  if (!r.ok) {
    // رسائل خطأ محسنة بناءً على نوع الخطأ
    let errorMessage = r.error || "فشل إنشاء الشحنة";
    
    if (r.data?.error?.code === "INVALID_ADDRESS") {
      errorMessage = "العنوان غير صالح أو غير موجود في منطقة التوصيل — تحقق من العنوان";
    } else if (r.data?.error?.code === "RECIPIENT_UNREACHABLE") {
      errorMessage = "العميل غير reachable في هذه المنطقة — اختار ولاية أخرى";
    } else if (r.data?.error?.code === "COD_LIMIT_EXCEEDED") {
      errorMessage = "تجاوزت الحد الأقصى للدفع عند الاستلام — اتصل بدعم DHD";
    } else if (r.data?.error?.code === "INVALID_WEIGHT") {
      errorMessage = "الوزن المحدد يتجاوز الحد المسموح به — قسّم الطلب إلى شحنات متعددة";
    }
    
    return { ok: false, error: errorMessage };
  }
  
  // التحقق من البيانات المسترجعة
  if (!r.data?.trackingNumber) {
    return { ok: false, error: "تم إنشاء الشحنة ولكن لم يتم استرجاع رقم التتبع — اتصل بدعم DHD" };
  }
  
  return { ok: true, data: { trackingNumber: r.data.trackingNumber, labelUrl: r.data.labelUrl, raw: r.data } };
}

export interface DhdTrackResult { status?: string; events?: { at: string; status: string; detail?: string }[]; }
export async function dhdTrack(p: ShippingProvider, tracking: string): Promise<DzResult<DhdTrackResult>> {
  if (!p.token) return { ok: false, error: "لا يوجد توكن" };
  
  // التحقق من صحة رقم التتبع
  if (!tracking || tracking.trim().length < 5) {
    return { ok: false, error: "رقم التتبع غير صالح" };
  }
  
  const r = await dzCall<{ status?: string; events?: { at?: string; date?: string; status?: string; label?: string; detail?: string }[]; history?: { date?: string; status?: string; label?: string }[]; error?: { code: string; message: string } }>("/v1/track", { ...creds(p), trackingNumber: tracking });
  
  if (!r.ok) {
    // رسائل خطأ محسنة
    let errorMessage = r.error || "فشل جلب بيانات التتبع";
    
    if (r.data?.error?.code === "TRACKING_NOT_FOUND") {
      errorMessage = "رقم التتبع غير موجود — تحقق من الرقم أو انتقل فترة أطول";
    } else if (r.data?.error?.code === "TRACKING_EXPIRED") {
      errorMessage = "انتهت صلاحية بيانات التتبع — قد تم توصيل الشحنة بالفعل";
    }
    
    return { ok: false, error: errorMessage };
  }
  
  const d = r.data!;
  const raw: { at?: string; date?: string; status?: string; label?: string; detail?: string }[] = (d.events ?? d.history ?? []) as typeof raw;
  const events = raw.map((e) => ({ 
    at: e.at ?? e.date ?? new Date().toISOString(), 
    status: e.status ?? e.label ?? "update", 
    detail: e.detail ?? e.label 
  }));
  
  // ترتيب الأحداث حسب التاريخ (الأحدث أولاً)
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  
  return { ok: true, data: { status: d.status, events } };
}

/** مكاتب التوقف (Stop Desk) في ولاية معينة */
export async function dhdStopDesks(p: ShippingProvider, wilayaCode: number) {
  return dzCall<{ desks?: { id?: number | string; name?: string; address?: string }[] }>("/v1/desks", { ...creds(p), wilayaCode });
}
