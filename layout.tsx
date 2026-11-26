import type { Metadata, Viewport } from "next";
import { Cairo, Amiri, Tajawal } from "next/font/google";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri", display: "swap" });
const tajawal = Tajawal({ subsets: ["arabic"], weight: ["400", "700", "900"], variable: "--font-tajawal", display: "swap" });

export const metadata: Metadata = {
  title: "دار الخماسة — متجر إلكتروني",
  description: "دار الخماسة — منتجات أصيلة وتوصيل لكل الولايات الجزائرية. الدفع عند الاستلام.",
};

export const viewport: Viewport = { themeColor: "#171513", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${amiri.variable} ${tajawal.variable}`}>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
