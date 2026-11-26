// تقديم الصور المرفوعة من القرص عند كل طلب — بدل الاعتماد على المجلد العام الثابت
// (next start لا يقدم الملفات المضافة إلى public/ بعد الإقلاع — هذا المسار يحل المشكلة،
//  وعند ربط Supabase Storage يُستبدل بنقلة إلى رابط Supabase)
import fs from "fs";
import path from "path";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", mp4: "video/mp4", webm: "video/webm",
};

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  // name فقط — منع تجاوز المسار
  const name = path.basename(params.name);
  const file = path.join(process.cwd(), "public", "uploads", name);
  if (!fs.existsSync(file)) {
    return new Response("Not found", { status: 404 });
  }
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const data = fs.readFileSync(file);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
