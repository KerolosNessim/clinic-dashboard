import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldQuestion } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getApprovalRequests } from "@/lib/data/invoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApprovalActions } from "@/components/invoices/approval-actions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApprovalStatus } from "@/generated/prisma/client";

const TYPE_LABEL: Record<string, string> = {
  EDIT_PAYMENT: "تعديل دفعة",
  DELETE_PAYMENT: "حذف دفعة",
  UNLOCK_INVOICE: "فتح الفاتورة للتعديل",
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: "قيد المراجعة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
};

const STATUS_CLASS: Record<ApprovalStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function ApprovalRequestsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") notFound();

  const requests = await getApprovalRequests();

  return (
    <div className="mx-auto w-full max-w-200 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">طلبات المراجعة</h1>
        <Button variant="outline" className="h-11!" nativeButton={false} render={<Link href="/invoices" />}>
          <ArrowRight data-icon="inline-end" />
          رجوع للفواتير
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white py-16 text-center">
          <ShieldQuestion className="size-10 text-slate-300" />
          <p className="text-sm font-semibold text-foreground">لا توجد طلبات مراجعة</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const patientName = request.payment?.invoice.patient.fullName ?? request.invoice?.patient.fullName;
            const invoiceHref = request.payment
              ? `/invoices/${request.payment.invoiceId}`
              : request.invoice
                ? `/invoices/${request.invoice.id}`
                : null;

            return (
              <li key={request.id} className="rounded-xl border border-border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{TYPE_LABEL[request.type] ?? request.type}</p>
                      <Badge className={cn("rounded-full", STATUS_CLASS[request.status])}>
                        {STATUS_LABEL[request.status]}
                      </Badge>
                    </div>
                    {patientName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        المريض: {patientName}
                        {request.payment ? ` · مبلغ الدفعة: ${formatCurrency(Number(request.payment.amount))}` : ""}
                      </p>
                    )}
                    {invoiceHref && (
                      <Link href={invoiceHref} className="mt-1 inline-block text-xs text-sky-600 hover:underline">
                        عرض الفاتورة
                      </Link>
                    )}
                  </div>
                  {request.status === "PENDING" && <ApprovalActions requestId={request.id} />}
                </div>

                <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{request.reason}</p>

                <p className="mt-2 text-xs text-muted-foreground">
                  طلب بواسطة {request.requestedByUser.name} · {formatDateTime(request.createdAt)}
                </p>

                {request.status !== "PENDING" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    تم البت بواسطة {request.resolvedByUser?.name} · {request.resolvedAt && formatDateTime(request.resolvedAt)}
                    {request.adminNote ? ` · ملاحظة: ${request.adminNote}` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
