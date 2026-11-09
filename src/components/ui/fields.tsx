import { cn } from "@/lib/utils";

export const inputClass =
  "block w-full h-12 border border-line bg-paper px-3.5 text-sm text-ink placeholder:text-stone/80 transition-colors focus:border-ink focus:outline-none aria-[invalid=true]:border-sale";

export function Field({
  label,
  name,
  error,
  hint,
  className,
  children,
  required,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
  children?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={name} className="block text-xs font-medium text-charcoal">
        {label}
        {required ? <span aria-hidden className="text-stone"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${name}-hint`} className="text-xs text-stone">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} role="alert" className="text-xs text-sale">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  label,
  name,
  error,
  hint,
  className,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string; hint?: string }) {
  return (
    <Field label={label} name={name} error={error} hint={hint} className={className} required={required}>
      <input
        id={name}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={inputClass}
        {...props}
      />
    </Field>
  );
}

export function TextArea({
  label,
  name,
  error,
  hint,
  className,
  required,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; error?: string; hint?: string }) {
  return (
    <Field label={label} name={name} error={error} hint={hint} className={className} required={required}>
      <textarea
        id={name}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={cn(inputClass, "h-auto min-h-32 py-3")}
        {...props}
      />
    </Field>
  );
}

export function FormMessage({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "border px-4 py-3 text-sm",
        tone === "error" && "border-sale/40 bg-sale/5 text-sale",
        tone === "success" && "border-success/40 bg-success/5 text-success",
        tone === "info" && "border-line bg-paper text-charcoal",
      )}
    >
      {children}
    </div>
  );
}
