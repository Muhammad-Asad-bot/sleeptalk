/**
 * Shrinks an image in the browser before it is uploaded (admin uploads). Phone and camera photos
 * are often 5–15 MB; sent as-is they upload slowly, can exceed the host's request size limit, and
 * make the image optimizer time out fetching them from storage.
 *
 *  - Longest side capped at MAX_EDGE px (sharp on retina screens).
 *  - Opaque images → JPEG; images with transparency → WebP (PNG if the browser can't encode WebP),
 *    so cut-outs and logos keep their transparent background.
 *  - Camera rotation (EXIF) is applied, so photos don't come out sideways.
 *  - Falls back to the original file if anything fails or shrinking wouldn't make it smaller.
 */

// ~200–350 KB per product photo: sharp on retina screens, and quick enough for Next's image
// optimizer, which gives up fetching an original from storage after a fixed 7 seconds.
const MAX_EDGE = 1600;
const QUALITY = 0.8;
const SUPPORTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  return false;
}

export async function compressImage(file: File): Promise<File> {
  if (!SUPPORTED.includes(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // JPEG has no transparency, so only photos that can't carry an alpha channel skip the check.
    const transparent = file.type !== "image/jpeg" && hasTransparency(ctx, width, height);
    let blob: Blob | null;
    let ext: string;
    if (transparent) {
      blob = await toBlob(canvas, "image/webp", QUALITY);
      ext = "webp";
      if (!blob || blob.type !== "image/webp") {
        blob = await toBlob(canvas, "image/png");
        ext = "png";
      }
    } else {
      blob = await toBlob(canvas, "image/jpeg", QUALITY);
      ext = "jpg";
    }
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
