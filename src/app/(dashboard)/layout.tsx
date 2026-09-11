import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": "240px" } as React.CSSProperties}
      className="min-h-screen w-full"
    >
      <Sidebar user={{ name: user.name ?? "", role: user.role }} />
      <SidebarInset className="bg-slate-50">
        <Topbar user={{ name: user.name ?? "", role: user.role }} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
