import { redirect } from "next/navigation";

// لا توجد صفحة رئيسية عامة — الزبائن يصلون مباشرة من الإعلانات إلى /p/[slug]
// للوحة التحكم: /admin
export default function Home() {
  redirect("/admin");
}
