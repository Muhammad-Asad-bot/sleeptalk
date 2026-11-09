import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

type Email = { to: string; subject: string; text: string; html?: string };

/**
 * Transactional email adapter.
 *  - RESEND_API_KEY set → sends via Resend's HTTP API.
 *  - otherwise (development) → logs to the console and appends to ./.data/outbox.log
 * Swap the provider here without touching callers.
 */
export async function sendEmail(email: Email) {
  const from = process.env.EMAIL_FROM || "SLEEP TALK <no-reply@sleeptalk.example>";
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    });
    if (!res.ok) console.error("[email] send failed", res.status, await res.text().catch(() => ""));
    return;
  }
  const entry = `\n=== ${new Date().toISOString()} ===\nFrom: ${from}\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`;
  console.info(`[email:dev] → ${email.to}: ${email.subject}`);
  try {
    const dir = path.join(process.cwd(), ".data");
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, "outbox.log"), entry, "utf8");
  } catch {
    // ignore — console output is enough in dev
  }
}
