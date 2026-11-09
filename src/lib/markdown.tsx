import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal, safe Markdown renderer for admin-managed content (pages, size guide, FAQ).
 * Supports: ## / ### headings, paragraphs, - lists, > callouts, | tables |, **bold**, *italic*, [links](/path).
 * Produces React elements only — raw HTML is never injected, so content cannot introduce scripts.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith("**")) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("[")) {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      const safe = href && (href.startsWith("/") || href.startsWith("https://") || href.startsWith("mailto:"));
      if (safe && href.startsWith("/")) out.push(<Link key={key} href={href} className="underline underline-offset-4">{label}</Link>);
      else if (safe) out.push(<a key={key} href={href} className="underline underline-offset-4" rel="noopener noreferrer" target={href.startsWith("https") ? "_blank" : undefined}>{label}</a>);
      else out.push(label ?? token);
    } else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export type MdBlock =
  | { type: "h2" | "h3" | "p" | "quote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

export function parseMarkdown(src: string): MdBlock[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4) }); i++; continue; }
    if (line.startsWith("## ")) { blocks.push({ type: "h2", text: line.slice(3) }); i++; continue; }
    if (line.startsWith("> ")) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) parts.push(lines[i++].trim().replace(/^>\s?/, ""));
      blocks.push({ type: "quote", text: parts.join(" ") });
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) items.push(lines[i++].trim().slice(2));
      blocks.push({ type: "ul", items });
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i++].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
      }
      blocks.push({ type: "table", head: rows[0] ?? [], rows: rows.slice(1) });
      continue;
    }
    const parts: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |> |[-*] |\|)/.test(lines[i].trim())) parts.push(lines[i++].trim());
    blocks.push({ type: "p", text: parts.join(" ") });
  }
  return blocks;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={className ?? "prose-st"}>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.type) {
          case "h2": return <h2 key={k}>{inline(b.text, k)}</h2>;
          case "h3": return <h3 key={k} className="mt-6 font-semibold">{inline(b.text, k)}</h3>;
          case "quote": return <blockquote key={k}>{inline(b.text, k)}</blockquote>;
          case "ul": return <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ul>;
          case "table":
            return (
              <div key={k} className="overflow-x-auto">
                <table>
                  <thead><tr>{b.head.map((h, j) => <th key={j} scope="col">{inline(h, `${k}-h${j}`)}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, x) => <td key={x}>{inline(c, `${k}-${j}-${x}`)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          default: return <p key={k}>{inline(b.text, k)}</p>;
        }
      })}
    </div>
  );
}

/** Splits FAQ-style content into question/answer pairs on "## " headings. */
export function splitSections(source: string) {
  const blocks = parseMarkdown(source);
  const intro: MdBlock[] = [];
  const sections: { title: string; blocks: MdBlock[] }[] = [];
  for (const b of blocks) {
    if (b.type === "h2") sections.push({ title: b.text, blocks: [] });
    else if (sections.length) sections[sections.length - 1].blocks.push(b);
    else intro.push(b);
  }
  return { intro, sections };
}

export function blocksToMarkdown(blocks: MdBlock[]) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "h2": return `## ${b.text}`;
        case "h3": return `### ${b.text}`;
        case "quote": return `> ${b.text}`;
        case "ul": return b.items.map((i) => `- ${i}`).join("\n");
        case "table": return [b.head, b.head.map(() => "---"), ...b.rows].map((r) => `| ${r.join(" | ")} |`).join("\n");
        default: return b.text;
      }
    })
    .join("\n\n");
}
