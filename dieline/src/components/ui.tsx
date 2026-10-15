"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

export function Section({ title, children, defaultOpen = true, aside }: { title: string; children: ReactNode; defaultOpen?: boolean; aside?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-rule">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink">{title}</span>
        <span className="flex items-center gap-2">
          {aside}
          <span className={`text-mute transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </span>
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </section>
  );
}

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[12px] text-mute" title={hint}>
      {children}
    </label>
  );
}

/**
 * Numeric field in millimetres. With `auto`, an empty field means "let the
 * generator decide" and the resolved value shows as the placeholder.
 */
export function NumberField({
  label,
  value,
  onChange,
  auto,
  resolved,
  unit = "mm",
  step = 0.1,
  min,
  max,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  auto?: boolean;
  resolved?: number;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    setText((t) => {
      const parsed = t === "" ? null : Number(t.replace(",", "."));
      return parsed === value ? t : value == null ? "" : String(value);
    });
  }, [value]);
  const placeholder = auto && resolved != null ? `${Math.round(resolved * 100) / 100} auto` : "";
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <div className="flex h-10 items-center rounded-md border border-rule bg-paper focus-within:border-ink">
        <input
          id={id}
          inputMode="decimal"
          className="h-full w-full min-w-0 bg-transparent px-3 font-mono text-[16px] outline-none sm:text-[14px] placeholder:text-mute/70"
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            if (t.trim() === "") {
              if (auto) onChange(null);
              return;
            }
            const v = Number(t.replace(",", "."));
            if (Number.isFinite(v)) onChange(v);
          }}
          onBlur={() => {
            if (text.trim() === "" && !auto && value != null) setText(String(value));
          }}
          step={step}
          min={min}
          max={max}
        />
        {auto && value != null && (
          <button type="button" className="px-2 font-mono text-[10px] uppercase text-mute hover:text-ink" onClick={() => onChange(null)} title="Back to automatic">
            auto
          </button>
        )}
        <span className="pr-3 font-mono text-[12px] text-mute">{unit}</span>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="grid gap-1 rounded-md border border-rule bg-paper p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-8 rounded text-[12px] transition-colors ${value === o.value ? "bg-ink text-paper" : "text-mute hover:bg-bone hover:text-ink"}`}
            aria-pressed={value === o.value}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full rounded-md border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink sm:text-[14px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-[13px]" title={hint}>
        {label}
      </span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-10 rounded-full bg-rule transition-colors peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink sm:text-[14px]"
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  type = "button",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "accent";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-accent hover:text-ink",
    accent: "bg-accent text-ink hover:brightness-95",
    secondary: "border border-rule bg-paper text-ink hover:border-ink",
    ghost: "text-mute hover:text-ink",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
