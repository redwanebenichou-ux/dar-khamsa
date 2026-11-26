-- ===== دار الخماسة — 0002: جدول حالة المتجر (طبقة التخزين المزدوجة) =====
-- شغّله في Supabase SQL Editor عند تهيئة المشروع.
-- ملاحظة: طبقة التخزين تنشئ الجدول تلقائياً عند أول حفظ إذا كان حساب
-- الخدمة (service role) يملك صلاحية إنشاء الجداول — هذا الملف للمرجع والتحكم اليدوي.

create table if not exists store_state (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz default now()
);

alter table store_state enable row level security;

-- سياسة للخدمة فقط (service_role يتجاوز RLS دائماً) — لا وصول عام للقراءة/الكتابة.
-- لا تنشئ سياسات anon هنا: الوصول للبيانات يتم عبر الخادم حصراً.

-- الصور: حاوية عامة للقراءة تُنشأ تلقائياً باسم product-images عبر الكود،
-- أو أنشئها يدوياً من Storage ← New bucket ← public ✓

-- البيانات العلائقية الكاملة (للمستقبل عند التحويل من وثيقة JSONB إلى جداول):
-- انظر db/migrations/0001_init.sql
