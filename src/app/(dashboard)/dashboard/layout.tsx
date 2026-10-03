import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { requireUser } from "@/server/authorization";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) { const user = await requireUser(); return <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[15rem_1fr]"><Sidebar role={user.role} /><div><Header name={user.name} role={user.role} /><main className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</main></div></div>; }
