"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  HardHat,
  Building2,
  Package,
  Receipt,
  Wallet,
  BarChart3,
  // Settings,
  LogOut,
} from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  // SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogoMark } from "@/app/(auth)/login/logo-mark";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, initials } from "@/lib/user-display";
import { Button } from "../ui/button";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  roles?: Role[];
  badge?: { text: string; variant: "sky" | "amber" };
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/appointments", label: "المواعيد", icon: Calendar, },
  { href: "/patients", label: "المرضى", icon: Users },
  { href: "/doctors", label: "الأطباء", icon: Stethoscope, roles: ["SUPER_ADMIN"] },
  { href: "/assistants", label: "المساعدين", icon: HardHat, roles: ["SUPER_ADMIN"] },
  { href: "/branches", label: "الفروع", icon: Building2, roles: ["SUPER_ADMIN"] },
  {
    href: "/inventory",
    label: "المخزون",
    icon: Package,
    roles: ["SUPER_ADMIN"],
  },
  { href: "/invoices", label: "الفواتير", icon: Receipt, roles: ["SUPER_ADMIN"] },
  { href: "/expenses", label: "المصروفات", icon: Wallet, roles: ["SUPER_ADMIN"] },
  { href: "/reports", label: "التقارير", icon: BarChart3, roles: ["SUPER_ADMIN"] },
];

// TODO: عيد تفعيل الإعدادات لما صفحة /settings تتبني
// const SETTINGS_ITEM: NavItem = {
//   href: "/settings",
//   label: "الإعدادات",
//   icon: Settings,
//   roles: ["SUPER_ADMIN"],
// };

export function Sidebar({ user }: { user: { name: string; role: Role } }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));
  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };
  // const showSettings = !SETTINGS_ITEM.roles || SETTINGS_ITEM.roles.includes(user.role);
  return (
    <SidebarPrimitive side="right" collapsible="offcanvas" className="border-e">
      <SidebarHeader className="h-16 flex-row items-center justify-start gap-3.5 border-b px-3 py-0">
        <div className="flex size-7 items-center justify-center rounded-[7px] bg-primary">
          <LogoMark className="size-4 text-white" />
        </div>
        <p className="text-sm font-bold text-foreground">DentaFlow</p>
      </SidebarHeader>

      <SidebarContent className="gap-3 px-3 py-3">
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={active}
                  className="h-11 gap-2 rounded-md px-3 text-sm font-medium text-slate-600   data-active:bg-sky-500 data-active:font-semibold data-active:text-white"
                  render={<Link href={item.href} onClick={handleNavClick} />}
                >
                  <item.icon className="size-5" strokeWidth={1.8} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <SidebarMenuBadge
                      className={
                        cn(
                          "ms-auto",
                        item.badge.variant === "sky"
                          ? "static rounded-full bg-sky-500 px-2 text-white"
                          : "static rounded-full bg-amber-500 px-2 text-amber-100")
                      }
                    >
                      {item.badge.text}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* {showSettings && (
          <>
            <SidebarSeparator className="mx-0" />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith(SETTINGS_ITEM.href)}
                  className="h-11  gap-2 rounded-md px-3 text-sm font-medium text-slate-600 data-active:border-e-2 data-active:border-primary data-active:bg-sky-100 data-active:font-semibold data-active:text-sky-700"
                  render={<Link href={SETTINGS_ITEM.href} />}
                >
                  <SETTINGS_ITEM.icon className="size-5" strokeWidth={1.8} />
                  <span>{SETTINGS_ITEM.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )} */}
      </SidebarContent>

      <SidebarFooter className="h-18 flex-row items-center justify-between border-t px-3 py-0">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-sky-100 text-sky-700">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col  gap-0.5 ">
            <p className="text-[13px] font-semibold text-foreground">{user.name}</p>
            <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button
          variant="destructive"
            type="submit"
            className="flex size-8 items-center justify-center"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="size-5 rotate-180" strokeWidth={1.8} />
          </Button>
        </form>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
