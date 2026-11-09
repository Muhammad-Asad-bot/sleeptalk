import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/**
 * Simple fixed-window rate limiter (in-memory, per server instance).
 * For multi-instance production deployments swap for a shared store (e.g. Redis/Upstash).
 */
type Bucket = { count: number; resetAt: number };
const globalForLimiter = globalThis as unknown as { __stRate?: Map<string, Bucket> };
const buckets = (globalForLimiter.__stRate ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export async function limitByIp(action: string, limit: number, windowMs: number) {
  return rateLimit(`${action}:${await clientIp()}`, limit, windowMs);
}

/** CSRF defence for JSON route handlers: require a same-origin Origin header on mutations. */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
