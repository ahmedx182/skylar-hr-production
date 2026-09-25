import type { ButtonHTMLAttributes } from "react";
import { focusRing } from "@/components/ui/focus-ring";
import { cn } from "@/lib/utils/cn";

const variants = {
  primary: "bg-paper text-ink hover:opacity-90 active:opacity-75",
  secondary: "border border-hairline text-paper hover:bg-ink-2 active:bg-ink-3",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-[52px] items-center justify-center rounded-md px-6 font-medium",
        "transition-[opacity,background-color] duration-150 motion-reduce:transition-none",
        "disabled:pointer-events-none disabled:opacity-40",
        focusRing,
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
