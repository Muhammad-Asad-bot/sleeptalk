"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/password";
import { emailSchema } from "@/lib/validation";
import { createSession, destroyAllSessions, destroySession, getCurrentUser, safeNextPath } from "@/lib/server/auth";
import { sendEmail } from "@/lib/server/email";
import { clientIp, limitByIp, randomToken, rateLimit, sha256 } from "@/lib/server/security";
import { absoluteUrl } from "@/lib/utils";

export type AuthState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

// Always run a bcrypt compare (even for unknown emails) so timing doesn't reveal which accounts exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-placeholder"));

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = formData.get("next");
  if (!email.success || !password) return { message: "Enter your email and password." };

  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 20, 15 * 60_000).ok || !rateLimit(`login:${email.data}`, 8, 15 * 60_000).ok) {
    return { message: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email.data)).limit(1);
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return { message: "That email and password don't match our records." };
  if (user.disabled) return { message: "This account has been disabled. Please contact support." };

  await createSession(user.id);
  const fallback = user.role === "customer" ? "/account" : "/admin";
  redirect(safeNextPath(next, fallback));
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().min(1, "Enter your last name").max(60),
  email: emailSchema,
  password: z.string(),
  marketingOptIn: z.literal("on").optional(),
});

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const limited = await limitByIp("register", 6, 60 * 60_000);
  if (!limited.ok) return { message: "Too many accounts created from this connection. Please try later." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const problem = passwordProblems(parsed.data.password);
  if (problem) return { errors: { password: problem } };

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing) return { errors: { email: "An account with this email already exists. Try signing in." } };

  const [created] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      marketingOptIn: parsed.data.marketingOptIn === "on",
    })
    .returning({ id: users.id });
  await createSession(created.id);
  await sendEmail({
    to: parsed.data.email,
    subject: "Welcome to SLEEP TALK",
    text: `Hi ${parsed.data.firstName},\n\nYour SLEEP TALK account is ready. Track orders, save addresses and keep a wishlist at ${absoluteUrl("/account")}.\n`,
  }).catch(() => null);
  redirect(safeNextPath(formData.get("next"), "/account"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/** Always responds the same way, whether or not the email exists (no account enumeration). */
export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const limited = await limitByIp("forgot", 5, 30 * 60_000);
  if (!limited.ok) return { message: "Too many requests. Please try again later." };
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { errors: { email: "Enter a valid email address" } };
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email.data)).limit(1);
  if (user && !user.disabled) {
    const token = randomToken(32);
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    await sendEmail({
      to: user.email,
      subject: "Reset your SLEEP TALK password",
      text: `We received a request to reset your password.\n\nReset it here (valid for 1 hour): ${absoluteUrl(`/reset-password?token=${token}`)}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
  }
  return { ok: true, message: "If an account exists for that email, we've sent a link to reset your password." };
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const limited = await limitByIp("reset", 10, 30 * 60_000);
  if (!limited.ok) return { message: "Too many attempts. Please try again later." };
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const problem = passwordProblems(password);
  if (problem) return { errors: { password: problem } };
  if (password !== confirm) return { errors: { confirm: "Passwords don't match" } };
  if (!token || token.length > 100) return { message: "This reset link is invalid." };

  const db = await getDb();
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, sha256(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);
  if (!row) return { message: "This reset link has expired or already been used. Please request a new one." };

  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, row.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  await destroyAllSessions(row.userId);
  await createSession(row.userId);
  redirect("/account?reset=1");
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().min(1, "Enter your last name").max(60),
  marketingOptIn: z.literal("on").optional(),
});

export async function updateProfileAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/settings");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const db = await getDb();
  await db
    .update(users)
    .set({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, marketingOptIn: parsed.data.marketingOptIn === "on" })
    .where(eq(users.id, user.id));
  return { ok: true, message: "Profile updated." };
}

export async function changePasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/settings");
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const problem = passwordProblems(password);
  if (problem) return { errors: { password: problem } };
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(current, row.passwordHash))) return { errors: { current: "Current password is incorrect" } };
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
  await destroyAllSessions(user.id);
  await createSession(user.id);
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}
