import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@/generated/prisma/client";

export const INVOICES_PAGE_SIZE = 10;

export type InvoiceItem = { name: string; price: number; quantity: number };

export function parseInvoiceItems(items: Prisma.JsonValue): InvoiceItem[] {
  if (!Array.isArray(items)) return [];
  return items as unknown as InvoiceItem[];
}

export type InvoiceFilters = {
  search?: string;
  branchId?: string;
  status?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
};

export function invoiceScopeWhere(role: Role, branchIds: string[]): Prisma.InvoiceWhereInput {
  if (role === "SUPER_ADMIN") return {};
  return { branchId: { in: branchIds } };
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** OVERDUE isn't a distinct stored state on creation — an invoice becomes overdue once it has
 *  sat unpaid past 30 days, so status is recomputed (not just read) whenever an invoice is touched. */
export function computeInvoiceStatus(total: number, paid: number, createdAt: Date): "PAID" | "PARTIAL" | "OVERDUE" {
  if (paid >= total) return "PAID";
  const ageDays = (Date.now() - createdAt.getTime()) / 86_400_000;
  return ageDays > 30 ? "OVERDUE" : "PARTIAL";
}

const invoiceListInclude = {
  patient: { select: { id: true, fullName: true, phone: true } },
  branch: { select: { id: true, name: true } },
  payments: { select: { amount: true, method: true } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceListRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceListInclude }>;

export async function getInvoices(filters: InvoiceFilters, role: Role, branchIds: string[]) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const filterWhere: Prisma.InvoiceWhereInput = {
    ...(filters.search
      ? {
          patient: {
            OR: [
              { fullName: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search } },
            ],
          },
        }
      : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.status ? { status: filters.status as Prisma.EnumInvoiceStatusFilter["equals"] } : {}),
    ...(filters.method
      ? { payments: { some: { method: filters.method as Prisma.EnumPaymentMethodFilter["equals"] } } }
      : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: startOfDay(new Date(filters.from)) } : {}),
            ...(filters.to ? { lte: endOfDay(new Date(filters.to)) } : {}),
          },
        }
      : {}),
  };

  const where: Prisma.InvoiceWhereInput = {
    AND: [invoiceScopeWhere(role, branchIds), filterWhere],
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: invoiceListInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * INVOICES_PAGE_SIZE,
      take: INVOICES_PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices, total, page, pageSize: INVOICES_PAGE_SIZE };
}

export async function getInvoiceSummary(role: Role, branchIds: string[]) {
  const scope = invoiceScopeWhere(role, branchIds);

  const [paidAgg, overdue, partial] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { invoice: scope } }),
    prisma.invoice.findMany({
      where: { AND: [scope, { status: "OVERDUE" }] },
      select: { total: true },
    }),
    prisma.invoice.findMany({
      where: { AND: [scope, { status: "PARTIAL" }] },
      select: { patientId: true },
    }),
  ]);

  return {
    totalPaid: Number(paidAgg._sum.amount ?? 0),
    overdueCount: overdue.length,
    overdueTotal: overdue.reduce((sum, i) => sum + Number(i.total), 0),
    installmentCount: partial.length,
    installmentPatients: new Set(partial.map((i) => i.patientId)).size,
  };
}

export async function getInvoiceFilterOptions(role: Role, branchIds: string[]) {
  const branchWhere: Prisma.BranchWhereInput = role === "SUPER_ADMIN" ? {} : { id: { in: branchIds } };

  const branches = await prisma.branch.findMany({
    where: branchWhere,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { branches };
}

export async function getInvoiceById(id: string, role: Role, branchIds: string[]) {
  return prisma.invoice.findFirst({
    where: { AND: [{ id }, invoiceScopeWhere(role, branchIds)] },
    include: {
      patient: { select: { id: true, fullName: true, phone: true } },
      branch: { select: { id: true, name: true } },
      visit: { select: { id: true, procedure: true, diagnosis: true, doctor: { select: { name: true } } } },
      plan: { select: { id: true, description: true } },
      payments: {
        orderBy: { createdAt: "asc" },
        include: { recordedByUser: { select: { name: true } } },
      },
      refunds: {
        orderBy: { createdAt: "asc" },
        include: { approvedByUser: { select: { name: true } } },
      },
    },
  });
}

export async function getPatientInvoices(patientId: string, role: Role, branchIds: string[]) {
  return prisma.invoice.findMany({
    where: { AND: [{ patientId }, invoiceScopeWhere(role, branchIds)] },
    include: { payments: { select: { amount: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUninvoicedVisits(patientId: string) {
  return prisma.visit.findMany({
    where: { patientId, invoices: { none: {} } },
    orderBy: { dateTime: "desc" },
    select: { id: true, dateTime: true, procedure: true, diagnosis: true, sessionCost: true, branchId: true },
  });
}

const approvalRequestInclude = {
  requestedByUser: { select: { name: true } },
  resolvedByUser: { select: { name: true } },
} satisfies Prisma.ApprovalRequestInclude;

export async function getApprovalRequests(status?: string) {
  const requests = await prisma.approvalRequest.findMany({
    where: status ? { status: status as Prisma.EnumApprovalStatusFilter["equals"] } : undefined,
    include: approvalRequestInclude,
    orderBy: { createdAt: "desc" },
  });

  const paymentIds = requests.filter((r) => r.entityType === "Payment").map((r) => r.entityId);
  const invoiceIds = requests.filter((r) => r.entityType === "Invoice").map((r) => r.entityId);

  const [payments, invoices] = await Promise.all([
    paymentIds.length
      ? prisma.payment.findMany({
          where: { id: { in: paymentIds } },
          include: { invoice: { include: { patient: { select: { fullName: true } } } } },
        })
      : Promise.resolve([]),
    invoiceIds.length
      ? prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          include: { patient: { select: { fullName: true } } },
        })
      : Promise.resolve([]),
  ]);

  const paymentMap = new Map(payments.map((p) => [p.id, p]));
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

  return requests.map((request) => ({
    ...request,
    payment: request.entityType === "Payment" ? paymentMap.get(request.entityId) ?? null : null,
    invoice: request.entityType === "Invoice" ? invoiceMap.get(request.entityId) ?? null : null,
  }));
}

export async function getPendingApprovalCount() {
  return prisma.approvalRequest.count({ where: { status: "PENDING" } });
}

/** Payments individually editable right now even while their invoice is locked — each has
 *  its own approved, not-yet-used EDIT_PAYMENT request (see updatePayment in actions/invoices.ts). */
export async function getEditablePaymentIds(paymentIds: string[]) {
  if (paymentIds.length === 0) return new Set<string>();
  const approvals = await prisma.approvalRequest.findMany({
    where: { type: "EDIT_PAYMENT", entityId: { in: paymentIds }, status: "APPROVED", consumedAt: null },
    select: { entityId: true },
  });
  return new Set(approvals.map((a) => a.entityId));
}
