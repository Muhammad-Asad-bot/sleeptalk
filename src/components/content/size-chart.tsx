"use client";

import { useState } from "react";
import { CHART_SIZES, FITS, GARMENT_ORDER, GARMENTS, type Fit, type GarmentId } from "@/content/size-chart";
import { cn } from "@/lib/utils";

type Unit = "in" | "cm";

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-9 border px-3.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors",
            value === o.id ? "border-ink bg-ink text-canvas" : "border-line bg-transparent text-ink hover:border-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Interactive garment size chart (S–XL): shoppers pick the garment, Standard or Oversized fit,
 * and inches or centimetres. Data: src/content/size-chart.ts (from the factory size chart).
 */
export function SizeChart({ initialGarment = "hoodie" }: { initialGarment?: GarmentId }) {
  const [garmentId, setGarmentId] = useState<GarmentId>(initialGarment);
  const [fit, setFit] = useState<Fit>("standard");
  const [unit, setUnit] = useState<Unit>("in");
  const garment = GARMENTS[garmentId];
  const fitInfo = FITS.find((f) => f.id === fit)!;
  const cell = (v: string) => {
    const [cm, inch] = v.split("/");
    return unit === "cm" ? cm : inch;
  };

  return (
    <section aria-label="Size chart">
      <div className="space-y-4">
        <div>
          <p className="label mb-2 text-stone">Garment</p>
          <Toggle
            label="Garment"
            options={GARMENT_ORDER.map((id) => ({ id, label: GARMENTS[id].label }))}
            value={garmentId}
            onChange={setGarmentId}
          />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label mb-2 text-stone">Fit</p>
            <Toggle label="Fit" options={FITS.map((f) => ({ id: f.id, label: f.label }))} value={fit} onChange={setFit} />
          </div>
          <Toggle
            label="Units"
            options={[
              { id: "in" as Unit, label: "in" },
              { id: "cm" as Unit, label: "cm" },
            ]}
            value={unit}
            onChange={setUnit}
          />
        </div>
        <p className="text-sm text-ash">{fitInfo.description}</p>
      </div>

      <div className="prose-st overflow-x-auto" aria-live="polite">
        <table>
          <caption className="sr-only">
            {garment.label}, {fitInfo.label.toLowerCase()}, garment measurements in {unit === "in" ? "inches" : "centimetres"}
          </caption>
          <thead>
            <tr>
              <th scope="col">Size</th>
              {garment.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHART_SIZES.map((size) => (
              <tr key={size}>
                <th scope="row">{size}</th>
                {garment.rows[fit][size].map((v, i) => (
                  <td key={i} className="tabular-nums">
                    {cell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-stone">
        Garment measurements in {unit === "in" ? "inches" : "cm"}, taken laid flat. Widths marked ½ are measured straight
        across; double them for the full circumference. {garment.note ? `${garment.note} ` : ""}Allow about{" "}
        {unit === "in" ? "±0.4 in" : "±1 cm"} between pieces.
      </p>
    </section>
  );
}
