import { z } from "zod";

const shortText = z.string().trim().min(2).max(120);
const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter the employee's work email." }))
    .optional(),
);

export const createEmployeeSchema = z.object({
  name: shortText,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter the employee's work email." })),
  jobTitle: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(500).optional(),
});

export const createNoteSchema = z.object({
  employeeId: z.string().trim().min(1),
  note: z.string().trim().min(8).max(1000),
  statusDot: z.enum(["amber", "green", "red", "none"]).default("amber"),
});

export const updateEmployeeSchema = z.object({
  employeeId: z.string().trim().min(1),
  name: shortText,
  email: optionalEmail,
  jobTitle: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(500).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
