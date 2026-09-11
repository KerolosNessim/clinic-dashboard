import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Plus, Pencil, HardHat } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getUsers, getBranchOptions } from "@/lib/data/users";
import { Button } from "@/components/ui/button";
import { DataTable, DataTablePrimaryCell, type DataTableColumn } from "@/components/shared/data-table";
import { ToggleActiveSwitch } from "@/components/shared/toggle-active-switch";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { DeleteUserButton } from "@/components/users/delete-user-button";
import { toggleUserActive } from "@/lib/actions/users";
import { initials } from "@/lib/user-display";

type AssistantRow = Awaited<ReturnType<typeof getUsers>>[number];

export default async function AssistantsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") notFound();

  const [assistants, branchOptions] = await Promise.all([getUsers("STAFF"), getBranchOptions()]);

  const columns: DataTableColumn<AssistantRow>[] = [
    {
      id: "assistant",
      header: "المساعد",
      cell: (a) => <DataTablePrimaryCell title={a.name} subtitle={a.phone} avatarText={initials(a.name)} />,
    },
    {
      id: "branches",
      header: "الفروع",
      hideBelow: "md",
      cell: (a) =>
        a.branches.length > 0 ? (
          <span className="text-slate-600">{a.branches.map((b) => b.branch.name).join("، ")}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      id: "status",
      header: "الحالة",
      cell: (a) => <ToggleActiveSwitch id={a.id} initialActive={a.isActive} action={toggleUserActive} />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">المساعدين</h1>
        <UserFormDialog
          branches={branchOptions}
          fixedRole="STAFF"
          entityLabel="مساعد"
          triggerLabel="مساعد جديد"
          triggerIcon={<Plus data-icon="inline-end" />}
        />
      </div>

      <DataTable
        columns={columns}
        data={assistants}
        getRowId={(a) => a.id}
        rowHref={(a) => `/assistants/${a.id}`}
        actions={(a) => (
          <div className="flex items-center gap-1.5">
            <Button variant="sky" nativeButton={false} render={<Link href={`/assistants/${a.id}`} />}>
              عرض
              <Eye data-icon="inline-end" />
            </Button>
            <UserFormDialog
              user={a}
              branches={branchOptions}
              fixedRole="STAFF"
              entityLabel="مساعد"
              triggerLabel="تعديل"
              triggerVariant="amber"
              triggerIcon={<Pencil data-icon="inline-end" />}
            />
            <DeleteUserButton userId={a.id} userName={a.name} entityLabel="المساعد" />
          </div>
        )}
        empty={{ icon: HardHat, title: "لا يوجد مساعدين", description: "ابدأ بإضافة أول مساعد" }}
      />
    </div>
  );
}
