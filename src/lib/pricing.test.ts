import { describe, expect, it } from "vitest";
import { allocateStock } from "./pricing";

describe("allocateStock", () => {
  it("keeps regular purchases within stock while allowing uncapped pre-orders", () => {
    const stock = new Map([["variant", { stock: 2, allowBackorder: false }]]);
    const result = allocateStock(
      [
        { key: "preorder", quantity: 5, demand: [{ variantId: "variant", perUnit: 1 }], isPreorder: true },
        { key: "regular", quantity: 2, demand: [{ variantId: "variant", perUnit: 1 }] },
      ],
      stock,
    );

    expect(result.get("regular")).toEqual({ maxQuantity: 2, allocated: 2 });
    expect(result.get("preorder")).toEqual({ maxQuantity: 99, allocated: 5 });
  });
});
