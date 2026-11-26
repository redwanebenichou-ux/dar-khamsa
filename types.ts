// ===== دار الخماسة — تعريفات البيانات الأساسية =====
export type ID = string;

export interface UtmTag { source?: string; medium?: string; campaign?: string; content?: string; term?: string; }

export interface Settings {
  storeName: string;
  storePhone: string;
  storePhone2?: string;
  currency: string;
  address?: string;
  aboutShort?: string;
  footerTagline?: string;
  socials?: { facebook?: string; instagram?: string; tiktok?: string; youtube?: string };
  originWilaya?: number; // ولاية المصدر التي تشحن منها (لأسعار DHD الحية)
  freeStopDeskShipping?: boolean; // توصيل مجاني للمكتب (Stop Desk)
  freeStopDeskWilayas?: number[]; // ولايات محددة (إن كانت فارغة = كل الولايات)
  freeStopDeskAdvertising?: boolean; // إظهار كلمة "توصيل مجاني" بأسلوب إعلاني
  hideDeliveryMethodIcons?: boolean; // إخفاء أيقونات اختيار طريقة التوصيل
  codEnabled: boolean;
  defaultShippingHome: number;
  defaultShippingStopDesk: number;
  packagingCost: number;
  lowStockDefault: number;
  orderNumberPrefix: string;
  updatedAt: string;
}

// ---------- المنتجات ----------
export interface ProductImage { id: ID; url: string; alt: string; }
export interface Variant {
  id: ID; size?: string; color?: string; sku: string;
  priceDelta: number; stock: number; image?: string;
}
export interface FaqItem { q: string; a: string; }
export interface OrderFormConfig {
  showQuantity: boolean;
  quantityDefault: number;
  showNotes: boolean;
  requireVariant: boolean;
  ctaText: string;
}
/** إعدادات صفحة الهبوط — تُعدّل من لوحة الإدارة داخل المنتج */
export interface LandingConfig {
  promoText?: string;      // نص العرض في الشريط العلوي الداكن
  badge?: string;          // شارة صورة الهيرو (الأكثر مبيعاً / عرض خاص)
  heroTagline?: string;    // العبارة التسويقية تحت العنوان
  features: string[];      // مزايا "لماذا تختار منتجنا؟" (4)
  faq: FaqItem[];
  specs: string[];         // المواصفات
  seoTitle?: string;
  seoDescription?: string;
}
export interface Product {
  id: ID; slug: string; name: string;
  shortDescription: string; description: string;
  images: ProductImage[]; videos: string[];
  sku: string; price: number; costPrice: number; compareAtPrice?: number;
  stock: number; lowStockThreshold: number;
  variants: Variant[];
  published: boolean;
  freeStopDesk?: boolean; // توصيل مجاني للمكتب (Stop Desk) لهذا المنتج
  landing: LandingConfig;
  orderForm: OrderFormConfig;
  createdAt: string; updatedAt: string;
}
export interface InventoryMovement {
  id: ID; productId: ID; variantId?: ID;
  type: "in" | "out" | "adjustment" | "sale" | "return";
  quantity: number; reason: string; orderId?: ID;
  createdAt: string; createdBy?: string;
}

// ---------- العملاء والطلبات ----------
export interface Customer {
  id: ID; firstName: string; lastName: string; phone: string;
  wilaya?: string; wilayaCode?: number; commune?: string; address?: string;
  notes?: string; ordersCount: number; totalSpent: number;
  createdAt: string; updatedAt: string;
}
export type OrderStatus =
  | "waiting" | "attempt1" | "attempt2" | "attempt3" | "confirmed" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = [
  "waiting", "attempt1", "attempt2", "attempt3", "confirmed", "cancelled",
];
/** ترحيل الحالات القديمة إلى النظام الجديد */
export function migrateOrderStatus(s: string): OrderStatus {
  switch (s) {
    case "new": case "pending_call": case "callback": return "waiting";
    case "no_answer": return "attempt1";
    case "preparing": case "ready_to_ship": case "shipped": case "in_transit":
    case "delivered": case "returned": return "confirmed";
    case "confirmed": case "cancelled": return s as OrderStatus;
    default:
      return (ORDER_STATUSES as string[]).includes(s) ? (s as OrderStatus) : "waiting";
  }
}
export interface OrderItem {
  productId: ID; productName: string; sku: string;
  variantId?: ID; variantName?: string;
  quantity: number; unitPrice: number; costPrice: number; // snapshot
}
export interface CallLog {
  id: ID; at: string; result: "answered" | "no_answer" | "voicemail" | "busy" | "other";
  note?: string; nextCallbackAt?: string; by?: string;
}
export interface StatusEvent { at: string; from?: OrderStatus; to: OrderStatus; note?: string; by?: string; }
export interface Order {
  id: ID; number: string;
  customerId: ID;
  customer: { firstName: string; lastName: string; phone: string; wilaya: string; wilayaCode: number; commune: string; address: string; notes?: string };
  items: OrderItem[];
  method: "home" | "stopdesk";
  shippingFee: number; shippingCostActual?: number;
  discount: number; subtotal: number; total: number;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  callLogs: CallLog[];
  attribution?: UtmTag & { landing: string };
  ip?: string; userAgent?: string;
  duplicateOf?: ID;
  createdAt: string; updatedAt: string; confirmedAt?: string; deliveredAt?: string;
}

// ---------- الشحن ----------
export interface ShippingProvider {
  id: ID; code: "dhd" | string; name: string; active: boolean;
  apiBaseUrl: string; token?: string; sandbox: boolean;
  supportsHome: boolean; supportsStopDesk: boolean;
  lastTest?: { at: string; ok: boolean; message: string };
}
export interface ShippingRate { wilayaCode: number; wilayaAr: string; home: number; stopDesk: number; }
export type FreeRuleType = "all" | "min_order" | "products" | "wilayas" | "period";
export interface FreeShippingRule {
  id: ID; label: string; type: FreeRuleType; active: boolean;
  minOrder?: number; productIds?: ID[]; wilayaCodes?: number[];
  start?: string; end?: string;
}
export type ShipmentStatus = "created" | "label_ready" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "returned" | "failed";
export interface ShippingEvent { at: string; status: string; detail?: string; source: "api" | "manual"; }
export interface Shipment {
  id: ID; orderId: ID; providerId: ID;
  method: "home" | "stopdesk";
  trackingNumber?: string; labelUrl?: string;
  status: ShipmentStatus; events: ShippingEvent[];
  feeCharged: number; costActual?: number;
  apiMode: "live" | "local";
  createdAt: string; updatedAt: string;
}

// ---------- أخرى ----------
export interface Offer {
  id: ID; name: string; type: "percent" | "fixed"; value: number;
  productIds: ID[]; code?: string;
  start?: string; end?: string; active: boolean;
  countdownEnd?: string;
  createdAt: string;
}
export interface Expense {
  id: ID; label: string; category: "ads" | "packaging" | "shipping" | "services" | "other";
  amount: number; date: string; note?: string; orderId?: ID; createdAt: string;
}
export interface Review { id: ID; productId: ID; author: string; rating: number; text: string; approved: boolean; createdAt: string; }
export interface PageView { id: ID; pageSlug: string; productId?: ID; at: string; referrer?: string; utm?: UtmTag; }
export interface AuditLog { id: ID; at: string; actor?: string; action: string; entity: string; entityId?: ID; detail?: string; }

export interface DB {
  settings: Settings;
  products: Product[];
  customers: Customer[];
  orders: Order[];
  inventory: InventoryMovement[];
  providers: ShippingProvider[];
  rates: ShippingRate[];
  freeRules: FreeShippingRule[];
  shipments: Shipment[];
  offers: Offer[];
  expenses: Expense[];
  reviews: Review[];
  views: PageView[];
  audit: AuditLog[];
  seq: { order: number };
}
