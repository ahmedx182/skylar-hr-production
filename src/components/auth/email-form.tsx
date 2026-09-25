"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { loginSchema } from "@/schemas/auth.schema";

type EmailValues = z.infer<typeof loginSchema>;

interface EmailFormProps {
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (email: string) => Promise<void>;
}

/** Work-email form shared by login and the cross-device verify prompt. */
export function EmailForm({ submitLabel, pendingLabel, onSubmit }: EmailFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(loginSchema) });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(({ email }) => onSubmit(email))}
      className="mt-8 flex flex-col gap-4"
    >
      <Field
        label="Work email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
