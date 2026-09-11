import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Plus, Pencil, Building2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getBranches } from "@/lib/data/branches";
import { Button } from "@/components/ui/button";
import { DataTable, DataTablePrimaryCell, type DataTableColumn } from "@/components/shared/data-table";
import { ToggleActiveSwitch } from "@/components/shared/toggle-active-switch";
import { BranchFormDialog } from "@/components/branches/branch-form-dialog";
import { DeleteBranchButton } from "@/components/branches/delete-branch-button";
import { toggleBranchActive } from "@/lib/actions/branches";
import { initials } from "@/lib/user-display";

type BranchRow = Awaited<ReturnType<typeof getBranches>>[number];

export default async function BranchesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") notFound();

  const branches = await getBranches();

  const columns: DataTableColumn<BranchRow>[] = [
    {
      id: "branch",
      header: "الفرع",
      cell: (b) => <DataTablePrimaryCell title={b.name} subtitle={b.city} avatarText={initials(b.name)} />,
    },
    {
      id: "address",
      header: "العنوان",
      hideBelow: "md",
      cell: (b) => <span className="text-slate-600">{b.address}</span>,
    },
    {
      id: "phones",
      header: "الهواتف",
      hideBelow: "lg",
      cell: (b) => (
        <span dir="ltr" className="text-slate-600">
          {b.phones.join(", ")}
        </span>
      ),
    },
    {
      id: "status",
      header: "الحالة",
      cell: (b) => <ToggleActiveSwitch id={b.id} initialActive={b.isActive} action={toggleBranchActive} />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">الفروع</h1>
        <BranchFormDialog triggerLabel="فرع جديد" triggerIcon={<Plus data-icon="inline-end" />} />
      </div>

      <DataTable
        columns={columns}
        data={branches}
        getRowId={(b) => b.id}
        rowHref={(b) => `/branches/${b.id}`}
        actions={(b) => (
          <div className="flex items-center gap-1.5">
            <Button variant="sky" nativeButton={false} render={<Link href={`/branches/${b.id}`} />}>
              عرض
              <Eye data-icon="inline-end" />
            </Button>
            <BranchFormDialog
              branch={b}
              triggerLabel="تعديل"
              triggerVariant="amber"
              triggerIcon={<Pencil data-icon="inline-end" />}
            />
            <DeleteBranchButton branchId={b.id} branchName={b.name} />
          </div>
        )}
        empty={{ icon: Building2, title: "لا يوجد فروع", description: "ابدأ بإضافة أول فرع" }}
      />
    </div>
  );
}
