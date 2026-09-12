"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessBranch, isSuperAdmin } from "@/lib/auth-utils";
import { computeInvoiceStatus } from "@/lib/data/invoices";
import { Prisma } from "@/generated/prisma/client";

const invoiceItemSchema = z.object({
  name: z.string().min(1, "اسم البند مطلوب"),
  price: z.coerce.number().min(0, "السعر غير صحيح"),
  quantity: z.coerce.number().min(1, "الكمية غير صحيحة"),
});

const createInvoiceSchema = z.object({
  patientId: z.string().min(1),
  branchId: z.string().min(1),
  visitId: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "أضف بند واحد على الأقل"),
  discount: z.coerce.number().min(0).default(0),
});

async function nextSequenceNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const count = await tx.invoice.count({ where: { sequenceNumber: { startsWith: `${year}-` } } });
  return `${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createInvoice(values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = createInvoiceSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const canAccess = await canAccessBranch(user.id, user.role, parsed.data.branchId);
  if (!canAccess) return { error: "لا تملك صلاحية إصدار فاتورة لهذا الفرع" };

  const subtotal = parsed.data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = Math.max(subtotal - parsed.data.discount, 0);

  // nextSequenceNumber() reads a count and writes count+1 in the same transaction, which
  // under Postgres's default READ COMMITTED isolation can race two concurrent invoice
  // creations onto the same number — the @unique constraint then rejects the loser. Retry
  // a handful of times with a fresh sequence number instead of surfacing a raw DB error.
  let invoice!: Awaited<ReturnType<typeof prisma.invoice.create>>;
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      invoice = await prisma.$transaction(async (tx) => {
        const sequenceNumber = await nextSequenceNumber(tx);

        const created = await tx.invoice.create({
          data: {
            patientId: parsed.data.patientId,
            branchId: parsed.data.branchId,
            visitId: parsed.data.visitId || null,
            planId: parsed.data.planId || null,
            items: parsed.data.items,
            subtotal,
            discount: parsed.data.discount,
            total,
            status: "PARTIAL",
            isLocked: true,
            sequenceNumber,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "CREATE_INVOICE",
            entityType: "Invoice",
            entityId: created.id,
            newValue: { sequenceNumber, total, patientId: parsed.data.patientId },
          },
        });

        return created;
      });
      break;
    } catch (err) {
      const isSequenceConflict =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("sequenceNumber");
      if (!isSequenceConflict || attempt >= 5) throw err;
    }
  }

  revalidatePath("/invoices");
  revalidatePath(`/patients/${parsed.data.patientId}`);
  revalidatePath("/");
  return { success: true, invoiceId: invoice.id };
}

const paymentSchema = z.object({
  method: z.enum(["CASH", "TRANSFER"]),
  type: z.enum(["FULL", "INSTALLMENT"]),
  // Required for INSTALLMENT only — a FULL settlement's amount is computed server-side
  // from the invoice's remaining balance, never trusted from the client. The FULL form
  // doesn't render this field, so it arrives as "" and must be treated as absent rather
  // than coerced to 0 (which would fail the positive() check below).
  amount: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive("قيمة القسط يجب أن تكون أكبر من صفر").optional()
  ),
  reference: z.string().optional(),
});

export async function recordPayment(invoiceId: string, values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { select: { amount: true, installmentNumber: true } } },
  });
  if (!invoice) return { error: "الفاتورة غير موجودة" };

  const canAccess = await canAccessBranch(user.id, user.role, invoice.branchId);
  if (!canAccess) return { error: "لا تملك صلاحية تسجيل دفعة لهذه الفاتورة" };

  const paidSoFar = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.total) - paidSoFar;
  if (remaining <= 0) return { error: "الفاتورة مدفوعة بالكامل بالفعل" };

  let amount: number;
  let installmentNumber: number | null = null;

  if (parsed.data.type === "FULL") {
    amount = remaining;
  } else {
    if (!parsed.data.amount) return { error: "قيمة القسط مطلوبة" };
    if (parsed.data.amount > remaining) return { error: "قيمة القسط أكبر من المتبقي على الفاتورة" };
    amount = parsed.data.amount;
    installmentNumber = invoice.payments.filter((p) => p.installmentNumber !== null).length + 1;
  }

  const newPaid = paidSoFar + amount;
  const newStatus = computeInvoiceStatus(Number(invoice.total), newPaid, invoice.createdAt);

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        method: parsed.data.method,
        amount,
        reference: parsed.data.reference || null,
        installmentNumber,
        recordedBy: user.id,
      },
    });

    await tx.invoice.update({ where: { id: invoiceId }, data: { status: newStatus } });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "RECORD_PAYMENT",
        entityType: "Payment",
        entityId: payment.id,
        newValue: { invoiceId, amount, method: parsed.data.method, installmentNumber },
      },
    });
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/patients/${invoice.patientId}`);
  revalidatePath("/");
  return { success: true };
}

const approvalRequestSchema = z.object({
  type: z.enum(["EDIT_PAYMENT", "DELETE_PAYMENT", "UNLOCK_INVOICE"]),
  entityId: z.string().min(1),
  reason: z.string().min(1, "السبب مطلوب"),
});

export async function submitApprovalRequest(values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };
  if (isSuperAdmin(user.role)) return { error: "لا يمكن للأدمن طلب مراجعة من نفسه" };

  const parsed = approvalRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const entityType = parsed.data.type === "UNLOCK_INVOICE" ? "Invoice" : "Payment";

  // The client only ever offers valid ids from the invoice being viewed, but the server
  // action itself must not trust an arbitrary entityId — verify it exists and belongs to a
  // branch this user can access before creating a request an admin might approve blindly.
  if (entityType === "Invoice") {
    const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.entityId }, select: { branchId: true } });
    if (!invoice) return { error: "الفاتورة غير موجودة" };
    if (!(await canAccessBranch(user.id, user.role, invoice.branchId))) {
      return { error: "لا تملك صلاحية طلب مراجعة لهذه الفاتورة" };
    }
  } else {
    const payment = await prisma.payment.findUnique({
      where: { id: parsed.data.entityId },
      select: { invoice: { select: { branchId: true } } },
    });
    if (!payment) return { error: "الدفعة غير موجودة" };
    if (!(await canAccessBranch(user.id, user.role, payment.invoice.branchId))) {
      return { error: "لا تملك صلاحية طلب مراجعة لهذه الدفعة" };
    }
  }

  await prisma.approvalRequest.create({
    data: {
      type: parsed.data.type,
      entityType,
      entityId: parsed.data.entityId,
      requestedBy: user.id,
      reason: parsed.data.reason,
      status: "PENDING",
    },
  });

  revalidatePath("/invoices/approvals");
  revalidatePath("/");
  return { success: true };
}

export async function processApprovalRequest(requestId: string, status: "APPROVED" | "REJECTED", adminNote?: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };
  if (!isSuperAdmin(user.role)) return { error: "هذا الإجراء متاح للأدمن فقط" };

  const request = await prisma.approvalRequest.findUnique({ where: { id: requestId } });
  if (!request) return { error: "الطلب غير موجود" };
  if (request.status !== "PENDING") return { error: "تم البت في هذا الطلب بالفعل" };

  await prisma.$transaction(async (tx) => {
    // If the target was deleted/changed between the request and this approval, don't mark
    // it APPROVED as if the action succeeded — flip it to REJECTED with an explanatory note
    // so the admin sees it failed instead of it silently doing nothing.
    let finalStatus: "APPROVED" | "REJECTED" = status;
    let finalNote = adminNote || null;

    if (status === "APPROVED") {
      if (request.type === "UNLOCK_INVOICE") {
        const invoice = await tx.invoice.findUnique({ where: { id: request.entityId }, select: { id: true } });
        if (!invoice) {
          finalStatus = "REJECTED";
          finalNote = "الفاتورة لم تعد موجودة";
        } else {
          await tx.invoice.update({ where: { id: request.entityId }, data: { isLocked: false } });
        }
      } else if (request.type === "DELETE_PAYMENT") {
        const payment = await tx.payment.findUnique({ where: { id: request.entityId } });
        if (!payment) {
          finalStatus = "REJECTED";
          finalNote = "الدفعة لم تعد موجودة";
        } else {
          await tx.payment.delete({ where: { id: payment.id } });
          const invoice = await tx.invoice.findUnique({
            where: { id: payment.invoiceId },
            include: { payments: { select: { amount: true } } },
          });
          if (invoice) {
            const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            await tx.invoice.update({
              where: { id: invoice.id },
              data: { status: computeInvoiceStatus(Number(invoice.total), paid, invoice.createdAt) },
            });
          }
        }
      } else if (request.type === "EDIT_PAYMENT") {
        // No invoice-wide unlock here — updatePayment() checks for this specific APPROVED,
        // unconsumed request by (type, entityId) instead, so approving an edit on payment A
        // can never be used to edit payment B on the same invoice.
        const payment = await tx.payment.findUnique({ where: { id: request.entityId } });
        if (!payment) {
          finalStatus = "REJECTED";
          finalNote = "الدفعة لم تعد موجودة";
        }
      }
    }

    await tx.approvalRequest.update({
      where: { id: requestId },
      data: { status: finalStatus, resolvedBy: user.id, resolvedAt: new Date(), adminNote: finalNote },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: `${finalStatus === "APPROVED" ? "APPROVE" : "REJECT"}_REQUEST`,
        entityType: "ApprovalRequest",
        entityId: requestId,
        oldValue: { type: request.type, entityId: request.entityId },
        newValue: { status: finalStatus, adminNote: finalNote },
      },
    });
  });

  revalidatePath("/invoices/approvals");
  revalidatePath("/invoices");
  revalidatePath("/");
  return { success: true };
}

const editPaymentSchema = z.object({
  method: z.enum(["CASH", "TRANSFER"]),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  reference: z.string().optional(),
});

/** Only callable once the parent invoice has been unlocked via an approved UNLOCK_INVOICE /
 *  EDIT_PAYMENT request — the edit re-locks the invoice, closing the approval loop. */
export async function updatePayment(paymentId: string, values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = editPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { invoice: true } });
  if (!payment) return { error: "الدفعة غير موجودة" };

  const canAccess = await canAccessBranch(user.id, user.role, payment.invoice.branchId);
  if (!canAccess) return { error: "لا تملك صلاحية تعديل هذه الدفعة" };

  // Two ways in: (a) the invoice was broadly unlocked via an approved UNLOCK_INVOICE request,
  // or (b) this exact payment has its own approved, not-yet-used EDIT_PAYMENT request. (b) is
  // consumed on use so the same approval can't be replayed to edit a different payment later.
  let approvalToConsume: string | null = null;
  if (payment.invoice.isLocked) {
    const approval = await prisma.approvalRequest.findFirst({
      where: { type: "EDIT_PAYMENT", entityId: paymentId, status: "APPROVED", consumedAt: null },
      orderBy: { resolvedAt: "desc" },
    });
    if (!approval) return { error: "الفاتورة مقفلة — يلزم اعتماد طلب تعديل لهذه الدفعة أولاً" };
    approvalToConsume = approval.id;
  }

  const otherPayments = await prisma.payment.findMany({
    where: { invoiceId: payment.invoiceId, id: { not: paymentId } },
    select: { amount: true },
  });
  const paidByOthers = otherPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingForThisPayment = Number(payment.invoice.total) - paidByOthers;
  if (parsed.data.amount > remainingForThisPayment) {
    return { error: "المبلغ الجديد يتجاوز إجمالي الفاتورة" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { method: parsed.data.method, amount: parsed.data.amount, reference: parsed.data.reference || null },
    });

    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: payment.invoiceId },
      include: { payments: { select: { amount: true } } },
    });
    const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: computeInvoiceStatus(Number(invoice.total), paid, invoice.createdAt), isLocked: true },
    });

    if (approvalToConsume) {
      await tx.approvalRequest.update({ where: { id: approvalToConsume }, data: { consumedAt: new Date() } });
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "EDIT_PAYMENT",
        entityType: "Payment",
        entityId: paymentId,
        oldValue: { amount: Number(payment.amount), method: payment.method },
        newValue: { amount: parsed.data.amount, method: parsed.data.method },
      },
    });
  });

  revalidatePath(`/invoices/${payment.invoiceId}`);
  revalidatePath("/invoices");
  return { success: true };
}

/** Manually re-locks an invoice left open by an UNLOCK_INVOICE approval that was never
 *  followed up with a payment edit — closes the window instead of leaving it open indefinitely. */
export async function relockInvoice(invoiceId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };
  if (!isSuperAdmin(user.role)) return { error: "هذا الإجراء متاح للأدمن فقط" };

  await prisma.invoice.update({ where: { id: invoiceId }, data: { isLocked: true } });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { success: true };
}
