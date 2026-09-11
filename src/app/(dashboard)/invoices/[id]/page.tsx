import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, LockOpen, Receipt, User, Building2 } from "lucide-react";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth-utils";
import { getInvoiceById, getEditablePaymentIds, parseInvoiceItems } from "@/lib/data/invoices";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "@/components/invoices/payment-dialog";
import { ApprovalRequestDialog } from "@/components/invoices/approval-request-dialog";
import { RelockInvoiceButton } from "@/components/invoices/relock-invoice-button";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/generated/prisma/client";

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

const METHOD_LABEL: Record<string, string> = {
  CASH: "نقدي",
  TRANSFER: "تحويل",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const invoice = await getInvoiceById(id, user.role, user.branches);
  if (!invoice) notFound();

  const items = parseInvoiceItems(invoice.items);
  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(Number(invoice.total) - paid, 0);
  const editablePaymentIds = await getEditablePaymentIds(invoice.payments.map((p) => p.id));

  return (
    <div className="mx-auto w-full max-w-200 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">فاتورة {invoice.sequenceNumber}</h1>
          <Badge className={cn("rounded-full", STATUS_CLASS[invoice.status])}>{STATUS_LABEL[invoice.status]}</Badge>
          <Badge variant="secondary" className="gap-1">
            {invoice.isLocked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            {invoice.isLocked ? "مقفلة" : "مفتوحة للتعديل"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {remaining > 0 && <PaymentDialog invoiceId={invoice.id} remainingAmount={remaining} />}
          {!invoice.isLocked && isSuperAdmin(user.role) && <RelockInvoiceButton invoiceId={invoice.id} />}
          <ApprovalRequestDialog
            invoiceId={invoice.id}
            payments={invoice.payments.map((p) => ({
              id: p.id,
              amount: Number(p.amount),
              method: p.method,
              createdAt: p.createdAt,
            }))}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <User className="size-4.5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المريض</p>
              <p className="text-sm font-semibold text-foreground">
                <Link href={`/patients/${invoice.patient.id}`} className="hover:underline">
                  {invoice.patient.fullName}
                </Link>
              </p>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {invoice.patient.phone}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Building2 className="size-4.5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الفرع</p>
              <p className="text-sm font-semibold text-foreground">{invoice.branch.name}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(invoice.createdAt)}</p>
            </div>
          </div>
        </div>

        {invoice.visit && (
          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            مرتبطة بزيارة: {invoice.visit.procedure} — د. {invoice.visit.doctor.name}
          </p>
        )}
        {invoice.plan && (
          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            مرتبطة بخطة علاج: {invoice.plan.description}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">بنود الفاتورة</p>
          <span className="text-xs text-muted-foreground">{items.length} بند</span>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <Receipt className="size-8 text-slate-300" />
            <p className="text-sm text-muted-foreground">لا توجد بنود في هذه الفاتورة</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-2.5 text-start font-medium">#</th>
                  <th className="px-4 py-2.5 text-start font-medium">البند</th>
                  <th className="px-4 py-2.5 text-end font-medium">السعر</th>
                  <th className="px-4 py-2.5 text-end font-medium">الكمية</th>
                  <th className="px-4 py-2.5 text-end font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, index) => (
                  <tr key={index} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-slate-600">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums font-semibold text-foreground">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-slate-50/60">
                  <td colSpan={4} className="px-4 py-2.5 text-end text-xs font-medium text-muted-foreground">
                    الإجمالي الفرعي
                  </td>
                  <td className="px-4 py-2.5 text-end tabular-nums font-semibold text-foreground">
                    {formatCurrency(Number(invoice.subtotal))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>الإجمالي الفرعي</span>
            <span>{formatCurrency(Number(invoice.subtotal))}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>الخصم</span>
            <span>{formatCurrency(Number(invoice.discount))}</span>
          </div>
          <div className="flex items-center justify-between text-base font-bold text-foreground">
            <span>الإجمالي</span>
            <span>{formatCurrency(Number(invoice.total))}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-700">
            <span>المدفوع</span>
            <span>{formatCurrency(paid)}</span>
          </div>
          {remaining > 0 && (
            <div className="flex items-center justify-between font-semibold text-amber-700">
              <span>المتبقي</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <p className="mb-3 text-sm font-semibold text-foreground">سجل الدفعات</p>
        {invoice.payments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="size-8 text-slate-300" />
            <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة بعد</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(payment.amount))}</p>
                    <Badge
                      className={cn(
                        "rounded-full",
                        payment.installmentNumber !== null
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {payment.installmentNumber !== null ? `قسط ${payment.installmentNumber}` : "دفعة كاملة"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {METHOD_LABEL[payment.method] ?? payment.method} · {formatDateTime(payment.createdAt)} ·{" "}
                    {payment.recordedByUser.name}
                    {payment.reference ? ` · مرجع: ${payment.reference}` : ""}
                  </p>
                </div>
                {(!invoice.isLocked || editablePaymentIds.has(payment.id)) && (
                  <PaymentDialog
                    invoiceId={invoice.id}
                    payment={{
                      id: payment.id,
                      method: payment.method,
                      amount: Number(payment.amount),
                      reference: payment.reference,
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {invoice.refunds.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-6">
          <p className="mb-3 text-sm font-semibold text-foreground">المبالغ المستردة</p>
          <ul className="divide-y divide-border">
            {invoice.refunds.map((refund) => (
              <li key={refund.id} className="py-3">
                <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(refund.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  {refund.reason} · {formatDateTime(refund.createdAt)} · {refund.approvedByUser.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
