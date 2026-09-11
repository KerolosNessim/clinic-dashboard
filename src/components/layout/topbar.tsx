"use client";

import { LogOut } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogoMark } from "@/app/(auth)/login/logo-mark";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABEL, initials } from "@/lib/user-display";

export function Topbar({ user }: { user: { name: string; role: Role } }) {
  return (
    <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-white px-3">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary">
            <LogoMark className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">DentaFlow</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-sky-100 text-xs text-sky-700">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-col sm:flex">
            <p className="text-xs font-semibold text-foreground">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button
            variant="destructive"
            size="icon-sm"
            type="submit"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="size-4 rotate-180" strokeWidth={1.8} />
          </Button>
        </form>
      </div>
    </div>
  );
}
