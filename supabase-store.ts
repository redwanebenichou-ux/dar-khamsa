// ===== طبقة Supabase — حفظ حالة المتجر كوثيقة JSONB + Storage للصور =====
// تُفعّل تلقائياً عند توفر متغيرات البيئة، وإلا يعمل النظام محلياً بملف JSON.
// عند ربط Supabase: البيانات والصور دائمة على Vercel (لا تُمحى بين النشرات).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DB } from "@/lib/types";

const TABLE = "store_state";
const ROW_ID = "current";
const BUCKET = "product-images";

let client: SupabaseClient | null = null;

export function supabaseEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getClient(): SupabaseClient | null {
  if (!supabaseEnabled()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // سري — الخادم فقط
      { auth: { persistSession: false } },
    );
  }
  return client;
}

/** قراءة الحالة الكاملة — null إن لم توجد أو فشل (يرجع النظام للملف المحلي) */
export async function loadState(): Promise<DB | null> {
  const sb = getClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle();
    if (error) {
      console.warn("[supabase] loadState:", error.message);
      return null;
    }
    return (data?.data as DB) ?? null;
  } catch (e) {
    console.warn("[supabase] loadState exception:", e);
    return null;
  }
}

/** حفظ الحالة الكاملة (upsert) */
export async function saveState(db: DB): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  try {
    const { error } = await sb.from(TABLE)
      .upsert({ id: ROW_ID, data: db, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) { console.error("[supabase] saveState:", error.message); return false; }
    return true;
  } catch (e) {
    console.error("[supabase] saveState exception:", e);
    return false;
  }
}

/** رفع ملف إلى Storage — يعيد الرابط العام، أو null عند الفشل/التعطيل */
export async function uploadToStorage(file: Buffer, name: string, contentType: string): Promise<string | null> {
  const sb = getClient();
  if (!sb) return null;
  try {
    // إنشاء الحاوية تلقائياً إن لم توجد (عام للقراءة)
    const { data: buckets } = await sb.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      const { error: mkErr } = await sb.storage.createBucket(BUCKET, { public: true });
      if (mkErr && !mkErr.message.includes("exists")) console.warn("[supabase] createBucket:", mkErr.message);
    }
    const { error } = await sb.storage.from(BUCKET).upload(name, file, { contentType, upsert: true });
    if (error) { console.error("[supabase] upload:", error.message); return null; }
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(name);
    return pub.publicUrl;
  } catch (e) {
    console.error("[supabase] upload exception:", e);
    return null;
  }
}

/** SQL لتهيئة الجدول — للمرجع وتشغيله اليدوي في SQL Editor */
export const STATE_TABLE_SQL = `create table if not exists ${TABLE} (id text primary key, data jsonb not null, updated_at timestamptz default now());`;
