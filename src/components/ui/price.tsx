import { formatMoney, type MarketCode } from "@/lib/markets";
import { cn } from "@/lib/utils";

export function Price({
  amount,
  compareAt,
  market,
  className,
  size = "sm",
}: {
  amount: number;
  compareAt?: number | null;
  market: MarketCode;
  className?: string;
  size?: "sm" | "lg";
}) {
  const onSale = compareAt != null && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", size === "lg" ? "text-lg" : "text-sm", className)}>
      <span className={cn("font-medium", onSale && "text-sale")}>
        {onSale ? <span className="sr-only">Sale price </span> : null}
        {formatMoney(amount, market)}
      </span>
      {onSale ? (
        <s className="text-stone">
          <span className="sr-only">Original price </span>
          {formatMoney(compareAt!, market)}
        </s>
      ) : null}
    </span>
  );
}
