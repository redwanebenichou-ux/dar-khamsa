import type { Product } from "@/lib/types";
import { SectionTitle } from "./ornament";

export default function Faq({ product }: { product: Product }) {
  const items = product.landing.faq.filter((f) => f.q || f.a);
  if (!items.length) return null;
  return (
    <section className="bg-cream py-12 md:py-16">
      <div className="max-w-3xl mx-auto px-4">
        <SectionTitle title="أسئلة شائعة" sub="كل ما تريد معرفته قبل الطلب" />
        <div className="space-y-2.5">
          {items.map((it, i) => (
            <details key={i} className="group bg-white border border-gold/20 rounded-xl px-5 py-4 shadow-card open:bg-warmbeige/40 transition">
              <summary className="cursor-pointer font-extrabold text-brown text-sm md:text-base flex justify-between items-center gap-3">
                {it.q}
                <span className="text-golddark text-xl font-black group-open:rotate-45 transition-transform shrink-0">+</span>
              </summary>
              <p className="mt-2.5 text-sm text-brown/65 leading-relaxed">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
