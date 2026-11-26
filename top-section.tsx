"use client";
import { useState } from "react";
import { X, ZoomIn, Play, ShieldCheck, ArrowLeft, BadgeCheck, Star, Truck, Package } from "lucide-react";
import type { Product } from "@/lib/types";
import { money, cn } from "@/lib/utils";

/** القسم العلوي: الاسم + السعر → الصورة → زر الطلب (ينقل مباشرة للنموذج الذي يليه) */
export default function TopSection({ product, rating, reviewsCount }: { product: Product; rating: number; reviewsCount: number }) {
  const images = product.images.map((i) => i.url);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [video, setVideo] = useState(false);
  const discount = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const img = images[active] || "/logo.png";

  return (
    <section id="top" className="bg-cream relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-warmbeige/60 blur-3xl pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-6 text-center">
        {/* الاسم والسعر أعلى الصفحة */}
        {product.landing.badge && (
          <span className="inline-flex items-center gap-1.5 bg-gold/15 text-golddark border border-gold/30 rounded-full px-3.5 py-1 text-xs font-black">
            <BadgeCheck className="w-3.5 h-3.5" /> {product.landing.badge}
          </span>
        )}
        <h1 className="mt-3 text-3xl md:text-5xl font-black text-brown leading-tight tracking-tight">{product.name}</h1>
        {reviewsCount > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("w-3.5 h-3.5", i < Math.round(rating) ? "fill-gold text-gold" : "text-brown/20")} />)}
            </div>
            <span className="text-xs font-bold text-brown/55">{rating.toFixed(1)} ({reviewsCount})</span>
          </div>
        )}
        <div className="mt-3 flex flex-col items-center gap-2 price-pop">
          {discount > 0 && <span className="bg-red-600 text-white rounded-full px-4 py-1.5 text-sm font-black shadow-md">خصم {discount}%</span>}
          <div className="flex items-end justify-center gap-3 flex-wrap">
            <span className="text-4xl md:text-5xl font-black tracking-tight text-brown">{money(product.price)}</span>
            {product.compareAtPrice && <span className="text-xl md:text-2xl text-brown/35 line-through font-bold">{money(product.compareAtPrice)}</span>}
          </div>
        </div>
      </div>

      {/* الصورة */}
      <div className="relative max-w-2xl mx-auto px-4">
        <div className="relative bg-warmbeige rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-card border border-gold/20">
          <button onClick={() => setZoom(true)} className="relative block w-full group" title="اضغط للتكبير">
            {video && product.videos[0] ? (
              <video src={product.videos[0]} controls autoPlay className="w-full aspect-[4/3] object-cover rounded-xl md:rounded-2xl bg-brown" />
            ) : (
              <img src={img} alt={product.name} loading="lazy" decoding="async" className="w-full h-auto max-h-[60vh] object-contain rounded-xl md:rounded-2xl bg-warmbeige" />
            )}
            {!video && (
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-brown/80 text-cream text-[11px] font-bold rounded-full px-3 py-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <ZoomIn className="w-3.5 h-3.5" /> اضغط للتكبير
              </span>
            )}
          </button>
          {(images.length > 1 || product.videos[0]) && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button key={i} onClick={() => { setActive(i); setVideo(false); }}
                  className={cn("w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden shrink-0 border-2 transition", active === i && !video ? "border-gold" : "border-transparent opacity-70 hover:opacity-100")}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {product.videos[0] && (
                <button onClick={() => setVideo(true)}
                  className={cn("w-14 h-14 md:w-16 md:h-16 rounded-lg shrink-0 border-2 flex items-center justify-center bg-brown text-cream transition", video ? "border-gold" : "border-transparent opacity-70 hover:opacity-100")}>
                  <Play className="w-5 h-5 fill-cream" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* زر الطلب */}
      <div className="relative max-w-2xl mx-auto px-4 mt-5 text-center">
        <a href="#order" className="btn-gold w-full !py-4 !text-base md:!text-lg !rounded-xl shadow-pop cta-pulse">
          اطلب الآن <ArrowLeft className="w-5 h-5" />
        </a>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-brown/55">
          <ShieldCheck className="w-4 h-4 text-golddark" /> الدفع عند الاستلام — بدون دفع مسبق
        </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-brown/60">
        <span className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1.5 shadow-sm"><Truck className="w-3.5 h-3.5 text-golddark" /> توصيل 24-48 ساعة</span>
        <span className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1.5 shadow-sm"><ShieldCheck className="w-3.5 h-3.5 text-golddark" /> ضمان الجودة</span>
        <span className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1.5 shadow-sm"><Package className="w-3.5 h-3.5 text-golddark" /> تغليف آمن</span>
      </div>
      </div>

      {/* Lightbox */}
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-brown/90 backdrop-blur flex items-center justify-center p-4" onClick={() => setZoom(false)}>
          <button className="absolute top-4 left-4 text-cream hover:text-gold"><X className="w-8 h-8" /></button>
          <img src={img} alt={product.name} className="max-w-full max-h-[85vh] rounded-2xl shadow-pop" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}