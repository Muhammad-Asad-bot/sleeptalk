"use client";

import { Field, inputClass, TextInput } from "@/components/ui/fields";
import { ADDRESS_LABELS, CA_PROVINCES } from "@/lib/validation";

export type AddressValue = {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postcode: string;
  country: "GB" | "CA";
  phone: string;
};

export const emptyAddress = (country: "GB" | "CA"): AddressValue => ({
  firstName: "",
  lastName: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postcode: "",
  country,
  phone: "",
});

/** Country-aware address fields (UK postcode/county vs Canadian postal code/province). */
export function AddressFields({
  prefix,
  value,
  onChange,
  errors,
  lockCountry,
  autoCompleteSection,
}: {
  prefix: string;
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  errors: Record<string, string>;
  lockCountry?: boolean;
  autoCompleteSection: "shipping" | "billing";
}) {
  const labels = ADDRESS_LABELS[value.country];
  const set = (k: keyof AddressValue) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const err = (k: string) => errors[`${prefix}.${k}`];
  const ac = (token: string) => `section-${autoCompleteSection} ${autoCompleteSection} ${token}`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Country" name={`${prefix}-country`} className="sm:col-span-2" error={err("country")}>
        <select
          id={`${prefix}-country`}
          value={value.country}
          onChange={(e) => onChange({ ...value, country: e.target.value as "GB" | "CA", region: "" })}
          disabled={lockCountry}
          className={inputClass}
          autoComplete={ac("country")}
        >
          <option value="GB">United Kingdom</option>
          <option value="CA">Canada</option>
        </select>
      </Field>
      <TextInput label="First name" name={`${prefix}-firstName`} value={value.firstName} onChange={set("firstName")} autoComplete={ac("given-name")} required error={err("firstName")} />
      <TextInput label="Last name" name={`${prefix}-lastName`} value={value.lastName} onChange={set("lastName")} autoComplete={ac("family-name")} required error={err("lastName")} />
      <TextInput label="Address line 1" name={`${prefix}-line1`} value={value.line1} onChange={set("line1")} autoComplete={ac("address-line1")} required error={err("line1")} className="sm:col-span-2" />
      <TextInput label="Address line 2 (optional)" name={`${prefix}-line2`} value={value.line2} onChange={set("line2")} autoComplete={ac("address-line2")} error={err("line2")} className="sm:col-span-2" />
      <TextInput label={labels.city} name={`${prefix}-city`} value={value.city} onChange={set("city")} autoComplete={ac("address-level2")} required error={err("city")} />
      {value.country === "CA" ? (
        <Field label={labels.region} name={`${prefix}-region`} required error={err("region")}>
          <select id={`${prefix}-region`} value={value.region} onChange={set("region")} className={inputClass} autoComplete={ac("address-level1")} aria-invalid={err("region") ? true : undefined}>
            <option value="">Select…</option>
            {CA_PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </Field>
      ) : (
        <TextInput label={labels.region} name={`${prefix}-region`} value={value.region} onChange={set("region")} autoComplete={ac("address-level1")} error={err("region")} />
      )}
      <TextInput
        label={labels.postcode}
        name={`${prefix}-postcode`}
        value={value.postcode}
        onChange={set("postcode")}
        autoComplete={ac("postal-code")}
        placeholder={labels.postcodePlaceholder}
        required
        error={err("postcode")}
        className="uppercase"
      />
      <TextInput label="Phone (optional — for delivery updates)" name={`${prefix}-phone`} type="tel" value={value.phone} onChange={set("phone")} autoComplete={ac("tel")} error={err("phone")} />
    </div>
  );
}
