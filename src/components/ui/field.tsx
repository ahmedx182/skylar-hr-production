import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { focusRing } from "@/components/ui/focus-ring";
import { cn } from "@/lib/utils/cn";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/** Labelled input. Errors use `attention`, not `risk`: red is reserved for genuine risk (§46). */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm text-paper-2">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "mt-2 h-[52px] w-full rounded-xl border border-paper/12 bg-paper/[0.055] px-4 text-paper placeholder:text-paper-3",
          "aria-[invalid=true]:border-attention",
          focusRing,
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-2 text-sm text-attention">
          {error}
        </p>
      )}
    </div>
  );
});
