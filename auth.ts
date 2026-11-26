// ===== مصادقة الإدارة —جلسة توقيع HMAC (استبدلها بـ Supabase Auth لاحقاً) =====
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "dek_admin_session";
const TTL = 7 * 24 * 3600 * 1000;

function secret() {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}
function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function checkCredentials(email: string, password: string) {
  const e = process.env.ADMIN_EMAIL || "admin@darelkhamsa.dz";
  const p = process.env.ADMIN_PASSWORD || "admin123";
  return email.trim().toLowerCase() === e.toLowerCase() && password === p;
}

export function createSession(email: string) {
  const payload = `${email}|${Date.now() + TTL}`;
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: TTL / 1000,
    secure: process.env.NODE_ENV === "production",
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

export function isAuthed(): boolean {
  const c = cookies().get(COOKIE)?.value;
  if (!c) return false;
  const dot = c.lastIndexOf("."); // آخر نقطة فقط — البريد قد يحتوي نقاطاً
  if (dot < 1) return false;
  const payload = c.slice(0, dot);
  const sig = c.slice(dot + 1);
  if (!payload || !sig || sign(payload) !== sig) return false;
  const pipe = payload.lastIndexOf("|");
  if (pipe < 0) return false;
  return Number(payload.slice(pipe + 1)) > Date.now();
}

export function currentAdmin(): string | null {
  if (!isAuthed()) return null;
  const v = cookies().get(COOKIE)!.value;
  return v.slice(0, v.lastIndexOf(".")).split("|")[0];
}
