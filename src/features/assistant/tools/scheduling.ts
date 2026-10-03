import { z } from "zod";
// Extension contract only. The assistant must not claim a booking was confirmed.
export const consultationRequestSchema = z.object({
  topic: z.string().trim().min(3).max(500),
  timezone: z.string().min(1).max(100),
  conversationId: z.string().uuid(),
});
export interface ConsultationScheduler {
  availability(timezone: string): Promise<Array<{ startsAt: string; endsAt: string }>>;
  request(input: z.infer<typeof consultationRequestSchema>): Promise<{ status: "requested"; reference: string }>;
}
