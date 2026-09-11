import { notFound } from "next/navigation";
import { Pencil, Calendar, Receipt } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getAssistantDetail, getBranchOptions } from "@/lib/data/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import { initials } from "@/lib/user-display";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AssistantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") notFound();

  const { id } = await params;
  const [detail, branchOptions] = await Promise.all([getAssistantDetail(id), getBranchOptions()]);
  if (!detail) notFound();

  const { assistant, createdAppointments, expenses } = detail;

  return (
    <div className="mx-auto w-full max-w-350 px-6 py-8 sm:px-8">
      <div className="sticky top-12 z-5 -mx-6 mb-4 border-b border-border bg-slate-50/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="bg-sky-100 text-sky-700">{initials(assistant.name)}</AvatarFallback>
            </Avatar>
            <div className="text-right">
              <h1 className="text-lg font-bold text-foreground">{assistant.name}</h1>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {assistant.phone}
              </p>
            </div>
            <Badge variant={assistant.isActive ? "default" : "destructive"} className="ms-2">
              {assistant.isActive ? "نشط" : "معطّل"}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 max-md:self-end">
            <UserFormDialog
              user={assistant}
              branches={branchOptions}
              fixedRole="STAFF"
              entityLabel="مساعد"
              triggerLabel="تعديل"
              triggerVariant="amber"
              triggerIcon={<Pencil data-icon="inline-end" />}
            />
            <DeleteUserButton
              userId={assistant.id}
              userName={assistant.name}
              entityLabel="المساعد"
              redirectTo="/assistants"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-6 lg:col-span-1">
          <p className="mb-3 text-sm font-semibold text-foreground">الفروع</p>
          {assistant.branches.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {assistant.branches.map((b) => (
                <Badge key={b.branch.id} variant="secondary">
                  {b.branch.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا يوجد فروع معيّنة</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white lg:col-span-2">
          <p className="border-b border-border px-6 py-4 text-sm font-semibold text-foreground">
            آخر المواعيد التي أنشأها
          </p>
          {createdAppointments.length === 0 ? (
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Calendar />
                </EmptyMedia>
                <EmptyTitle>لا توجد مواعيد</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {createdAppointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-6 py-3">
                  <p className="text-sm font-medium text-foreground">{a.patient.fullName}</p>
                  <div className="text-left">
                    <p className="text-sm text-slate-700">{formatDate(a.dateTime)}</p>
                    <p className="text-xs text-muted-foreground">{a.branch.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white lg:col-span-3">
          <p className="border-b border-border px-6 py-4 text-sm font-semibold text-foreground">
            آخر المصروفات المسجّلة
          </p>
          {expenses.length === 0 ? (
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Receipt />
                </EmptyMedia>
                <EmptyTitle>لا توجد مصروفات مسجّلة</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{e.branch.name}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-slate-700">{Number(e.amount).toLocaleString("ar-EG")} ج.م</p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
