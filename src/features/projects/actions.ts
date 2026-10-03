"use server";
import { revalidatePath } from "next/cache";
import { createProjectSchema } from "@/features/projects/schema";
import { db } from "@/lib/db";
import { requirePermission } from "@/server/authorization";

export async function createProjectAction(formData: FormData) {
  const user = await requirePermission("projects:create");
  const parsed = createProjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await db.project.create({ data: { ...parsed.data, description: parsed.data.description || null, ownerId: user.id } });
  revalidatePath("/dashboard/projects");
}
