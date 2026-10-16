import { z } from "zod";

// Response of GET /health. Shared so the web app gets the same type the API returns.
export const healthSchema = z.object({
  status: z.literal("ok"),
  database: z.enum(["up", "down"]),
  time: z.string(),
});

export type Health = z.infer<typeof healthSchema>;
