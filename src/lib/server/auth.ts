import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions, users, type Role } from "@/db/schema";
import { randomToken, sha256 } from "./security";

export const SESSION_COOKIE = "st_session";
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
};

function hashSessionToken(token: string) {
  return sha256(`${token}.${process.env.AUTH_SECRET ?? "dev-secret"}`);
}

export async function createSession(userId: string) {
  const db = await getDb();
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: hashSessionToken(token), userId, expiresAt });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  }
  store.delete(SESSION_COOKIE);
}

/** Invalidate every session for a user (password change / reset / disable). */
export async function destroyAllSessions(userId: string) {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      disabled: users.disabled,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.disabled) return null;
  return { id: row.id, email: row.email, firstName: row.firstName, lastName: row.lastName, role: row.role };
});

export async function requireUser(nextPath = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export function isStaff(user: CurrentUser | null): user is CurrentUser {
  return !!user && (user.role === "staff" || user.role === "owner");
}

export async function requireStaff(nextPath = "/admin") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!isStaff(user)) redirect("/account?denied=admin");
  return user;
}

export async function requireOwner() {
  const user = await requireStaff();
  if (user.role !== "owner") redirect("/admin?denied=owner");
  return user;
}

/** Only allow relative, same-site redirect targets after login. */
export function safeNextPath(next: unknown, fallback = "/account") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
