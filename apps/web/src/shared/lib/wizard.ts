import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { ZodType } from "zod";

/** Top-level field names of a step schema (refined Zod objects still expose `.shape`). */
const keysOf = (schema: ZodType | null) =>
  Object.keys((schema as unknown as { shape?: object } | null)?.shape ?? {});

/**
 * Per-step validation for multi-step forms: validates the current values against the step's
 * own Zod schema (including its cross-field rules) and writes the issues into the form.
 */
export const validateStep = <T extends FieldValues>(
  form: UseFormReturn<T>,
  schema: ZodType | null,
): boolean => {
  if (!schema) return true;
  const result = schema.safeParse(form.getValues());
  keysOf(schema).forEach((k) => form.clearErrors(k as Path<T>));
  if (result.success) return true;
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (path) form.setError(path as Path<T>, { type: "step", message: issue.message });
  }
  return false;
};

/** Index of the step that owns an error path (to jump there after a server error). */
export const stepOfPath = (steps: ReadonlyArray<{ schema: ZodType | null }>, path: string) => {
  const top = path.split(".")[0]!;
  return steps.findIndex((s) => keysOf(s.schema).includes(top));
};
