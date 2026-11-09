"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  max = 20,
  min = 1,
  label = "Quantity",
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  label?: string;
  size?: "sm" | "md";
}) {
  const btn = cn("grid place-items-center hover:bg-ink/5 disabled:opacity-30", size === "sm" ? "size-8" : "size-11");
  return (
    <div className="inline-flex items-center border border-line bg-paper" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="size-3.5" />
      </button>
      <output className={cn("min-w-8 text-center text-sm tabular-nums", size === "sm" && "min-w-6 text-xs")} aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
