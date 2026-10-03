import { Role } from "@prisma/client";

export type Permission = "dashboard:read" | "projects:read" | "projects:create" | "users:read" | "users:manage" | "ai:manage" | "content:read" | "content:write" | "content:publish" | "leads:read" | "leads:write" | "analytics:read" | "operations:manage";

const grants: Record<Role, Permission[]> = {
  SUPER_ADMIN: ["dashboard:read", "projects:read", "projects:create", "users:read", "users:manage", "ai:manage", "content:read", "content:write", "content:publish", "leads:read", "leads:write", "analytics:read", "operations:manage"],
  ADMIN: ["dashboard:read", "projects:read", "projects:create", "users:read", "ai:manage", "content:read", "content:write", "content:publish", "leads:read", "leads:write", "analytics:read", "operations:manage"],
  CONTENT_EDITOR: ["dashboard:read", "content:read", "content:write"],
  MARKETING: ["dashboard:read", "content:read", "content:write", "content:publish", "leads:read", "leads:write", "analytics:read"],
  SALES: ["dashboard:read", "leads:read", "leads:write", "analytics:read"],
  MEMBER: ["dashboard:read", "projects:read", "projects:create"],
};

export function hasPermission(role: Role, permission: Permission) {
  return grants[role].includes(permission);
}
