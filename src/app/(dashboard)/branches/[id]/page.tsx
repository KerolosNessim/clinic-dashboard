import { notFound } from "next/navigation";
import { Pencil, Calendar, Stethoscope } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getBranchDetail } from "@/lib/data/branches";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { DeleteBranchButton } from "@/components/branches/delete-branch-button";
import { ROLE_LABEL, initials } from "@/lib/user-display";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
    </div>
  );
}

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") notFound();

  const { id } = await params;
  const detail = await getBranchDetail(id);
  if (!detail) notFound();

  const { branch, appointments, visits, patientCount } = detail;

  return (
    <div className="mx-auto w-full max-w-350 px-6 py-8 sm:px-8">
      <div className="sticky top-12 z-5 -mx-6 mb-4 border-b border-border bg-slate-50/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="bg-sky-100 text-sky-700">{initials(branch.name)}</AvatarFallback>
            </Avatar>
            <div className="text-right">
              <h1 className="text-lg font-bold text-foreground">{branch.name}</h1>
              <p className="text-xs text-muted-foreground">{branch.city}</p>
            </div>
            <Badge variant={branch.isActive ? "default" : "destructive"} className="ms-2">
              {branch.isActive ? "نشط" : "معطّل"}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 max-md:self-end ">
            <BranchFormDialog
              branch={branch}
              triggerLabel="تعديل"
              triggerVariant="amber"
              triggerIcon={<Pencil data-icon="inline-end" />}
            />
            <DeleteBranchButton branchId={branch.id} branchName={branch.name} redirectTo="/branches" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-6 lg:col-span-1">
          <div className="grid grid-cols-1 gap-4">
            <InfoRow label="العنوان" value={branch.address} />
            <InfoRow label="الهواتف" value={<span dir="ltr">{branch.phones.join(", ")}</span>} />
            <InfoRow label="البريد الإلكتروني" value={branch.email} />
            <InfoRow label="عدد المرضى المسجّلين" value={patientCount} />
          </div>

          <p className="mt-5 mb-3 text-sm font-semibold text-foreground">المستخدمون المعيّنون</p>
          {branch.users.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {branch.users.map((u) => (
                <Badge key={u.user.id} variant="secondary">
                  {u.user.name} · {ROLE_LABEL[u.user.role]}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا يوجد مستخدمون معيّنون</p>
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
                    <p className="text-xs text-muted-foreground">{a.doctor.name}</p>
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
                    <p className="text-xs text-muted-foreground">{v.doctor.name}</p>
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
