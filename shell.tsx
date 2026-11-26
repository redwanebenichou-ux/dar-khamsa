"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Warehouse, Truck, Tag, BarChart3,
  Receipt, Settings, LogOut, Menu, Search, Bell, ChevronLeft, Sparkles, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions";
import { useState, useMemo } from "react";

const NAV_SECTIONS = [
  {
    title: "نظرة عامة",
    items: [
      { href: "/admin", label: "لوحة القيادة", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
    ],
  },
  {
    title: "الكتالوج",
    items: [
      { href: "/admin/products", label: "المنتجات وصفحاتها", icon: Package },
      { href: "/admin/inventory", label: "المخزون", icon: Warehouse },
      { href: "/admin/offers", label: "العروض", icon: Tag },
    ],
  },
  {
    title: "المبيعات",
    items: [
      { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
      { href: "/admin/customers", label: "العملاء", icon: Users },
    ],
  },
  {
    title: "العمليات",
    items: [
      { href: "/admin/shipping", label: "الشحن DHD", icon: Truck },
      { href: "/admin/expenses", label: "المصاريف", icon: Receipt },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/admin/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

const TITLE_MAP: Record<string, string> = {
  "/admin": "لوحة القيادة",
  "/admin/analytics": "التحليلات",
  "/admin/products": "المنتجات",
  "/admin/inventory": "المخزون",
  "/admin/offers": "العروض",
  "/admin/orders": "الطلبات",
  "/admin/customers": "العملاء",
  "/admin/shipping": "الشحن DHD",
  "/admin/expenses": "المصاريف",
  "/admin/settings": "الإعدادات",
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const pageTitle = useMemo(() => {
    if (path.startsWith("/admin/shipping/")) return "تفاصيل شحنة";
    return TITLE_MAP[path] ?? "الإدارة";
  }, [path]);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-ivory/10">
        <div className="relative">
          <img src="/logo.png" alt="دار الخماسة" className="h-10 w-10 object-contain rounded-lg bg-ivory/10 p-1" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-ink" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-ivory leading-none truncate">دار الخماسة</div>
          <div className="text-[10px] text-gold font-bold mt-1 flex items-center gap-1">
            <Activity className="w-3 h-3" /> لوحة التحكم
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-auto py-3 px-3 space-y-4">
        {NAV_SECTIONS.map((sec) => (
          <div key={sec.title}>
            <div className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-wider text-ivory/35">
              {sec.title}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((n) => {
                const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
                const Icon = n.icon;
                return (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all duration-150",
                      active
                        ? "bg-gold text-ink shadow-sm"
                        : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory"
                    )}>
                    <Icon className={cn("w-[18px] h-[18px] shrink-0 transition-transform", !active && "group-hover:scale-110")} />
                    <span className="truncate">{n.label}</span>
                    {active && <ChevronLeft className="w-4 h-4 mr-auto opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-ivory/10 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ivory/5 text-[11px] text-ivory/50">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span>الإصدار 1.0 — DHD Live</span>
        </div>
        <button onClick={async () => { await logout(); router.push("/admin/login"); }}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 transition">
          <LogOut className="w-4 h-4" /> تسجيل الخروج
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:block w-64 shrink-0 bg-ink text-ivory sticky top-0 h-screen shadow-pop">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute top-0 right-0 h-full w-72 bg-ink text-ivory shadow-pop animate-[slideIn_.2s_ease]">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-ink/10">
          <div className="flex items-center gap-3 px-4 md:px-6 py-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-ink/5" onClick={() => setOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-ink/45 font-bold">لوحة التحكم</div>
              <div className="text-base font-black text-ink truncate">{pageTitle}</div>
            </div>
            <div className="flex-1" />
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-ink/5 rounded-lg px-3 py-2 w-72">
              <Search className="w-4 h-4 text-ink/40" />
              <input
                className="bg-transparent outline-none text-sm w-full placeholder:text-ink/35"
                placeholder="بحث في لوحة التحكم..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-ink/5">
              <Bell className="w-5 h-5 text-ink/60" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}