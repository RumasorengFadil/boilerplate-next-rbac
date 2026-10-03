import "server-only";
import { redirect } from "next/navigation";
import { type Permission, hasPermission } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session";

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) redirect("/dashboard?error=forbidden");
  return user;
}
