import { NextResponse, type NextRequest } from "next/server";

async function hmacHex(payload: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function valid(token: string | undefined) {
  if (!token) return false;
  const dot = token.lastIndexOf("."); // آخر نقطة فقط — البريد قد يحتوي نقاطاً
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const secret = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
  const expect = await hmacHex(payload, secret);
  if (expect !== sig) return false;
  const pipe = payload.lastIndexOf("|");
  if (pipe < 0) return false;
  return Number(payload.slice(pipe + 1)) > Date.now();
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!(await valid(req.cookies.get("dek_admin_session")?.value))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
