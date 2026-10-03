import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";

export function Header({ name, role }: { name: string; role: string }) { return <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6"><div><p className="text-sm font-medium text-slate-950">{name}</p><p className="text-xs text-slate-500">{role}</p></div><form action={logoutAction}><Button className="flex items-center gap-2 bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"><LogOut size={16} />Keluar</Button></form></header>; }
