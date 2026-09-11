import Link from "next/link";
import { Eye, Pencil, Plus, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getPatients, getPatientFilterOptions, type PatientFilters } from "@/lib/data/patients";
import { Button } from "@/components/ui/button";
import { DataTable, DataTablePrimaryCell, type DataTableColumn } from "@/components/shared/data-table";
import { PatientsFilters } from "@/components/patients/patients-filters";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { DeletePatientButton } from "@/components/patients/delete-patient-button";

type PatientRow = Awaited<ReturnType<typeof getPatients>>["patients"][number];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const filters: PatientFilters = {
    search: sp.q,
    branchId: sp.branch,
    doctorId: sp.doctor,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [{ patients, total, page, pageSize }, filterOptions] = await Promise.all([
    getPatients(filters, user.role, user.branches),
    getPatientFilterOptions(user.role, user.branches),
  ]);

  const showBranchSelectInForm = user.role !== "STAFF" || user.branches.length > 1;

  const columns: DataTableColumn<PatientRow>[] = [
    {
      id: "patient",
      header: "المريض",
      cell: (p) => (
        <DataTablePrimaryCell
          title={p.fullName}
          avatarText={initials(p.fullName)}
        />
      ),
    },
    {
      id: "phone",
      header: "الهاتف",
      cell: (p) => <span dir="ltr" className="text-slate-600">{p.phone}</span>,
    },
    {
      id: "branch",
      header: "الفرع",
      hideBelow: "md",
      cell: (p) => <span className="text-slate-600">{p.registrationBranch.name}</span>,
    },
    {
      id: "lastVisit",
      header: "آخر زيارة",
      hideBelow: "sm",
      cell: (p) =>
        p.visits[0] ? (
          <span className="font-medium text-slate-700">{formatDate(p.visits[0].dateTime)}</span>
        ) : (
          <span className="text-slate-400">لا يوجد</span>
        ),
    },
    {
      id: "doctor",
      header: "الطبيب",
      hideBelow: "lg",
      cell: (p) => <span className="text-slate-600">{p.visits[0]?.doctor.name ?? "—"}</span>,
    },
    {
      id: "referral",
      header: "مصدر الترشيح",
      hideBelow: "lg",
      cell: (p) => <span className="text-slate-600">{p.referralSource ?? "—"}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">المرضى</h1>
        <PatientFormDialog
          branches={filterOptions.branches}
          showBranchSelect={showBranchSelectInForm}
          defaultBranchId={user.branches[0] ?? filterOptions.branches[0]?.id ?? ""}
          triggerLabel="مريض جديد"
          triggerIcon={<Plus data-icon="inline-end" />}
        />
      </div>

      <PatientsFilters
        branches={user.role === "SUPER_ADMIN" ? filterOptions.branches : []}
        doctors={filterOptions.doctors}
      />

      <DataTable
        columns={columns}
        data={patients}
        getRowId={(p) => p.id}
        rowHref={(p) => `/patients/${p.id}`}
        actions={(p) => (
          <div className="flex items-center  gap-1.5">
            <Button variant="sky"  nativeButton={false} render={<Link href={`/patients/${p.id}`} />}>
              عرض
              <Eye data-icon="inline-end" />
            </Button>
            <PatientFormDialog
              patient={p}
              branches={filterOptions.branches}
              showBranchSelect={showBranchSelectInForm}
              defaultBranchId={p.registrationBranchId}
              triggerLabel="تعديل"
              triggerVariant="amber"
              triggerIcon={<Pencil data-icon="inline-end" />}
            />
            {user.role === "SUPER_ADMIN" && (
              <DeletePatientButton patientId={p.id} patientName={p.fullName} />
            )}
          </div>
        )}
        empty={{
          icon: Users,
          title: "لا يوجد مرضى",
          description: "ابدأ بإضافة أول مريض",
        }}
        pagination={{
          page,
          pageSize,
          total,
          basePath: "/patients",
          searchParams: { q: filters.search, branch: filters.branchId, doctor: filters.doctorId },
        }}
      />
    </div>
  );
}
