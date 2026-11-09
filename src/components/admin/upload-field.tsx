"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { abtn, adminInput } from "./ui";

/** URL input with an "Upload" button (uses the staff-only /api/admin/upload endpoint) and a preview. */
export function UploadField({ name, defaultValue = "", label }: { name: string; defaultValue?: string; label: string }) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setValue(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-charcoal">{label}</span>
      <div className="flex gap-3">
        {value ? (
          <span className="relative block h-16 w-14 shrink-0 overflow-hidden bg-cream">
            <SmartImage src={value} alt="" fill sizes="56px" className="object-cover" showDemoTag={false} />
          </span>
        ) : null}
        <div className="flex-1 space-y-2">
          <input name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="/uploads/… or https://…" className={adminInput} />
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className={abtn("secondary", "sm")}>
            <ImagePlus className="size-3.5" /> {busy ? "Uploading…" : "Upload image"}
          </button>
          {error ? <p className="text-xs text-sale">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
