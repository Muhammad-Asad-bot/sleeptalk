"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { saveColourLibraryAction } from "@/app/admin/_actions/catalog";
import { splitHex, swatchBackground } from "@/lib/utils";
import { abtn, adminInput, Card } from "./ui";

type Row = { key: string; name: string; hex: string };
const newKey = () => Math.random().toString(36).slice(2, 10);

/** Editable shop colour library. Products keep their own colour values; this only feeds the quick picks. */
export function ColourLibraryEditor({ initial }: { initial: { name: string; hex: string }[] }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((c) => ({ ...c, key: newKey() })));
  const [draft, setDraft] = useState({ name: "", upper: "#111111", lower: "#E8E0D0", twoTone: false });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  const update = (next: Row[]) => {
    setRows(next);
    setDirty(true);
    setMessage(null);
  };

  const add = () => {
    const name = draft.name.trim().replace(/\s+/g, " ");
    if (!name) return setMessage({ ok: false, text: "Give the new colour a name." });
    if (rows.some((r) => r.name.toLowerCase() === name.toLowerCase())) return setMessage({ ok: false, text: `“${name}” is already in the library.` });
    update([...rows, { key: newKey(), name, hex: draft.twoTone ? `${draft.upper},${draft.lower}` : draft.upper }]);
    setDraft({ ...draft, name: "" });
  };

  const save = () =>
    startTransition(async () => {
      const names = rows.map((r) => r.name.trim().toLowerCase());
      if (names.some((n) => !n)) return setMessage({ ok: false, text: "Every colour needs a name." });
      if (new Set(names).size !== names.length) return setMessage({ ok: false, text: "Two colours have the same name." });
      const result = await saveColourLibraryAction(rows.map(({ name, hex }) => ({ name: name.trim(), hex })));
      if (result.ok) {
        setDirty(false);
        setMessage({ ok: true, text: "Colour library saved." });
      } else setMessage({ ok: false, text: result.error });
    });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  return (
    <div className="space-y-6">
      <Card title={`Colours (${rows.length})`}>
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((r, i) => {
              const [upper, lower] = splitHex(r.hex);
              const setHex = (hex: string) => update(rows.map((x) => (x.key === r.key ? { ...x, hex } : x)));
              return (
                <li key={r.key} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="size-9 shrink-0 border border-line" style={{ background: swatchBackground(r.hex) }} aria-hidden />
                  <input
                    value={r.name}
                    onChange={(e) => update(rows.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))}
                    className={`${adminInput} h-9 w-48`}
                    aria-label="Colour name"
                    maxLength={60}
                  />
                  <label className="flex flex-col items-center text-[0.5625rem] uppercase tracking-[0.08em] text-stone">
                    <input type="color" value={upper} onChange={(e) => setHex(lower ? `${e.target.value},${lower}` : e.target.value)} className="h-7 w-9 cursor-pointer border border-line" aria-label={`${lower ? "Upper colour" : "Colour"} for ${r.name}`} />
                    {lower ? "Upper" : "Colour"}
                  </label>
                  {lower ? (
                    <label className="flex flex-col items-center text-[0.5625rem] uppercase tracking-[0.08em] text-stone">
                      <input type="color" value={lower} onChange={(e) => setHex(`${upper},${e.target.value}`)} className="h-7 w-9 cursor-pointer border border-line" aria-label={`Lower colour for ${r.name}`} />
                      Lower
                    </label>
                  ) : null}
                  <label className="flex items-center gap-1.5 text-xs text-ash">
                    <input type="checkbox" checked={!!lower} onChange={(e) => setHex(e.target.checked ? `${upper},#E8E0D0` : upper)} className="size-4 accent-ink" />
                    Two-tone
                  </label>
                  <span className="ml-auto flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={abtn("ghost", "sm")} aria-label={`Move ${r.name} up`}><ArrowUp className="size-3.5" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className={abtn("ghost", "sm")} aria-label={`Move ${r.name} down`}><ArrowDown className="size-3.5" /></button>
                    <button type="button" onClick={() => update(rows.filter((x) => x.key !== r.key))} className={abtn("ghost", "sm")} aria-label={`Remove ${r.name}`}><Trash2 className="size-3.5 text-sale" /></button>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ash">No colours yet. Add your first one below.</p>
        )}
      </Card>

      <Card title="Add a colour">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <span className="size-9 shrink-0 border border-line" style={{ background: swatchBackground(draft.twoTone ? `${draft.upper},${draft.lower}` : draft.upper) }} aria-hidden />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal">Name</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Olive, or Black / Olive" className={`${adminInput} w-56`} maxLength={60} />
          </label>
          <label className="flex flex-col items-center text-[0.5625rem] uppercase tracking-[0.08em] text-stone">
            <input type="color" value={draft.upper} onChange={(e) => setDraft({ ...draft, upper: e.target.value })} className="h-9 w-10 cursor-pointer border border-line" aria-label={draft.twoTone ? "Upper colour" : "Colour"} />
            {draft.twoTone ? "Upper" : "Colour"}
          </label>
          {draft.twoTone ? (
            <label className="flex flex-col items-center text-[0.5625rem] uppercase tracking-[0.08em] text-stone">
              <input type="color" value={draft.lower} onChange={(e) => setDraft({ ...draft, lower: e.target.value })} className="h-9 w-10 cursor-pointer border border-line" aria-label="Lower colour" />
              Lower
            </label>
          ) : null}
          <label className="flex items-center gap-1.5 pb-2 text-xs text-ash">
            <input type="checkbox" checked={draft.twoTone} onChange={(e) => setDraft({ ...draft, twoTone: e.target.checked })} className="size-4 accent-ink" />
            Two-tone (upper / lower)
          </label>
          <button type="submit" className={abtn("secondary")}><Plus className="size-3.5" /> Add to list</button>
        </form>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !dirty} className={abtn("primary")}>{pending ? "Saving…" : "Save colour library"}</button>
        {dirty && !pending ? <span className="text-xs text-warning">Unsaved changes</span> : null}
        {message ? <span role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-success" : "text-sale"}`}>{message.text}</span> : null}
      </div>
    </div>
  );
}
