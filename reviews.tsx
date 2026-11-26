import { Star } from "lucide-react";
import type { Review } from "@/lib/types";
import { SectionTitle } from "./ornament";

export default function Reviews({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <section id="reviews" className="bg-white py-12 md:py-16 border-y border-brown/5">
      <div className="max-w-6xl mx-auto px-4">
        <SectionTitle title="آراء عملائنا" sub="ماذا يقول من جرّب منتجنا" />
        <div className="grid md:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <figure key={r.id} className="bg-cream rounded-2xl border border-gold/20 p-5 shadow-card">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-gold text-gold" : "text-brown/20"}`} />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-brown/80">"{r.text}"</blockquote>
              <figcaption className="mt-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gold/20 text-golddark flex items-center justify-center text-xs font-black">
                  {r.author.trim().charAt(0) || "؟"}
                </span>
                <span className="text-xs font-black text-brown">{r.author}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
