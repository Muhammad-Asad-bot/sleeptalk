import { z } from "zod";

export const UK_POSTCODE = /^(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9]|[ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;
export const CA_POSTAL_CODE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

export const CA_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

/** Country-specific labels used by address forms. */
export const ADDRESS_LABELS = {
  GB: { region: "County (optional)", postcode: "Postcode", city: "Town / City", postcodePlaceholder: "SW1A 1AA" },
  CA: { region: "Province", postcode: "Postal code", city: "City", postcodePlaceholder: "K1A 0B1" },
} as const;

export function normalizePostcode(value: string, country: "GB" | "CA") {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  if (country === "GB" && compact.length > 3) return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  if (country === "CA" && compact.length === 6) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  return compact;
}

const text = (max: number) => z.string().trim().max(max);

export const addressSchema = z
  .object({
    firstName: text(60).min(1, "Enter a first name"),
    lastName: text(60).min(1, "Enter a last name"),
    line1: text(120).min(1, "Enter an address"),
    line2: text(120).optional().default(""),
    city: text(80).min(1, "Enter a town or city"),
    region: text(80).optional().default(""),
    postcode: text(12).min(1, "Enter a postcode"),
    country: z.enum(["GB", "CA"]),
    phone: text(30)
      .optional()
      .default("")
      .refine((v) => !v || /^[+()\d\s-]{7,30}$/.test(v), "Enter a valid phone number"),
  })
  .superRefine((a, ctx) => {
    if (a.country === "GB" && !UK_POSTCODE.test(a.postcode.trim())) {
      ctx.addIssue({ code: "custom", path: ["postcode"], message: "Enter a valid UK postcode" });
    }
    if (a.country === "CA") {
      if (!CA_POSTAL_CODE.test(a.postcode.trim())) {
        ctx.addIssue({ code: "custom", path: ["postcode"], message: "Enter a valid Canadian postal code" });
      }
      if (!CA_PROVINCES.some((p) => p.code === a.region)) {
        ctx.addIssue({ code: "custom", path: ["region"], message: "Select a province or territory" });
      }
    }
  })
  .transform((a) => ({ ...a, postcode: normalizePostcode(a.postcode, a.country) }));

export type AddressInput = z.infer<typeof addressSchema>;

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
