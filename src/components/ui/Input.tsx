import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, prefix, suffix, disabled, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? `input-${generatedId}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = !error && hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        ) : null}
        <span className="relative">
          {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{prefix}</span> : null}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId ?? hintId}
            className={clsx(
              'h-10 w-full rounded-input border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-soft transition-all duration-200',
              'placeholder:text-slate-400 focus:border-accent-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/25',
              prefix && 'pl-9',
              suffix && 'pr-9',
              disabled && 'cursor-not-allowed bg-slate-50 text-slate-400',
              error && 'border-rose-300 focus:border-rose-500 focus:ring-rose-300/30',
              className,
            )}
            {...props}
          />
          {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{suffix}</span> : null}
        </span>
        {error ? (
          <span id={errorId} className="text-xs text-rose-500">
            {error}
          </span>
        ) : null}
        {!error && hint ? (
          <span id={hintId} className="text-xs text-slate-500">
            {hint}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
