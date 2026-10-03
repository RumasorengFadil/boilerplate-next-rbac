import { Role } from "@prisma/client";

export type Permission = "projects:read" | "projects:create" | "users:read" | "ai:manage";

const grants: Record<Role, Permission[]> = {
  ADMIN: ["projects:read", "projects:create", "users:read", "ai:manage"],
  MEMBER: ["projects:read", "projects:create"],
};

export function hasPermission(role: Role, permission: Permission) {
  return grants[role].includes(permission);
}
