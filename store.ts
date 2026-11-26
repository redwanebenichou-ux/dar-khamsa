// ===== طبقة التخزين — ملف JSON محلي (استبدلها بـ Supabase لاحقاً) =====
// الواجهة ثابتة: getDB() / mutate(fn) — عند ربط Supabase نعيد كتابة هذه الطبقة فقط.
import fs from "fs";
import path from "path";
import type { DB, Product, Order } from "@/lib/types";
import { migrateOrderStatus } from "@/lib/types";
import { defaultLanding } from "@/lib/landing-defaults";
import { loadState, saveState, supabaseEnabled } from "@/lib/db/supabase-store";
import { WILAYAS } from "@/lib/wilayas";
import { uid, nowISO } from "@/lib/utils";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "db.json");

let cache: DB | null = null;
let writeChain: Promise<void> = Promise.resolve();

function seed(): DB {
  const t = nowISO();
  const rates = WILAYAS.map((w) => ({
    wilayaCode: w.code, wilayaAr: w.ar,
    home: w.code === 16 ? 800 : w.code >= 40 ? 1200 : 1000,
    stopDesk: w.code === 16 ? 400 : w.code >= 40 ? 700 : 600,
  }));
  const product: Product = {
    id: uid(), slug: "abaya-dar-el-khamasa", name: "عباية دار الخماسة",
    shortDescription: "عباية فاخرة بتصميم أصيل يعكس تراث دار الخماسة — أناقة تليق بك في كل مناسبة.",
    description: "عباية دار الخماسة مصنوعة من أجود الأقمشة، بخياطة يدوية متقنة تعكس أصالة الحرفة الجزائرية وفخامة العصرية في آن واحد. قصة واسعة مريحة وتفاصيل مطرزة بعناية تجعلها مثالية للمناسبات والخروج اليومي.",
    images: [{ id: uid(), url: "/logo.png", alt: "عباية دار الخماسة" }],
    videos: [],
    sku: "DEK-AB-001", price: 6500, costPrice: 3200, compareAtPrice: 8500,
    stock: 25, lowStockThreshold: 5,
    variants: [
      { id: uid(), size: "S", color: "أسود", sku: "DEK-AB-001-S-BK", priceDelta: 0, stock: 8 },
      { id: uid(), size: "M", color: "أسود", sku: "DEK-AB-001-M-BK", priceDelta: 0, stock: 10 },
      { id: uid(), size: "L", color: "بيج", sku: "DEK-AB-001-L-BG", priceDelta: 500, stock: 7 },
    ],
    published: true,
    landing: {
      ...defaultLanding("عباية دار الخماسة"),
      promoText: "عرض خاص لفترة محدودة — خصم يصل إلى 23%",
      heroTagline: "أناقة الجزائرية... بلمسة عصرية",
      features: [
        "قماش فاخر مريح ومناسب لكل الفصول",
        "خياطة يدوية متقنة بتفاصيل مطرزة",
        "قصة واسعة أنيقة تناسب جميع المقاسات",
        "قيمة ممتازة مقابل السعر مع ضمان الجودة",
      ],
      specs: [
        "القماش: فاين كواليتي فاخر",
        "المقاسات: S / M / L / XL",
        "الألوان: أسود، بيج، كحلي",
        "العناية: غسيل يدوي أو تنظيف جاف",
      ],
      seoTitle: "عباية دار الخماسة — أناقة أصيلة | اطلب الآن",
      seoDescription: "عباية فاخرة بخياطة يدوية متقنة. الدفع عند الاستلام والتوصيل لجميع ولايات الجزائر.",
    },
    orderForm: { showQuantity: true, quantityDefault: 1, showNotes: true, requireVariant: true, ctaText: "تأكيد الطلب" },
    createdAt: t, updatedAt: t,
  };
  return {
    settings: {
      storeName: "دار الخماسة", storePhone: "0561 23 45 67", currency: "دج",
      address: "الجزائر العاصمة، الجزائر",
      aboutShort: "دار الخماسة — علامة جزائرية تجمع بين أصالة الحرفة وفخامة العصرية. منتجات مختارة بعناية توصلك أينما كنت.",
      footerTagline: "أصالة الحرفة... فخامة العصرية",
      originWilaya: 16,
      socials: { facebook: "", instagram: "", tiktok: "", youtube: "" },
      codEnabled: true, defaultShippingHome: 1000, defaultShippingStopDesk: 600,
      packagingCost: 150, lowStockDefault: 5, orderNumberPrefix: "DEK",
      updatedAt: t,
    },
    products: [product], customers: [], orders: [], inventory: [],
    providers: [{
      id: "dhd", code: "dhd", name: "DHD Express", active: true,
      apiBaseUrl: process.env.DHD_API_BASE_URL || "https://api.dhd.dz",
      token: process.env.DHD_API_TOKEN || "", sandbox: process.env.DHD_SANDBOX === "true",
      supportsHome: true, supportsStopDesk: true,
    }],
    rates, freeRules: [], shipments: [], offers: [], expenses: [], reviews: [], views: [],
    audit: [{ id: uid(), at: t, action: "seed", entity: "system", detail: "تهيئة أولية — قالب موحد لصفحات الهبوط" }],
    seq: { order: 1000 },
  };
}

/** قراءة طازجة دائماً: من Supabase عند تفعيله، وإلا من الملف المحلي في كل مرة.
 *  يضمن ظهور أي منتج/طلب جديد فوراً حتى مع تعدد عمليات العرض في next start. */
export async function getDB(): Promise<DB> {
  if (supabaseEnabled()) {
    const doc = await loadState();
    if (doc) return doc;
    // Supabase فارغ/فاشل — نكمل بالملف المحلي
  }
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
      // ترحيل الحالات القديمة إلى النظام الجديد (انتظار/محاولات/مؤكد)
      for (const o of parsed.orders ?? []) o.status = migrateOrderStatus(o.status);
      cache = parsed;
      return parsed;
    }
  } catch (e) {
    // لا نستبدل بيانات المستخدم بالبذرة أبداً عند فشل قراءة — نُبقي آخر نسخة معروفة
    console.error("db read error — using last known cache:", e);
    if (cache) return cache;
  }
  cache = seed();
  await persist(cache);
  return cache;
}

async function persist(db: DB) {
  // كتابة مزدوجة: Supabase (إن فعّل) + ملف محلي احتياطي دائماً
  if (supabaseEnabled()) await saveState(db);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, FILE);
  } catch (e) { console.error("persist file error", e); }
}

/** تعديل آمن مع persist متسلسل — ينتظر نتيجة fn (بما في ذلك async) قبل الحفظ */
export async function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const db = await getDB();
  const result = await fn(db);
  await persist(db);
  return result;
}
