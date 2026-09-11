"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { Role, Prisma } from "@/generated/prisma/client";

const DUPLICATE_PHONE_ERROR = { error: "رقم الهاتف مستخدم بالفعل", fieldErrors: { phone: ["رقم الهاتف مستخدم بالفعل"] } };

function isDuplicatePhoneError(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const userSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف مصري غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").optional().or(z.literal("")),
  role: z.enum(Role, { message: "اختر الدور" }),
  branchIds: z.array(z.string()),
});

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return null;
  }
  return user;
}

export async function createUser(values: unknown) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const parsed = userSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!parsed.data.password) {
    return { error: "كلمة المرور مطلوبة", fieldErrors: { password: ["كلمة المرور مطلوبة"] } };
  }

  const existing = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (existing) {
    return DUPLICATE_PHONE_ERROR;
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  // The findUnique check above is a fast-path UX check only — it can't close the race window
  // between two concurrent submits, so the @unique constraint on phone is the real guard and
  // its violation is translated here instead of surfacing a raw DB error to the admin.
  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        password: hashedPassword,
        role: parsed.data.role,
        branches: { create: parsed.data.branchIds.map((branchId) => ({ branchId })) },
      },
    });
  } catch (err) {
    if (isDuplicatePhoneError(err)) return DUPLICATE_PHONE_ERROR;
    throw err;
  }

  revalidatePath("/doctors");
  revalidatePath("/assistants");
  return { success: true };
}

export async function updateUser(id: string, values: unknown) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const parsed = userSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.user.findFirst({
    where: { phone: parsed.data.phone, NOT: { id } },
  });
  if (existing) {
    return DUPLICATE_PHONE_ERROR;
  }

  const newPasswordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          role: parsed.data.role,
          ...(newPasswordHash ? { password: newPasswordHash } : {}),
        },
      });

      await tx.userBranch.deleteMany({ where: { userId: id } });
      if (parsed.data.branchIds.length > 0) {
        await tx.userBranch.createMany({
          data: parsed.data.branchIds.map((branchId) => ({ userId: id, branchId })),
        });
      }
    });
  } catch (err) {
    if (isDuplicatePhoneError(err)) return DUPLICATE_PHONE_ERROR;
    throw err;
  }

  revalidatePath("/doctors");
  revalidatePath("/assistants");
  return { success: true };
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  if (admin.id === id && !isActive) {
    return { error: "لا يمكنك تعطيل حسابك الخاص" };
  }

  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/doctors");
  revalidatePath("/assistants");
  return { success: true };
}

/** Historical/financial relations that must be empty before a user can be permanently deleted */
async function findUserDeleteBlocker(id: string): Promise<string | null> {
  const [
    doctorAppointments,
    createdAppointments,
    doctorVisits,
    toothRecordUpdates,
    treatmentPlans,
    weeklyAvailability,
    earningRules,
    earningRecords,
    stockMovements,
    approvalRequests,
    expenses,
    paymentsRecorded,
    refundsApproved,
    auditLogs,
  ] = await Promise.all([
    prisma.appointment.count({ where: { doctorId: id } }),
    prisma.appointment.count({ where: { createdBy: id } }),
    prisma.visit.count({ where: { doctorId: id } }),
    prisma.toothRecord.count({ where: { updatedBy: id } }),
    prisma.treatmentPlan.count({ where: { doctorId: id } }),
    prisma.weeklyAvailability.count({ where: { doctorId: id } }),
    prisma.earningRule.count({ where: { userId: id } }),
    prisma.earningRecord.count({ where: { userId: id } }),
    prisma.stockMovement.count({ where: { performedBy: id } }),
    prisma.approvalRequest.count({ where: { OR: [{ requestedBy: id }, { resolvedBy: id }] } }),
    prisma.expense.count({ where: { recordedBy: id } }),
    prisma.payment.count({ where: { recordedBy: id } }),
    prisma.refund.count({ where: { approvedBy: id } }),
    prisma.auditLog.count({ where: { userId: id } }),
  ]);

  const hasHistory =
    doctorAppointments +
      createdAppointments +
      doctorVisits +
      toothRecordUpdates +
      treatmentPlans +
      weeklyAvailability +
      earningRules +
      earningRecords +
      stockMovements +
      approvalRequests +
      expenses +
      paymentsRecorded +
      refundsApproved +
      auditLogs >
    0;

  if (!hasHistory) return null;
  return "لا يمكن حذف هذا المستخدم نهائياً لوجود بيانات مرتبطة به (مواعيد أو زيارات أو سجلات مالية). يمكنك تعطيل حسابه بدلاً من ذلك.";
}

export async function deleteUser(id: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  if (admin.id === id) {
    return { error: "لا يمكنك حذف حسابك الخاص" };
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true } });
  if (!target) return { error: "المستخدم غير موجود" };

  const blocker = await findUserDeleteBlocker(id);
  if (blocker) return { error: blocker };

  await prisma.$transaction(async (tx) => {
    await tx.userBranch.deleteMany({ where: { userId: id } });
    await tx.doctorProfile.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  revalidatePath("/doctors");
  revalidatePath("/assistants");
  return { success: true };
}
