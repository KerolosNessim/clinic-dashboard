import { notFound } from "next/navigation";
import { Wallet, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  getExpenses,
  getExpenseSummary,
  getExpenseFilterOptions,
  CATEGORY_OPTIONS,
  type ExpenseFilters as ExpenseFiltersType,
  type ExpenseListRow,
} from "@/lib/data/expenses";
import { DataTable, DataTablePrimaryCell, type DataTableColumn } from "@/components/shared/data-table";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
);

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") notFound();

  const sp = await searchParams;

  const filters: ExpenseFiltersType = {
    search: sp.q,
    branchId: sp.branch,
    category: sp.category,
    from: sp.from,
    to: sp.to,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [{ expenses, total, page, pageSize }, summary, filterOptions] = await Promise.all([
    getExpenses(filters),
    getExpenseSummary(filters),
    getExpenseFilterOptions(),
  ]);

  const columns: DataTableColumn<ExpenseListRow>[] = [
    {
      id: "description",
      header: "اتصرف على إيه",
      cell: (e) => (
        <DataTablePrimaryCell title={e.description} subtitle={e.branch.name} avatarText={e.description.slice(0, 2)} />
      ),
    },
    {
      id: "category",
      header: "الفئة",
      hideBelow: "sm",
      cell: (e) => <span className="text-slate-600">{CATEGORY_LABEL[e.category] ?? e.category}</span>,
    },
    {
      id: "amount",
      header: "المبلغ",
      cell: (e) => <span className="font-medium text-slate-700">{formatCurrency(Number(e.amount))}</span>,
    },
    {
      id: "date",
      header: "التاريخ",
      hideBelow: "sm",
      cell: (e) => <span className="text-slate-600">{formatDate(e.date)}</span>,
    },
    {
      id: "recurring",
      header: "متكرر؟",
      hideBelow: "md",
      cell: (e) =>
        e.isRecurring ? (
          <Badge className="rounded-full bg-amber-100 text-amber-800">شهري</Badge>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      id: "recordedBy",
      header: "سجّله",
      hideBelow: "lg",
      cell: (e) => <span className="text-slate-600">{e.recordedByUser.name}</span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">المصروفات</h1>
        <ExpenseFormDialog
          branches={filterOptions.branches}
          triggerLabel="مصروف جديد"
          triggerIcon={<Plus data-icon="inline-end" />}
        />
      </div>

      <div className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <Wallet className="size-5" strokeWidth={1.8} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">إجمالي المصروفات (حسب الفلتر الحالي)</p>
        <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.total)}</p>
        {summary.byBranch.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            {summary.byBranch.map((b) => (
              <span key={b.branchId}>
                {b.branchName}: <span className="font-medium text-slate-700">{formatCurrency(b.total)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <ExpenseFilters branches={filterOptions.branches} />

      <DataTable
        columns={columns}
        data={expenses}
        getRowId={(e) => e.id}
        actions={(e) => (
          <div className="flex items-center gap-1.5">
            <ExpenseFormDialog
              branches={filterOptions.branches}
              triggerLabel="تعديل"
              triggerVariant="amber"
              expense={{
                id: e.id,
                description: e.description,
                amount: Number(e.amount),
                branchId: e.branchId,
                category: e.category,
                date: e.date,
                isRecurring: e.isRecurring,
              }}
            />
            <DeleteExpenseButton expenseId={e.id} description={e.description} />
          </div>
        )}
        empty={{ icon: Wallet, title: "لا توجد مصروفات", description: "ابدأ بتسجيل أول مصروف" }}
        pagination={{
          page,
          pageSize,
          total,
          basePath: "/expenses",
          searchParams: {
            q: filters.search,
            branch: filters.branchId,
            category: filters.category,
            from: filters.from,
            to: filters.to,
          },
        }}
      />
    </div>
  );
}
