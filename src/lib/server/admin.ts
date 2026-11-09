import "server-only";
import { redirect } from "next/navigation";

/** Redirect back to an admin page with a flash message (?ok= / ?error=). */
export function back(path: string, flash: { ok?: string; error?: string }): never {
  const [base, query = ""] = path.split("?");
  const sp = new URLSearchParams(query);
  sp.delete("ok");
  sp.delete("error");
  if (flash.ok) sp.set("ok", flash.ok);
  if (flash.error) sp.set("error", flash.error);
  const qs = sp.toString();
  redirect(qs ? `${base}?${qs}` : base);
}

export function str(fd: FormData, key: string, max = 2000) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}

export function int(fd: FormData, key: string): number | null {
  const raw = String(fd.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : NaN;
}

export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function returnPath(fd: FormData, fallback: string) {
  const p = String(fd.get("_return") ?? "");
  return p.startsWith("/admin") && !p.startsWith("//") ? p : fallback;
}

export function pageParam(v: string | undefined) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}
