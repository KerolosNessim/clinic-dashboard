import { notFound } from "next/navigation";
import { Pencil, Calendar, Stethoscope } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getDoctorDetail, getBranchOptions } from "@/lib/data/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import { initials } from "@/lib/user-display";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") notFound();

  const { id } = await params;
  const [detail, branchOptions] = await Promise.all([getDoctorDetail(id), getBranchOptions()]);
  if (!detail) notFound();

  const { doctor, visits, appointments } = detail;

  return (
    <div className="mx-auto w-full max-w-350 px-6 py-8 sm:px-8">
      <div className="sticky top-12 z-5 -mx-6 mb-4 border-b border-border bg-slate-50/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="bg-sky-100 text-sky-700">{initials(doctor.name)}</AvatarFallback>
            </Avatar>
            <div className="text-right">
              <h1 className="text-lg font-bold text-foreground">{doctor.name}</h1>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {doctor.phone}
              </p>
            </div>
            <Badge variant={doctor.isActive ? "default" : "destructive"} className="ms-2">
              {doctor.isActive ? "نشط" : "معطّل"}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 max-md:self-end">
            <UserFormDialog
              user={doctor}
              branches={branchOptions}
              fixedRole="DOCTOR"
              entityLabel="طبيب"
              triggerLabel="تعديل"
              triggerVariant="amber"
              triggerIcon={<Pencil data-icon="inline-end" />}
            />
            <DeleteUserButton userId={doctor.id} userName={doctor.name} entityLabel="الطبيب" redirectTo="/doctors" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-6 lg:col-span-1">
          <p className="mb-3 text-sm font-semibold text-foreground">الفروع</p>
          {doctor.branches.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {doctor.branches.map((b) => (
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
            آخر المواعيد
          </p>
          {appointments.length === 0 ? (
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
              {appointments.map((a) => (
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
            آخر الزيارات
          </p>
          {visits.length === 0 ? (
            <Empty className="border-0 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Stethoscope />
                </EmptyMedia>
                <EmptyTitle>لا توجد زيارات</EmptyTitle>
                <EmptyDescription>لسه مفيش زيارات مسجلة لهذا الطبيب</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {visits.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.patient.fullName}</p>
                    <p className="text-xs text-muted-foreground">{v.procedure}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-slate-700">{formatDate(v.dateTime)}</p>
                    <p className="text-xs text-muted-foreground">{v.branch.name}</p>
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
