"use client";

import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { Icon } from "@/components/site/brand/Icon";
import { cn } from "@/lib/utils";

/**
 * Form fields for the website: a visible label above, the `.field` box from
 * styles/site.css, and an error line tied to the control with
 * aria-describedby so a screen reader announces it with the field.
 */

function Label({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-[0.875rem] font-medium text-fg">
      {label}
      {hint ? <span className="text-[0.8rem] font-normal text-fg-subtle">{hint}</span> : null}
    </label>
  );
}

function ErrorLine({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[0.825rem] text-[#b3202f]">
      <Icon name="alert" className="h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
};

export function TextField({
  label,
  error,
  hint,
  className,
  containerClassName,
  id,
  type = "text",
  ...rest
}: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const errorId = `${fieldId}-error`;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={containerClassName}>
      <Label htmlFor={fieldId} label={label} hint={hint} />
      <div className="relative">
        <input
          id={fieldId}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn("field", isPassword && "pr-12", className)}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-[var(--radius-s)] p-1.5 text-fg-subtle hover:text-fg"
          >
            <Icon name={visible ? "eyeOff" : "eye"} className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <ErrorLine id={errorId} message={error} />
    </div>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
};

export function TextArea({ label, error, hint, className, containerClassName, id, ...rest }: TextAreaProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const errorId = `${fieldId}-error`;

  return (
    <div className={containerClassName}>
      <Label htmlFor={fieldId} label={label} hint={hint} />
      <textarea
        id={fieldId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn("field min-h-[9rem] resize-y", className)}
        {...rest}
      />
      <ErrorLine id={errorId} message={error} />
    </div>
  );
}

export function FormStatus({ status, message }: { status: "idle" | "error" | "success"; message?: string }) {
  if (status === "idle" || !message) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-m)] border px-4 py-3 text-[0.9rem]",
        status === "error"
          ? "border-[#f0c2c7] bg-[#fdf2f3] text-[#8f1a26]"
          : "border-[#b9d0fb] bg-brand-subtle text-site-blue-deep",
      )}
    >
      <Icon name={status === "error" ? "alert" : "check"} className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
