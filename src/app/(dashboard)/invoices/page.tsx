import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Receipt, ShieldQuestion, Wallet, AlertTriangle, Layers } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  getInvoices,
  getInvoiceSummary,
  getInvoiceFilterOptions,
  getPendingApprovalCount,
  type InvoiceFilters,
  type InvoiceListRow,
} from "@/lib/data/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTablePrimaryCell, type DataTableColumn } from "@/components/shared/data-table";
import { InvoicesFilters } from "@/components/invoices/invoices-filters";
import { PaymentDialog } from "@/components/invoices/payment-dialog";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceStatus } from "@/generated/prisma/client";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("");
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  PAID: "مدفوعة بالكامل",
  PARTIAL: "مدفوعة جزئياً",
  OVERDUE: "متأخرة السداد",
};

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-700",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") notFound();

  const sp = await searchParams;

  const filters: InvoiceFilters = {
    search: sp.q,
    branchId: sp.branch,
    status: sp.status,
    method: sp.method,
    from: sp.from,
    to: sp.to,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [{ invoices, total, page, pageSize }, summary, filterOptions, pendingApprovals] = await Promise.all([
    getInvoices(filters, user.role, user.branches),
    getInvoiceSummary(user.role, user.branches),
    getInvoiceFilterOptions(user.role, user.branches),
    getPendingApprovalCount(),
  ]);

  const columns: DataTableColumn<InvoiceListRow>[] = [
    {
      id: "patient",
      header: "المريض",
      cell: (i) => <DataTablePrimaryCell title={i.patient.fullName} subtitle={i.patient.phone} avatarText={initials(i.patient.fullName)} />,
    },
    {
      id: "amount",
      header: "المبلغ",
      cell: (i) => <span className="font-medium text-slate-700">{formatCurrency(Number(i.total))}</span>,
    },
    {
      id: "method",
      header: "الطريقة",
      hideBelow: "sm",
      cell: (i) =>
        i.payments.length > 0 ? (
          <span className="text-slate-600">{METHOD_LABEL[i.payments[i.payments.length - 1].method]}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      id: "branch",
      header: "الفرع",
      hideBelow: "md",
      cell: (i) => <span className="text-slate-600">{i.branch.name}</span>,
    },
    {
      id: "date",
      header: "التاريخ",
      hideBelow: "sm",
      cell: (i) => <span className="text-slate-600">{formatDate(i.createdAt)}</span>,
    },
    {
      id: "status",
      header: "الحالة",
      cell: (i) => <Badge className={cn("rounded-full", STATUS_CLASS[i.status])}>{STATUS_LABEL[i.status]}</Badge>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">الفواتير</h1>
        <Button
          variant="outline"
          className="h-11!"
          nativeButton={false}
          render={<Link href="/invoices/approvals" />}
        >
          <ShieldQuestion data-icon="inline-end" />
          طلبات المراجعة
          {pendingApprovals > 0 && (
            <Badge className="ms-1.5 rounded-full bg-amber-500 text-amber-50">{pendingApprovals}</Badge>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="size-5" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold tracking-[0.06em] text-slate-400">إجمالي المدفوع</p>
          </div>
          <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="size-5" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold tracking-[0.06em] text-slate-400">متأخر السداد</p>
          </div>
          <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">
            {formatCurrency(summary.overdueTotal)}
          </p>
          <p className="mt-1 text-xs font-medium text-red-600">{summary.overdueCount} فاتورة</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Layers className="size-5" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold tracking-[0.06em] text-slate-400">تقسيط جارٍ</p>
          </div>
          <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">{summary.installmentCount}</p>
          <p className="mt-1 text-xs font-medium text-amber-600">{summary.installmentPatients} عميل</p>
        </div>
      </div>

      <InvoicesFilters branches={filterOptions.branches} />

      <DataTable
        columns={columns}
        data={invoices}
        getRowId={(i) => i.id}
        actions={(i) => (
          <div className="flex items-center gap-1.5">
            {i.status !== "PAID" && (
              <PaymentDialog
                invoiceId={i.id}
                remainingAmount={Number(i.total) - i.payments.reduce((sum, p) => sum + Number(p.amount), 0)}
              />
            )}
            <Button variant="sky" nativeButton={false} render={<Link href={`/invoices/${i.id}`} />}>
              عرض
              <Eye data-icon="inline-end" />
            </Button>
          </div>
        )}
        empty={{ icon: Receipt, title: "لا توجد فواتير", description: "الفواتير تُصدر من صفحة ملف المريض" }}
        pagination={{
          page,
          pageSize,
          total,
          basePath: "/invoices",
          searchParams: {
            q: filters.search,
            branch: filters.branchId,
            status: filters.status,
            method: filters.method,
            from: filters.from,
            to: filters.to,
          },
        }}
      />
    </div>
  );
}

const METHOD_LABEL: Record<string, string> = {
  CASH: "نقدي",
  TRANSFER: "تحويل",
};
