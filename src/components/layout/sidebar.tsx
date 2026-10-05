import Link from "next/link";
import { FolderKanban, LayoutDashboard, Users } from "lucide-react";
import { type Permission, hasPermission } from "@/lib/permissions";
import { type Role } from "@prisma/client";

const items: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, permission: "dashboard:read" },
  { href: "/dashboard/projects", label: "Proyek", icon: FolderKanban, permission: "projects:read" },
  { href: "/dashboard/users", label: "Pengguna", icon: Users, permission: "users:read" },
  { href: "/dashboard/content", label: "Konten website", icon: FolderKanban, permission: "content:read" },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: FolderKanban, permission: "content:read" },
  { href: "/dashboard/products", label: "Produk", icon: FolderKanban, permission: "content:read" },
  { href: "/dashboard/ai", label: "LunaBiner AI", icon: LayoutDashboard, permission: "ai:manage" },
  { href: "/dashboard/leads", label: "Lead", icon: Users, permission: "leads:read" },
  { href: "/dashboard/analytics", label: "Analytics", icon: LayoutDashboard, permission: "analytics:read" },
  { href: "/dashboard/leads/scoring", label: "Aturan scoring", icon: Users, permission: "operations:manage" },
  { href: "/dashboard/consultations", label: "Konsultasi", icon: Users, permission: "leads:read" },
];

export function Sidebar({ role }: { role: Role }) {
  return <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r"><nav aria-label="Navigasi dashboard" className="flex gap-1 overflow-x-auto p-3 lg:flex-col">{items.filter((item) => hasPermission(role, item.permission)).map(({ href, label, icon: Icon }) => <Link className="flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-slate-700 hover:bg-slate-100" href={href} key={href}><Icon size={18} />{label}</Link>)}</nav></aside>;
}
