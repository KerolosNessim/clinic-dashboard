"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";

const workingHoursSchema = z.array(
  z.object({
    day: z.string(),
    closed: z.boolean(),
    open: z.string().optional(),
    close: z.string().optional(),
  })
);

const branchSchema = z.object({
  name: z.string().min(2, "اسم الفرع مطلوب"),
  address: z.string().min(2, "العنوان مطلوب"),
  city: z.string().min(2, "المدينة مطلوبة"),
  phones: z
    .string()
    .transform((v) => v.split(",").map((p) => p.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0, "أدخل رقم هاتف واحد على الأقل"),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  workingHours: workingHoursSchema,
});

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return null;
  }
  return user;
}

export async function createBranch(values: unknown) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const parsed = branchSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.branch.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      phones: parsed.data.phones,
      email: parsed.data.email || null,
      workingHours: parsed.data.workingHours,
    },
  });

  revalidatePath("/branches");
  return { success: true };
}

export async function updateBranch(id: string, values: unknown) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const parsed = branchSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.branch.update({
    where: { id },
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      phones: parsed.data.phones,
      email: parsed.data.email || null,
      workingHours: parsed.data.workingHours,
    },
  });

  revalidatePath("/branches");
  return { success: true };
}

export async function toggleBranchActive(id: string, isActive: boolean) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  await prisma.branch.update({ where: { id }, data: { isActive } });
  revalidatePath("/branches");
  return { success: true };
}

/** Historical/operational relations that must be empty before a branch can be permanently deleted */
async function findBranchDeleteBlocker(id: string): Promise<string | null> {
  const [appointments, visits, inventory, expenses, invoices, weeklyAvailability, patients, stockTransfers] =
    await Promise.all([
      prisma.appointment.count({ where: { branchId: id } }),
      prisma.visit.count({ where: { branchId: id } }),
      prisma.inventoryItem.count({ where: { branchId: id } }),
      prisma.expense.count({ where: { branchId: id } }),
      prisma.invoice.count({ where: { branchId: id } }),
      prisma.weeklyAvailability.count({ where: { branchId: id } }),
      prisma.patient.count({ where: { registrationBranchId: id } }),
      prisma.stockMovement.count({ where: { OR: [{ fromBranchId: id }, { toBranchId: id }] } }),
    ]);

  const hasHistory =
    appointments + visits + inventory + expenses + invoices + weeklyAvailability + patients + stockTransfers > 0;

  if (!hasHistory) return null;
  return "لا يمكن حذف هذا الفرع نهائياً لوجود بيانات مرتبطة به (مرضى أو مواعيد أو زيارات أو سجلات مالية). يمكنك تعطيله بدلاً من ذلك.";
}

export async function deleteBranch(id: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const target = await prisma.branch.findUnique({ where: { id }, select: { name: true } });
  if (!target) return { error: "الفرع غير موجود" };

  const blocker = await findBranchDeleteBlocker(id);
  if (blocker) return { error: blocker };

  await prisma.$transaction(async (tx) => {
    await tx.userBranch.deleteMany({ where: { branchId: id } });
    await tx.branch.delete({ where: { id } });
  });

  revalidatePath("/branches");
  return { success: true };
}
