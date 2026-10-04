import { z } from "zod";
import { contentInputSchema } from "../cms/schema";

export const portfolioSlugSchema = z.string().trim().min(2).max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(value => !/^\d+$/.test(value) && !z.uuid().safeParse(value).success, "Use a descriptive slug, not a number/UUID.");
export const portfolioRouteSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const portfolioInputSchema = contentInputSchema.superRefine((input, context) => {
  if (input.kind !== "CASE_STUDY") context.addIssue({ code: "custom", path: ["kind"], message: "Portfolio requires CASE_STUDY." });
  if (!portfolioSlugSchema.safeParse(input.slug).success) context.addIssue({ code: "custom", path: ["slug"], message: "Use a descriptive portfolio slug." });
});
export const portfolioLifecycleSchema = z.object({ id: z.uuid(), version: z.number().int().min(1), operation: z.enum(["archive", "restore"]) }).strict();
