type ClassValue = string | number | null | false | undefined | ClassValue[] | Record<string, unknown>;
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v) return;
    if (typeof v === "string" || typeof v === "number") out.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "object") for (const k in v) if ((v as Record<string, unknown>)[k]) out.push(k);
  };
  inputs.forEach(walk);
  return out.join(" ");
}

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const nowISO = () => new Date().toISOString();

export function money(n: number, currency = "دج") {
  return `${(Math.round(n * 100) / 100).toLocaleString("ar-DZ")} ${currency}`;
}

export function slugify(s: string) {
  return s.trim().toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `p-${Date.now()}`;
}

export function safePhone(p: string) { return p.replace(/[^0-9+]/g, ""); }

export function statusLabel(s: string) {
  const map: Record<string, string> = {
    waiting: "في انتظار التأكيد", attempt1: "فشل التأكيد الأول",
    attempt2: "فشل التأكيد الثاني", attempt3: "فشل التأكيد الثالث",
    confirmed: "مؤكد", cancelled: "ملغى",
  };
  return map[s] ?? s;
}

export function statusLabelFr(s: string) {
  const map: Record<string, string> = {
    waiting: "En attente de confirmation", attempt1: "1er échec d'appel",
    attempt2: "2e échec d'appel", attempt3: "3e échec d'appel",
    confirmed: "Confirmé", cancelled: "Annulé",
  };
  return map[s] ?? s;
}

export function statusColor(s: string) {
  const map: Record<string, string> = {
    waiting: "bg-blue-100 text-blue-800",
    attempt1: "bg-orange-100 text-orange-800",
    attempt2: "bg-orange-200 text-orange-900",
    attempt3: "bg-red-100 text-red-700",
    confirmed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-gray-200 text-gray-700",
  };
  return map[s] ?? "bg-gray-100 text-gray-700";
}

/** حالات شركة التوصيل (مطبعة من dzship) → عربية + ألوان */
export function courierStatusLabel(s: string) {
  const map: Record<string, string> = {
    created: "تم التسجيل", pending_pickup: "في انتظار الاستلام",
    picked_up: "تم الاستلام من المتجر", in_transit: "قيد النقل",
    at_hub: "في مركز الفرز", out_for_delivery: "خرج للتوصيل",
    delivery_attempted: "محاولة تسليم فاشلة", delivered: "تم التوصيل",
    on_hold: "معلّق", return_in_transit: "الإرجاع قيد النقل",
    returned: "مرتجع", cancelled: "ملغى", lost: "مفقود", unknown: "حالة غير معروفة",
  };
  return map[s] ?? s;
}

export function courierStatusColor(s: string) {
  const map: Record<string, string> = {
    created: "bg-blue-100 text-blue-800", pending_pickup: "bg-amber-100 text-amber-800",
    picked_up: "bg-cyan-100 text-cyan-800", in_transit: "bg-indigo-100 text-indigo-800",
    at_hub: "bg-indigo-100 text-indigo-800", out_for_delivery: "bg-teal-100 text-teal-800",
    delivery_attempted: "bg-orange-100 text-orange-800", delivered: "bg-green-100 text-green-800",
    on_hold: "bg-amber-100 text-amber-800", return_in_transit: "bg-orange-100 text-orange-800",
    returned: "bg-red-100 text-red-700", cancelled: "bg-gray-200 text-gray-700",
    lost: "bg-red-100 text-red-700", unknown: "bg-gray-100 text-gray-700",
  };
  return map[s] ?? "bg-gray-100 text-gray-700";
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${d} يوم`;
  return new Date(iso).toLocaleDateString("ar-DZ");
}
