// TEMPORARY diagnostic — delete after the Vercel database issue is solved.
// Shows which database the server connects to (password hidden) and whether the shop's tables exist.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function describeUrl(raw: string | undefined) {
  if (!raw) return { set: false };
  const value = raw.trim();
  const info: Record<string, unknown> = {
    set: true,
    length: value.length,
    startsWithQuote: /^["']/.test(value),
    endsWithQuote: /["']$/.test(value),
    hasSpaces: /\s/.test(value),
  };
  try {
    const u = new URL(value.replace(/^["']|["']$/g, ""));
    Object.assign(info, { protocol: u.protocol, user: u.username, host: u.hostname, port: u.port, database: u.pathname, params: u.search || "(none)" });
  } catch {
    info.parseError = "Not a valid URL";
  }
  return info;
}

export async function GET() {
  const result: Record<string, unknown> = {
    DATABASE_URL: describeUrl(process.env.DATABASE_URL),
    present: Object.fromEntries(
      ["AUTH_SECRET", "SUPABASE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "STRIPE_SECRET_KEY", "PAYMENT_PROVIDER", "NEXT_PUBLIC_SITE_URL", "DATABASE_POOL_MAX", "SUPABASE_STORAGE_BUCKET", "POSTGRES_URL"].map((k) => [k, !!process.env[k]]),
    ),
    region: process.env.VERCEL_REGION ?? null,
  };
  const url = process.env.DATABASE_URL;
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 10000 });
    try {
      await client.connect();
      const db = await client.query("select current_database() as db, current_user as usr");
      const tables = await client.query("select table_name from information_schema.tables where table_schema = 'public' order by 1");
      result.connection = {
        ok: true,
        database: db.rows[0].db,
        user: db.rows[0].usr,
        publicTables: tables.rows.length,
        hasShopTables: tables.rows.some((r) => r.table_name === "markets"),
      };
    } catch (e) {
      result.connection = { ok: false, error: e instanceof Error ? e.message : String(e) };
    } finally {
      await client.end().catch(() => {});
    }
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
