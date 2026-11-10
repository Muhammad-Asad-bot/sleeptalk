import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser, isStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { isSameOrigin } from "@/lib/server/security";
import { supabaseStorage, uploadToSupabase } from "@/lib/server/storage";

const MAX_BYTES = 8 * 1024 * 1024;

/** Detects the real file type from magic bytes (never trust the filename or browser MIME type). */
function sniff(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (buf.length > 12 && buf.subarray(4, 12).toString("ascii").startsWith("ftypavi")) return { ext: "avif", mime: "image/avif" };
  return null;
}

/**
 * Admin image upload (staff only).
 *  - SUPABASE_SECRET_KEY set → Supabase Storage, public bucket "product-images" (production).
 *  - otherwise → /public/uploads/YYYY/MM on local disk (development only; not persistent on Vercel).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!isStaff(user)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be 8 MB or smaller." }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return NextResponse.json({ error: "Only JPG, PNG, WebP or AVIF images are allowed." }, { status: 415 });

  const now = new Date();
  const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const name = `${crypto.randomUUID()}.${kind.ext}`;
  const storage = supabaseStorage();
  let url: string;
  if (storage) {
    try {
      url = await uploadToSupabase(storage, `${folder}/${name}`, buf, kind.mime);
    } catch (e) {
      console.error("[upload]", e);
      return NextResponse.json({ error: "Couldn't save the image to storage. Please try again." }, { status: 502 });
    }
  } else {
    if (process.env.VERCEL) {
      return NextResponse.json({ error: "Image storage isn't configured: add SUPABASE_SECRET_KEY to the server's environment." }, { status: 500 });
    }
    // Local-dev fallback only (Vercel returns above). Ignored by the bundler so it doesn't trace the whole project.
    const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", ...folder.split("/"));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, name), buf);
    url = `/uploads/${folder}/${name}`;
  }
  await audit(user, "media.uploaded", "media", url, { bytes: file.size, type: kind.mime, storage: storage ? "supabase" : "local" });
  return NextResponse.json({ url });
}
