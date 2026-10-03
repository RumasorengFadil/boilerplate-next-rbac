import { Role } from "@prisma/client";

export type Permission = "projects:read" | "projects:create" | "users:read";

const grants: Record<Role, Permission[]> = {
  ADMIN: ["projects:read", "projects:create", "users:read"],
  MEMBER: ["projects:read", "projects:create"],
};

export function hasPermission(role: Role, permission: Permission) {
  return grants[role].includes(permission);
}
