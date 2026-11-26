// ===== خدمات الطلبات والعملاء =====
import { getDB, mutate } from "@/lib/db/store";
import type { Order, OrderStatus, OrderItem, CallLog, Customer, StatusEvent, Shipment, UtmTag } from "@/lib/types";
import { uid, nowISO, safePhone } from "@/lib/utils";
import { WILAYAS } from "@/lib/wilayas";
import { audit, availableStock } from "@/lib/services";
import { computeShipping } from "@/lib/services-shipping";

export interface SubmitInput {
  productSlug: string;
  variantId?: string;
  quantity: number;
  firstName: string; lastName: string; phone: string;
  wilayaCode: number; commune: string; address: string;
  notes?: string;
  method: "home" | "stopdesk";
  coupon?: string;
  utm?: UtmTag;
  ip?: string; userAgent?: string;
}

const DUP_WINDOW_MS = 15 * 60 * 1000;

export async function submitOrder(input: SubmitInput) {
  return mutate((db) => {
    // صفحة الهبوط = slug المنتج نفسه
    const product = db.products.find((p) => p.slug === input.productSlug && p.published);
    if (!product) throw new Error("المنتج غير متاح");
    const productId = product.id;

    const phone = safePhone(input.phone);
    if (phone.replace(/\D/g, "").length < 8) throw new Error("رقم الهاتف غير صالح");
    const qty = Math.max(1, Math.min(50, Math.floor(input.quantity) || 1));

    // منع الطلبات المكررة: نفس الهاتف + نفس المنتج خلال 15 دقيقة
    const recent = db.orders.find((o) =>
      o.customer.phone === phone &&
      o.items.some((i) => i.productId === product.id) &&
      Date.now() - new Date(o.createdAt).getTime() < DUP_WINDOW_MS &&
      !["cancelled", "returned"].includes(o.status)
    );
    if (recent) {
      audit(db, "duplicate_blocked", "order", recent.id, `محاولة مكررة من ${phone}`);
      return { duplicate: true, order: recent };
    }

    // منع البيع الزائد — فحص المخزون المتاح
    let variantName: string | undefined;
    let unitPrice = product.price;
    let costPrice = product.costPrice;
    let variantId: string | undefined;
    if (input.variantId) {
      const v = product.variants.find((x) => x.id === input.variantId);
      if (!v) throw new Error("الخيار المحدد غير موجود");
      variantId = v.id; variantName = [v.size, v.color].filter(Boolean).join(" / ");
      unitPrice += v.priceDelta;
    }
    const avail = availableStock(product, variantId, db.orders);
    if (avail < qty) throw new Error(`الكمية المتاحة حالياً: ${Math.max(0, avail)}`);

    const wilaya = WILAYAS.find((w) => w.code === input.wilayaCode);
    const item: OrderItem = {
      productId: product.id, productName: product.name, sku: variantId ? product.variants.find((v) => v.id === variantId)!.sku : product.sku,
      variantId, variantName, quantity: qty, unitPrice, costPrice,
    };
    const subtotal = unitPrice * qty;

    // الخصم من العروض النشطة
    let discount = 0;
    const offer = db.offers.find((o) => o.active && (o.code ? o.code === input.coupon : true) &&
      (o.productIds.length === 0 || o.productIds.includes(product.id)) &&
      (!o.start || new Date(o.start) <= new Date()) && (!o.end || new Date(o.end) >= new Date()));
    if (offer) discount = offer.type === "percent" ? Math.round(subtotal * offer.value / 100) : Math.min(offer.value, subtotal);

    const ship = computeShipping(db, input.wilayaCode, input.method, subtotal - discount, [product.id]);
    const total = Math.max(0, subtotal - discount + ship.fee);

    // العميل (upsert حسب الهاتف)
    let customer = db.customers.find((c) => c.phone === phone);
    const t = nowISO();
    if (!customer) {
      customer = {
        id: uid(), firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone,
        wilaya: wilaya?.ar, wilayaCode: input.wilayaCode, commune: input.commune, address: input.address,
        ordersCount: 0, totalSpent: 0, createdAt: t, updatedAt: t,
      };
      db.customers.unshift(customer);
    } else {
      customer.firstName = input.firstName.trim() || customer.firstName;
      customer.lastName = input.lastName.trim() || customer.lastName;
      customer.wilaya = wilaya?.ar ?? customer.wilaya;
      customer.wilayaCode = input.wilayaCode;
      customer.commune = input.commune;
      customer.address = input.address || customer.address;
      customer.updatedAt = t;
    }

    db.seq.order += 1;
    const order: Order = {
      id: uid(), number: `${db.settings.orderNumberPrefix}-${db.seq.order}`,
      customerId: customer.id,
      customer: {
        firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone,
        wilaya: wilaya?.ar ?? String(input.wilayaCode), wilayaCode: input.wilayaCode,
        commune: input.commune, address: input.address, notes: input.notes,
      },
      items: [item],
      method: input.method,
      shippingFee: ship.fee, discount, subtotal, total,
      status: "waiting",
      statusHistory: [{ at: t, to: "waiting" } as StatusEvent],
      callLogs: [],
      attribution: { ...input.utm, landing: `/p/${input.productSlug}` },
      ip: input.ip, userAgent: input.userAgent,
      createdAt: t, updatedAt: t,
    };
    db.orders.unshift(order);
    audit(db, "order_created", "order", order.id, order.number);
    return { duplicate: false, order };
  });
}

export async function listOrders(status?: OrderStatus | "all") {
  const orders = (await getDB()).orders;
  return status && status !== "all" ? orders.filter((o) => o.status === status) : orders;
}

export async function getOrder(id: string) { return (await getDB()).orders.find((o) => o.id === id) ?? null; }

export async function setOrderStatus(id: string, to: OrderStatus, note?: string, actor?: string) {
  return mutate((db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) throw new Error("الطلب غير موجود");
    const from = o.status;
    o.status = to;
    o.statusHistory.push({ at: nowISO(), from, to, note, by: actor });
    o.updatedAt = nowISO();
    if (to === "confirmed" && !o.confirmedAt) o.confirmedAt = nowISO();
    // حركة المخزون عند التأكيد (بيع فعلي) — الإلغاء يعيدها
    if (to === "confirmed") {
      for (const i of o.items) {
        const p = db.products.find((x) => x.id === i.productId);
        if (p) {
          if (i.variantId) { const v = p.variants.find((x) => x.id === i.variantId); if (v) v.stock = Math.max(0, v.stock - i.quantity); }
          else p.stock = Math.max(0, p.stock - i.quantity);
          db.inventory.unshift({ id: uid(), productId: p.id, variantId: i.variantId, type: "out", quantity: i.quantity, reason: `بيع — طلب ${o.number}`, orderId: o.id, createdAt: nowISO(), createdBy: actor });
        }
      }
    }
    if (to === "cancelled") {
      for (const i of o.items) {
        const p = db.products.find((x) => x.id === i.productId);
        if (p) {
          if (i.variantId) { const v = p.variants.find((x) => x.id === i.variantId); if (v) v.stock += i.quantity; }
          else p.stock += i.quantity;
          db.inventory.unshift({ id: uid(), productId: p.id, variantId: i.variantId, type: "return", quantity: i.quantity, reason: `إلغاء — طلب ${o.number}`, orderId: o.id, createdAt: nowISO(), createdBy: actor });
        }
      }
    }
    // تحديث إحصائيات العميل (المشتريات الفعلية = طلبات بها deliveredAt)
    const c = db.customers.find((x) => x.id === o.customerId);
    if (c) {
      c.ordersCount = db.orders.filter((x) => x.customerId === c.id).length;
      c.totalSpent = db.orders.filter((x) => x.customerId === c.id && x.deliveredAt).reduce((s, x) => s + x.total, 0);
      c.updatedAt = nowISO();
    }
    audit(db, "status", "order", o.id, `${from} → ${to}${note ? ` (${note})` : ""}`, actor);
    return o;
  });
}

export async function addCallLog(orderId: string, log: Omit<CallLog, "id" | "at">, actor?: string) {
  return mutate((db) => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new Error("غير موجود");
    const entry: CallLog = { id: uid(), at: nowISO(), ...log };
    o.callLogs.unshift(entry);
    o.updatedAt = nowISO();
    audit(db, "call", "order", o.id, `${log.result}${log.note ? ` — ${log.note}` : ""}`, actor);
    return o;
  });
}

export async function listCustomers() {
  const db = await getDB();
  return db.customers.map((c) => ({
    ...c,
    orders: db.orders.filter((o) => o.customerId === c.id),
  }));
}

export async function getCustomer(id: string) {
  const db = await getDB();
  const c = db.customers.find((x) => x.id === id);
  if (!c) return null;
  return { customer: c, orders: db.orders.filter((o) => o.customerId === id) };
}

export async function updateCustomerNotes(id: string, notes: string) {
  return mutate((db) => {
    const c = db.customers.find((x) => x.id === id);
    if (!c) throw new Error("غير موجود");
    c.notes = notes;
    c.updatedAt = nowISO();
    return c;
  });
}
