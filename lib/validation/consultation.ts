import { z } from "zod";

const futureDateTimeSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => Date.parse(value) > Date.now(), {
    message: "Must be a future date and time.",
  });

const updatedAtSchema = z.iso.datetime({ offset: true });

export const consultationPostSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(1).max(1000),
  scheduledAt: futureDateTimeSchema,
});

export const consultationPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setStatus"),
    status: z.literal("completed"),
    updatedAt: updatedAtSchema,
  }),
  z.object({
    action: z.literal("reschedule"),
    scheduledAt: futureDateTimeSchema,
    updatedAt: updatedAtSchema,
  }),
  z.object({
    action: z.literal("cancel"),
    updatedAt: updatedAtSchema,
  }),
]);

export const consultationIdSchema = z.guid();

export const consultationSchema = z.object({
  id: z.guid(),
  studentId: z.guid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  reason: z.string().min(1),
  scheduledAt: z.string().min(1),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const consultationRowSchema = z
  .object({
    id: z.guid(),
    student_id: z.guid(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    reason: z.string().min(1),
    scheduled_at: z.string().min(1),
    status: z.enum(["scheduled", "completed", "cancelled"]),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
  })
  .transform((row) => ({
    id: row.id,
    studentId: row.student_id,
    firstName: row.first_name,
    lastName: row.last_name,
    reason: row.reason,
    scheduledAt: row.scheduled_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  .pipe(consultationSchema);

export const consultationRowsSchema = z.array(consultationRowSchema);

export type CreateConsultationInput = z.infer<typeof consultationPostSchema>;
export type Consultation = z.infer<typeof consultationSchema>;
export type UpdateConsultationInput = z.infer<typeof consultationPatchSchema>;
