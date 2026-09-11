"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { ExpenseCategory } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}

const expenseSchema = z.object({
  branchId: z.string().min(1, "الفرع مطلوب"),
  category: z.enum(ExpenseCategory),
  description: z.string().min(2, "وصف المصروف مطلوب"),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  date: z.string().min(1, "التاريخ مطلوب"),
  isRecurring: z.boolean().default(false),
});

export async function createExpense(values: unknown) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const parsed = expenseSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.expense.create({
    data: {
      branchId: parsed.data.branchId,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      isRecurring: parsed.data.isRecurring,
      recordedBy: admin.id,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}

export async function updateExpense(id: string, values: unknown) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const parsed = expenseSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { error: "المصروف غير موجود" };

  await prisma.expense.update({
    where: { id },
    data: {
      branchId: parsed.data.branchId,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      isRecurring: parsed.data.isRecurring,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}

export async function deleteExpense(id: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { error: "المصروف غير موجود" };

  await prisma.expense.delete({ where: { id } });

  revalidatePath("/expenses");
  revalidatePath("/");
  return { success: true };
}
