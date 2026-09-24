"use client";

import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/site/brand/Icon";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

function ErrorLine({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={{ duration: 0.28, ease: EASE.swift }}
          className="flex items-center gap-1.5 overflow-hidden pt-2 text-[0.75rem] text-rose-300"
        >
          <Icon name="alert" className="h-3.5 w-3.5" />
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
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
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && visible ? "text" : type;

  return (
    <div className={cn("group/field", containerClassName)}>
      <label
        htmlFor={fieldId}
        className="mb-2 flex items-center justify-between text-[0.72rem] font-medium tracking-[0.18em] text-white/60 uppercase transition-colors duration-300 group-focus-within/field:text-brand-200"
      >
        {label}
        {hint ? <span className="text-[0.66rem] tracking-normal text-white/55 normal-case">{hint}</span> : null}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={resolvedType}
          aria-invalid={error ? "true" : undefined}
          className={cn("field", isPassword && "pr-12", className)}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-white/55 transition hover:bg-white/5 hover:text-brand-200"
          >
            <Icon name={visible ? "eyeOff" : "eye"} className="h-4 w-4" />
          </button>
        ) : null}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-gradient-to-r from-brand-400 to-transparent transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/field:scale-x-100"
        />
      </div>
      <ErrorLine message={error} />
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

  return (
    <div className={cn("group/field", containerClassName)}>
      <label
        htmlFor={fieldId}
        className="mb-2 flex items-center justify-between text-[0.72rem] font-medium tracking-[0.18em] text-white/60 uppercase transition-colors duration-300 group-focus-within/field:text-brand-200"
      >
        {label}
        {hint ? <span className="text-[0.66rem] tracking-normal text-white/55 normal-case">{hint}</span> : null}
      </label>
      <textarea
        id={fieldId}
        aria-invalid={error ? "true" : undefined}
        className={cn("field min-h-[9.5rem] resize-y leading-relaxed", className)}
        {...rest}
      />
      <ErrorLine message={error} />
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  id,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  id?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <label
      htmlFor={fieldId}
      className="flex cursor-pointer items-center gap-3 text-[0.82rem] text-white/60 transition select-none hover:text-white/85"
    >
      <span className="relative inline-flex h-[1.15rem] w-[1.15rem] items-center justify-center">
        <input
          id={fieldId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "absolute inset-0 rounded-[6px] border transition-all duration-300",
            checked
              ? "border-brand-400 bg-brand-500 shadow-[0_0_14px_-2px_rgba(43,108,255,0.9)]"
              : "border-white/20 bg-white/5",
          )}
        />
        <AnimatePresence>
          {checked ? (
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE.swift }}
              className="relative text-white"
            >
              <Icon name="check" className="h-3 w-3" strokeWidth={3} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
      {label}
    </label>
  );
}

export function FormStatus({ status, message }: { status: "idle" | "error" | "success"; message?: string }) {
  return (
    <AnimatePresence mode="wait">
      {status !== "idle" && message ? (
        <motion.div
          key={`${status}-${message}`}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.32, ease: EASE.swift }}
          className={cn(
            "flex items-center gap-2.5 overflow-hidden rounded-[28px] border px-4 py-3 text-[0.82rem]",
            status === "error"
              ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
              : "border-brand-400/30 bg-brand-500/10 text-brand-100",
          )}
        >
          <Icon name={status === "error" ? "alert" : "check"} className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
