// ===== طبقة الخدمات — منطق الأعمال الكامل =====
import { getDB, mutate } from "@/lib/db/store";
import { defaultLanding } from "@/lib/landing-defaults";
import type {
  DB, Product, Order, OrderItem,
  CallLog, StatusEvent, Customer, InventoryMovement, ShippingProvider, ShippingRate,
  FreeShippingRule, Shipment, ShippingEvent, Offer, Expense, Review, PageView, AuditLog,
  Settings, Variant,
} from "@/lib/types";
import { uid, nowISO, slugify, safePhone } from "@/lib/utils";
import { WILAYAS } from "@/lib/wilayas";
import * as dhd from "@/lib/shipping/dhd";

export function audit(db: DB, action: string, entity: string, entityId?: string, detail?: string, actor?: string) {
  const log: AuditLog = { id: uid(), at: nowISO(), action, entity, entityId, detail, actor };
  db.audit.unshift(log);
  if (db.audit.length > 2000) db.audit.length = 2000;
}

// ================= المنتجات =================
export async function listProducts() { return (await getDB()).products; }
export async function getProduct(idOrSlug: string) {
  const db = await getDB();
  return db.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
}
export type ProductInput = Partial<Product> & { name: string; slug?: string };

export async function saveProduct(input: ProductInput, actor?: string) {
  return mutate((db) => {
    const t = nowISO();
    if (input.id) {
      const i = db.products.findIndex((p) => p.id === input.id);
      if (i < 0) throw new Error("المنتج غير موجود");
      // الرابط يتولد تلقائياً من اسم المنتج ما لم يُمرر صراحة
      let slug = input.slug ? slugify(input.slug) : slugify(input.name || db.products[i].name);
      if (db.products.some((p) => p.slug === slug && p.id !== input.id)) slug += `-${Date.now() % 10000}`;
      db.products[i] = {
        ...db.products[i], ...input,
        slug,
        landing: { ...db.products[i].landing, ...(input.landing ?? {}) },
        updatedAt: t,
      } as Product;
      audit(db, "update", "product", input.id, input.name, actor);
      return db.products[i];
    }
    let slug = slugify(input.slug || input.name);
    if (db.products.some((p) => p.slug === slug)) slug += `-${Date.now() % 10000}`;
    const p: Product = {
      id: uid(), slug, name: input.name,
      shortDescription: input.shortDescription ?? "", description: input.description ?? "",
      images: input.images ?? [], videos: input.videos ?? [],
      sku: input.sku || `DEK-${Date.now()}`, price: input.price ?? 0, costPrice: input.costPrice ?? 0,
      compareAtPrice: input.compareAtPrice,
      stock: input.stock ?? 0, lowStockThreshold: input.lowStockThreshold ?? db.settings.lowStockDefault,
      variants: input.variants ?? [], published: input.published ?? false,
      landing: input.landing ?? defaultLanding(input.name),
      orderForm: input.orderForm ?? { showQuantity: true, quantityDefault: 1, showNotes: true, requireVariant: false, ctaText: "تأكيد الطلب" },
      createdAt: t, updatedAt: t,
    };
    db.products.unshift(p);
    audit(db, "create", "product", p.id, p.name, actor);
    return p;
  });
}

export async function deleteProduct(id: string, actor?: string) {
  return mutate((db) => {
    db.products = db.products.filter((p) => p.id !== id);
    audit(db, "delete", "product", id, undefined, actor);
  });
}

export async function duplicateProduct(id: string, actor?: string) {
  return mutate((db) => {
    const src = db.products.find((p) => p.id === id);
    if (!src) throw new Error("غير موجود");
    const t = nowISO();
    const copy: Product = {
      ...JSON.parse(JSON.stringify(src)),
      id: uid(), slug: `${src.slug}-copy-${Date.now() % 10000}`, name: `${src.name} (نسخة)`,
      published: false, createdAt: t, updatedAt: t,
      variants: src.variants.map((v) => ({ ...v, id: uid(), sku: `${v.sku}-C` })),
    };
    db.products.unshift(copy);
    audit(db, "duplicate", "product", copy.id, copy.name, actor);
    return copy;
  });
}

/** حركة مخزون + تحديث الكمية */
export async function addInventory(productId: string, variantId: string | undefined, type: InventoryMovement["type"], quantity: number, reason: string, actor?: string, orderId?: string) {
  return mutate((db) => {
    const p = db.products.find((x) => x.id === productId);
    if (!p) throw new Error("المنتج غير موجود");
    const mv: InventoryMovement = { id: uid(), productId, variantId, type, quantity, reason, orderId, createdAt: nowISO(), createdBy: actor };
    db.inventory.unshift(mv);
    const delta = type === "in" || type === "return" ? quantity : type === "out" ? -quantity : quantity; // adjustment = set? ن treat as delta
    if (variantId) {
      const v = p.variants.find((x) => x.id === variantId);
      if (v) v.stock = Math.max(0, v.stock + delta);
    } else {
      p.stock = Math.max(0, p.stock + delta);
    }
    p.updatedAt = nowISO();
    audit(db, "inventory", "product", productId, `${type} ${quantity} — ${reason}`, actor);
    return mv;
  });
}

/** الكمية المتاحة = المخزون - المحجوز في طلبات غير ملغاة/مرجعة */
export function availableStock(product: Product, variantId?: string, orders?: Order[]): number {
  const base = variantId ? product.variants.find((v) => v.id === variantId)?.stock ?? 0 : product.stock;
  const all = orders ?? [];
  const reserved = all
    .filter((o) => !["cancelled", "returned"].includes(o.status))
    .flatMap((o) => o.items)
    .filter((i) => i.productId === product.id && (!variantId || i.variantId === variantId))
    .reduce((s, i) => s + i.quantity, 0);
  return base - reserved;
}
