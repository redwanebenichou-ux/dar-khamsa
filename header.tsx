import { Phone, Truck } from "lucide-react";
import type { Settings } from "@/lib/types";

export default function Header({ settings, promoText }: { settings: Settings; promoText?: string }) {
  return (
    <header className="sticky top-0 z-40">
      {/* الشريط العلوي الداكن */}
      <div className="bg-brown text-cream text-[11px] md:text-xs">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between gap-3">
          <a href={`tel:${settings.storePhone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 font-bold hover:text-lightgold transition" dir="ltr">
            <Phone className="w-3.5 h-3.5 text-gold" /> {settings.storePhone}
          </a>
          <span className="hidden sm:flex items-center gap-1.5 text-cream/80">
            <Truck className="w-3.5 h-3.5 text-gold" /> توصيل سريع إلى جميع ولايات الجزائر
          </span>
          {promoText && <span className="text-lightgold font-black truncate">🔥 {promoText}</span>}
        </div>
      </div>
      {/* الشريط الرئيسي */}
      <div className="bg-cream/95 backdrop-blur border-b border-brown/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.png" alt={settings.storeName} className="h-10 w-10 md:h-12 md:w-12 object-contain" />
            <div className="leading-none">
              <div className="font-black text-brown text-base md:text-lg">دار الخماسة</div>
              <div className="text-[9px] md:text-[10px] text-golddark font-bold tracking-wide mt-0.5">DAR EL KHAMASA</div>
            </div>
          </a>
          <div className="flex items-center gap-2">
            <a href="#order" className="btn-gold !px-5 !py-2 !text-sm">اطلب الآن</a>
          </div>
        </div>
      </div>
    </header>
  );
}
