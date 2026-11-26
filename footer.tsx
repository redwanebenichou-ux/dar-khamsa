import { Facebook, Instagram, Youtube, Phone, MapPin, Music2 } from "lucide-react";
import type { Settings } from "@/lib/types";
import { Ornament } from "./ornament";

export default function Footer({ settings }: { settings: Settings }) {
  const s = settings.socials ?? {};
  return (
    <footer id="contact" className="bg-brown text-cream">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt={settings.storeName} className="h-12 w-12 object-contain" />
            <div>
              <div className="font-black text-xl">دار الخماسة</div>
              <div className="text-[10px] text-gold font-bold tracking-wide">DAR EL KHAMASA</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-cream/65 leading-relaxed max-w-sm" id="about">
            {settings.aboutShort || "دار الخماسة — علامة جزائرية بأصالة الحرفة وفخامة العصرية."}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {s.facebook && <a href={s.facebook} target="_blank" className="w-9 h-9 rounded-full bg-cream/10 hover:bg-gold hover:text-brown flex items-center justify-center transition" aria-label="Facebook"><Facebook className="w-4 h-4" /></a>}
            {s.instagram && <a href={s.instagram} target="_blank" className="w-9 h-9 rounded-full bg-cream/10 hover:bg-gold hover:text-brown flex items-center justify-center transition" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>}
            {s.tiktok && <a href={s.tiktok} target="_blank" className="w-9 h-9 rounded-full bg-cream/10 hover:bg-gold hover:text-brown flex items-center justify-center transition" aria-label="TikTok"><Music2 className="w-4 h-4" /></a>}
            {s.youtube && <a href={s.youtube} target="_blank" className="w-9 h-9 rounded-full bg-cream/10 hover:bg-gold hover:text-brown flex items-center justify-center transition" aria-label="YouTube"><Youtube className="w-4 h-4" /></a>}
          </div>
        </div>
        <div>
          <h4 className="font-black text-lightgold mb-3">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-cream/70 font-bold">
            <li><a href="#top" className="hover:text-gold transition">المنتج</a></li>
            <li><a href="#gallery" className="hover:text-gold transition">المعرض</a></li>
            <li><a href="#reviews" className="hover:text-gold transition">آراء العملاء</a></li>
            <li><a href="#order" className="hover:text-gold transition">اطلب الآن</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-black text-lightgold mb-3">تواصل معنا</h4>
          <ul className="space-y-2.5 text-sm text-cream/70 font-bold">
            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-gold shrink-0" /><a href={`tel:${settings.storePhone.replace(/\s/g, "")}`} dir="ltr" className="hover:text-gold transition">{settings.storePhone}</a></li>
            {settings.storePhone2 && <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-gold shrink-0" /><a href={`tel:${settings.storePhone2.replace(/\s/g, "")}`} dir="ltr" className="hover:text-gold transition">{settings.storePhone2}</a></li>}
            {settings.address && <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />{settings.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center">
        <Ornament className="text-gold/60 mx-auto" />
        <p className="mt-2 text-xs text-cream/50 font-bold">© {new Date().getFullYear()} دار الخماسة — جميع الحقوق محفوظة · الدفع عند الاستلام · توصيل لجميع الولايات</p>
      </div>
    </footer>
  );
}
