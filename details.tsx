import { ListChecks } from "lucide-react";
import type { Product } from "@/lib/types";
import { SectionTitle } from "./ornament";

export default function Details({ product }: { product: Product }) {
  const specs = product.landing.specs.filter(Boolean);
  return (
    <section className="bg-cream py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4">
        <SectionTitle title="تفاصيل المنتج" sub="كل ما تحتاج معرفته قبل الطلب" />
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 bg-white rounded-2xl border border-gold/20 p-6 shadow-card">
            <h3 className="font-black text-brown text-lg mb-3">وصف المنتج</h3>
            <p className="text-sm md:text-[15px] leading-loose text-brown/70 whitespace-pre-line">{product.description || product.shortDescription}</p>
          </div>
          {specs.length > 0 && (
            <div className="md:col-span-2 bg-brown rounded-2xl p-6 shadow-card">
              <h3 className="font-black text-lightgold text-lg mb-3 flex items-center gap-2"><ListChecks className="w-5 h-5" /> المواصفات</h3>
              <ul className="space-y-2.5">
                {specs.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-cream/85 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
