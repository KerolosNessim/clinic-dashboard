import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Plus, Pencil, Stethoscope } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getUsers, getBranchOptions } from "@/lib/data/users";
import { Button } from "@/components/ui/button";
import { DataTable, DataTablePrimaryCell, type DataTableColumn } from "@/components/shared/data-table";
import { ToggleActiveSwitch } from "@/components/shared/toggle-active-switch";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import { toggleUserActive } from "@/lib/actions/users";
import { initials } from "@/lib/user-display";

type DoctorRow = Awaited<ReturnType<typeof getUsers>>[number];

export default async function DoctorsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") notFound();

  const [doctors, branchOptions] = await Promise.all([getUsers("DOCTOR"), getBranchOptions()]);

  const columns: DataTableColumn<DoctorRow>[] = [
    {
      id: "doctor",
      header: "الطبيب",
      cell: (d) => <DataTablePrimaryCell title={d.name} subtitle={d.phone} avatarText={initials(d.name)} />,
    },
    {
      id: "branches",
      header: "الفروع",
      hideBelow: "md",
      cell: (d) =>
        d.branches.length > 0 ? (
          <span className="text-slate-600">{d.branches.map((b) => b.branch.name).join("، ")}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      id: "status",
      header: "الحالة",
      cell: (d) => <ToggleActiveSwitch id={d.id} initialActive={d.isActive} action={toggleUserActive} />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">الأطباء</h1>
        <UserFormDialog
          branches={branchOptions}
          fixedRole="DOCTOR"
          entityLabel="طبيب"
          triggerLabel="طبيب جديد"
          triggerIcon={<Plus data-icon="inline-end" />}
        />
      </div>

      <DataTable
        columns={columns}
        data={doctors}
        getRowId={(d) => d.id}
        rowHref={(d) => `/doctors/${d.id}`}
        actions={(d) => (
          <div className="flex items-center gap-1.5">
            <Button variant="sky" nativeButton={false} render={<Link href={`/doctors/${d.id}`} />}>
              عرض
              <Eye data-icon="inline-end" />
            </Button>
            <UserFormDialog
              user={d}
              branches={branchOptions}
              fixedRole="DOCTOR"
              entityLabel="طبيب"
              triggerLabel="تعديل"
              triggerVariant="amber"
              triggerIcon={<Pencil data-icon="inline-end" />}
            />
            <DeleteUserButton userId={d.id} userName={d.name} entityLabel="الطبيب" />
          </div>
        )}
        empty={{ icon: Stethoscope, title: "لا يوجد أطباء", description: "ابدأ بإضافة أول طبيب" }}
      />
    </div>
  );
}
