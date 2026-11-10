import "server-only";

/* Supabase Storage (REST API) for admin-uploaded product photos. Needs the server-only secret key. */

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

/** Supabase Storage is used when the server has a secret key; otherwise files go to /public/uploads (dev only). */
export function supabaseStorage() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  return base && key ? { base, key } : null;
}

/** Creates the public product-image bucket the first time it's needed. */
async function ensureBucket({ base, key }: { base: string; key: string }) {
  const res = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: STORAGE_BUCKET,
      name: STORAGE_BUCKET,
      public: true,
      file_size_limit: 8 * 1024 * 1024,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    }),
  });
  // 409 / "already exists" is fine (another upload created it first).
  if (!res.ok && !/exist/i.test(await res.text())) throw new Error(`Could not create storage bucket (${res.status}).`);
}

export async function uploadToSupabase(storage: { base: string; key: string }, objectPath: string, buf: Buffer, mime: string) {
  const put = () =>
    fetch(`${storage.base}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`, {
      method: "POST",
      headers: { apikey: storage.key, Authorization: `Bearer ${storage.key}`, "Content-Type": mime, "Cache-Control": "31536000" },
      body: new Uint8Array(buf),
    });
  let res = await put();
  if (!res.ok) {
    const text = await res.text();
    if (!/bucket not found/i.test(text)) throw new Error(`Storage upload failed (${res.status}): ${text.slice(0, 200)}`);
    await ensureBucket(storage);
    res = await put();
    if (!res.ok) throw new Error(`Storage upload failed (${res.status}).`);
  }
  return `${storage.base}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}`;
}
