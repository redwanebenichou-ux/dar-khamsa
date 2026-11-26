"use client";
import { useEffect, useState } from "react";
import { Phone, MapPin, Package, ShieldCheck, Truck, Loader2, CheckCircle2, ShoppingBag, Minus, Plus } from "lucide-react";
import type { Product, ShippingRate } from "@/lib/types";
import { WILAYAS } from "@/lib/wilayas";
import { money, cn } from "@/lib/utils";
import { submitOrderPublic, trackViewPublic } from "@/lib/actions";

function getUtm() {
  if (typeof document === "undefined") return undefined;
  const get = (k: string) => document.cookie.split("; ").find((c) => c.startsWith(k + "="))?.split("=")[1];
  const u = { source: get("utm_source"), medium: get("utm_medium"), campaign: get("utm_campaign"), content: get("utm_content"), term: get("utm_term") };
  return Object.values(u).some(Boolean) ? u : undefined;
}

interface Props {
  product: Product;
  rates: ShippingRate[];
  defaultShipping: { home: number; stopDesk: number };
  freeStopDesk?: boolean;
  freeStopDeskAdvertising?: boolean;
  hideDeliveryMethodIcons?: boolean;
}

/** نموذج الطلب المختصر — فقط: الاسم واللقب، الهاتف، الولاية، البلدية، الكمية، طريقة التوصيل، الإجمالي */
export default function OrderForm({ product, rates, defaultShipping, freeStopDesk = false, freeStopDeskAdvertising = true, hideDeliveryMethodIcons = true }: Props) {
  const [f, setF] = useState({
    firstName: "", lastName: "", phone: "", wilayaCode: 16, commune: "",
    quantity: product.orderForm.quantityDefault || 1, method: "home" as "home" | "stopdesk",
  });
  const [variantId, setVariantId] = useState<string | undefined>(product.variants?.[0]?.id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => { trackViewPublic(product.slug, product.id, getUtm()).catch(() => {}); }, [product.slug, product.id]);

  const wilaya = WILAYAS.find((w) => w.code === f.wilayaCode);
  const variants = product.variants ?? [];
  const sizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[];
  const colors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[];
  const colorHex: Record<string, string> = {
    "أسود": "#000000", "أبيض": "#FFFFFF", "بيج": "#F5E7D7", "بني": "#21160F",
    "ذهبي": "#C99A45", "وردي": "#F4A6B8", "أزرق": "#3B82F6", "أخضر": "#22C55E",
    "أحمر": "#EF4444", "رمادي": "#9CA3AF", "كحلي": "#1E3A8A", "بمبي": "#F9A8D4",
  };
  const selectedVariant = variants.find((v) => v.id === variantId);
  const unitPrice = product.price;
  const subtotal = unitPrice * f.quantity;
  const rate = rates.find((r) => r.wilayaCode === f.wilayaCode);
  const shipFee = (f.method === "stopdesk" && freeStopDesk) ? 0 : (f.method === "home" ? (rate?.home ?? defaultShipping.home) : (rate?.stopDesk ?? defaultShipping.stopDesk));
  const discountPct = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;

  const set = (k: string, v: unknown) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (f.firstName.trim().length < 2) e.firstName = "أدخل الاسم";
    if (f.lastName.trim().length < 2) e.lastName = "أدخل اللقب";
    const digits = f.phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 12 || !/^(05|06|07)/.test(digits)) e.phone = "أدخل رقم هاتف جزائري صحيح (05/06/07)";
    if (!f.commune) e.commune = "اختر البلدية";
    if (variants.length > 0 && !variantId) e.variant = "اختر المقاس واللون";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await submitOrderPublic({
        productSlug: product.slug,
        variantId,
        quantity: f.quantity, firstName: f.firstName, lastName: f.lastName, phone: f.phone,
        wilayaCode: f.wilayaCode, commune: f.commune, address: "",
        method: f.method, utm: getUtm(),
      });
      setDone(res.order!.number);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "تعذر إرسال الطلب — تحقق من الاتصال وحاول مجدداً");
    } finally { setLoading(false); }
  }

  if (done) {
    return (
      <div className="bg-cream rounded-2xl md:rounded-3xl p-8 md:p-10 text-center shadow-pop border border-gold/30 fade-up" id="order">
        <CheckCircle2 className="w-16 h-16 text-golddark mx-auto" />
        <h3 className="text-2xl md:text-3xl font-black text-brown mt-4">تم استلام طلبك بنجاح!</h3>
        <p className="mt-3 text-brown/70">رقم الطلب: <span className="font-black text-golddark text-lg">{done}</span></p>
        <p className="mt-1 text-sm text-brown/60">سنتصل بك على <span className="font-bold text-brown" dir="ltr">{f.phone}</span> لتأكيد الطلب قبل الشحن.</p>
        <div className="mt-5 inline-flex items-center gap-2 bg-gold/15 text-golddark font-black text-sm rounded-full px-5 py-2.5">
          <ShieldCheck className="w-4 h-4" /> الدفع عند الاستلام — لا تدفع شيئاً الآن
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-cream rounded-2xl md:rounded-3xl p-5 md:p-7 shadow-pop border border-gold/30" id="order" noValidate>
      <div className="flex items-center gap-2.5 border-b border-brown/10 pb-3.5 mb-4">
        <ShoppingBag className="w-5 h-5 text-golddark" />
        <h3 className="text-lg md:text-xl font-black text-brown">نموذج الطلب</h3>
        {discountPct > 0 && <span className="bg-brown text-lightgold text-[11px] font-black rounded-full px-2.5 py-1">خصم {discountPct}%</span>}
      </div>

      {/* الاسم واللقب */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <input className="input" placeholder="الاسم" value={f.firstName} onChange={(e) => set("firstName", e.target.value)} />
          {errors.firstName && <p className="text-red-600 text-[11px] font-bold mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <input className="input" placeholder="اللقب" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} />
          {errors.lastName && <p className="text-red-600 text-[11px] font-bold mt-1">{errors.lastName}</p>}
        </div>
      </div>

      {/* رقم الهاتف */}
      <div className="relative mt-2.5">
        <Phone className="w-4 h-4 absolute top-3.5 right-3 text-brown/35" />
        <input className="input !pr-9" dir="ltr" type="tel" inputMode="numeric" placeholder="رقم الهاتف 05 XX XX XX XX" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        {errors.phone && <p className="text-red-600 text-[11px] font-bold mt-1">{errors.phone}</p>}
      </div>

      {/* الولاية والبلدية */}
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        <div className="relative">
          <MapPin className="w-4 h-4 absolute top-3.5 right-3 text-brown/35" />
          <select className="input !pr-9" value={f.wilayaCode} onChange={(e) => setF((s) => ({ ...s, wilayaCode: +e.target.value, commune: "" }))}>
            {WILAYAS.map((w) => <option key={w.code} value={w.code}>{w.code} — {w.ar}</option>)}
          </select>
        </div>
        <div>
          <select className={cn("input", errors.commune && "!border-red-400")} value={f.commune} onChange={(e) => set("commune", e.target.value)}>
            <option value="">البلدية...</option>
            {wilaya?.communes.map((c) => <option key={c.id} value={c.ar}>{c.ar}</option>)}
          </select>
          {errors.commune && <p className="text-red-600 text-[11px] font-bold mt-1">{errors.commune}</p>}
        </div>
      </div>

      {/* المتغيرات (المقاس / اللون) */}
      {variants.length > 0 && (
        <div className="mt-3 space-y-2">
          {sizes.length > 0 && (
            <div>
              <label className="label">المقاس</label>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => {
                  const avail = variants.some((v) => v.size === s && v.stock > 0);
                  const sel = selectedVariant?.size === s;
                  return (
                    <button key={s} type="button" disabled={!avail}
                      onClick={() => {
                        const match = variants.find((v) => v.size === s && (selectedVariant?.color ? v.color === selectedVariant.color : true));
                        setVariantId(match?.id ?? variants.find((v) => v.size === s)?.id);
                      }}
                      className={cn("px-3 py-1.5 rounded-full text-xs md:text-sm font-bold border transition min-w-[44px] text-center",
                        !avail ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" :
                        sel ? "bg-gold text-brown border-gold" : "bg-white text-brown/60 border-brown/15 hover:border-gold")}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {colors.length > 0 && (
            <div>
              <label className="label">اللون</label>
              <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => {
                  const avail = variants.some((v) => v.color === c && v.stock > 0);
                  const sel = selectedVariant?.color === c;
                  return (
                    <button key={c} type="button" disabled={!avail}
                      onClick={() => {
                        const match = variants.find((v) => v.color === c && (selectedVariant?.size ? v.size === selectedVariant.size : true));
                        setVariantId(match?.id ?? variants.find((v) => v.color === c)?.id);
                      }}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-bold border transition min-w-[44px] justify-center",
                        !avail ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" :
                        sel ? "bg-gold text-brown border-gold" : "bg-white text-brown/60 border-brown/15 hover:border-gold")}>
                      <span className="w-3 h-3 rounded-full border border-brown/20" style={{ backgroundColor: colorHex[c] || "#999" }} />
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {selectedVariant && (
            <div className="flex items-center gap-2 text-xs font-bold text-brown/60">
              <span className="text-golddark">✓ {selectedVariant.size}{selectedVariant.color ? ` — ${selectedVariant.color}` : ""}</span>
            </div>
          )}
          {errors.variant && <p className="text-red-600 text-[11px] font-bold mt-1">{errors.variant}</p>}
        </div>
      )}

      {/* الكمية */}
      <div className="mt-3">
        <label className="label">الكمية</label>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost !px-3 !py-1.5 !text-brown" onClick={() => set("quantity", Math.max(1, f.quantity - 1))}><Minus className="w-4 h-4" /></button>
          <input className="input text-center w-16 !py-2" type="number" min={1} max={50} value={f.quantity} onChange={(e) => set("quantity", +e.target.value)} />
          <button type="button" className="btn-ghost !px-3 !py-1.5 !text-brown" onClick={() => set("quantity", Math.min(50, f.quantity + 1))}><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* طريقة التوصيل */}
      {f.method === "stopdesk" && (freeStopDesk || shipFee === 0) && freeStopDeskAdvertising && (
        <div className="mt-2 rounded-xl bg-gradient-to-r from-gold/20 to-emerald-100 border-2 border-gold text-brown text-sm font-black px-4 py-3 flex items-center justify-center gap-2 shadow-sm animate-pulse">
          🎉 توصيل مجاني إلى المكتب — بدون أي تكلفة!
        </div>
      )}
      <div className="mt-3">
        <label className="label">طريقة التوصيل</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => set("method", "home")} className={cn("btn-ghost !text-brown !justify-center", f.method === "home" && "!border-gold !bg-gold/15 !font-black")}>
            {!hideDeliveryMethodIcons && f.method === "home" && <Truck className="w-4 h-4 text-golddark" />}
            {f.method === "home" && <CheckCircle2 className="w-4 h-4 text-golddark" />} إلى المنزل
          </button>
          <button type="button" onClick={() => set("method", "stopdesk")} className={cn("btn-ghost !text-brown !justify-center", f.method === "stopdesk" && "!border-gold !bg-gold/15 !font-black")}>
            {!hideDeliveryMethodIcons && f.method === "stopdesk" && <Package className="w-4 h-4 text-golddark" />}
            {f.method === "stopdesk" && <CheckCircle2 className="w-4 h-4 text-golddark" />} التوصيل إلى المكتب
          </button>
        </div>
      </div>

      {/* الإجمالي */}
      <div className="mt-4 rounded-xl bg-warmbeige border border-gold/25 p-3.5 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-brown/60">المنتج ({f.quantity} × {money(unitPrice)})</span><span className="font-bold text-brown">{money(subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-brown/60">التوصيل — {wilaya?.ar}</span><span className="font-bold text-brown">{money(shipFee)}</span></div>
        <div className="flex justify-between border-t border-brown/15 pt-1.5 text-base"><span className="font-black text-brown">الإجمالي</span><span className="font-black text-golddark text-lg">{money(subtotal + shipFee)}</span></div>
      </div>

      {serverError && <div className="mt-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold p-3">{serverError}</div>}

      <button type="submit" disabled={loading} className="btn-gold w-full !py-4 !text-base md:!text-lg !rounded-xl mt-4 cta-pulse">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (product.orderForm.ctaText || "تأكيد الطلب")}
      </button>
      <p className="mt-2.5 text-center text-[11px] font-bold text-brown/50 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5" /> الدفع عند الاستلام — تفاصيل الطلب تُأكَّد معك هاتفياً
      </p>
    </form>
  );
}

/** شريط طلب ثابت للموبايل — يختفي عند وصول النموذج */
export function StickyOrderBar({ product }: { product: Product }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = document.getElementById("order");
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  if (hidden) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-brown/95 backdrop-blur border-t border-gold/30 px-4 py-2.5 flex items-center gap-3 shadow-pop">
      <div className="min-w-0 flex-1">
        <div className="text-cream text-xs font-black truncate">{product.name}</div>
        <div className="text-gold text-sm font-black">{product.price.toLocaleString("ar-DZ")} دج</div>
      </div>
      <a href="#order" className="btn-gold !px-5 !py-2.5 !text-sm shrink-0 rounded-xl">اطلب الآن</a>
    </div>
  );
}
