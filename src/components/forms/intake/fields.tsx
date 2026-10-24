"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[13.5px] font-semibold text-erreur">{message}</p>;
}

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-[15px] font-semibold">
        {required && <span className="mr-1 font-extrabold text-rouge">*</span>}
        {label}
      </label>
      {hint && <span className="mb-1.5 block text-[13px] font-normal text-gris">{hint}</span>}
      {children}
      <ErrorText message={error} />
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  error,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={error ? "field-error" : "field-input"}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  error,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(error ? "field-error" : "field-input", "appearance-none")}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function ChipGroup({
  name,
  value,
  onChange,
  options,
  column,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  column?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", column && "flex-col")}>
      {options.map((opt) => (
        <label key={opt.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          <span className={value === opt.value ? "chip-selected" : "chip"}>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export function CheckboxField({
  checked,
  onChange,
  label,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  error?: string;
}) {
  return (
    <div className="mb-3.5">
      <label className="flex cursor-pointer items-start gap-2.5 text-[15px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-[22px] w-[22px] flex-shrink-0 accent-noir"
        />
        <span>{label}</span>
      </label>
      <ErrorText message={error} />
    </div>
  );
}
