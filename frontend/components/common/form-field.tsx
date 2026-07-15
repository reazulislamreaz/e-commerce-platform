'use client';
import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Visually hide the label (still announced to screen readers) for placeholder-led minimal forms. */
  hideLabel?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, hint, hideLabel, className, type, ...props },
  ref,
) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className={cn('mb-1.5 block text-sm font-medium text-zinc-700', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-lg border border-zinc-300 bg-card px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold/20',
            isPassword && 'pr-11',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-100',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-gold"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-zinc-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
});
