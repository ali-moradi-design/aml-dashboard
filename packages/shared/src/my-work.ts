import { z } from "zod";
import { alertRowSchema } from "./domain";
import { caseRowSchema } from "./views";
import { localizedTextSchema } from "./workflow";

/** How long an assigned alert may wait before it counts as overdue. */
export const alertSlaHours = { HIGH: 24, MEDIUM: 72, LOW: 120 } as const;

export const myWorkSchema = z.object({
  alerts: z.array(alertRowSchema.extend({ slaDueAt: z.string() })),
  alertsTotal: z.number(),
  /** Cases where the workflow engine offers this user an action right now. */
  cases: z.array(
    caseRowSchema.extend({
      stepName: localizedTextSchema,
      slaDueAt: z.string().nullable(),
      actions: z.array(z.object({ id: z.string(), label: localizedTextSchema, blocked: z.enum(["findings", "fourEyes"]).nullable() })),
    }),
  ),
  mentions: z.array(z.object({ id: z.string(), caseCode: z.string(), caseTitle: z.string(), authorName: z.string(), body: z.string(), createdAt: z.string() })),
});
export type MyWork = z.infer<typeof myWorkSchema>;
