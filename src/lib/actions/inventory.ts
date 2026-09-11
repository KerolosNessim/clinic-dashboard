"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { InventoryCategory } from "@/generated/prisma/client";

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}

const itemSchema = z.object({
  name: z.string().min(2, "اسم الصنف مطلوب"),
  category: z.enum(InventoryCategory),
  unit: z.string().min(1, "الوحدة مطلوبة"),
  branchId: z.string().min(1, "الفرع مطلوب"),
  quantity: z.coerce.number().min(0, "الكمية غير صحيحة"),
  reorderPoint: z.coerce.number().min(0, "حد إعادة الطلب غير صحيح"),
  purchasePrice: z.coerce.number().min(0, "سعر الشراء غير صحيح"),
  supplier: z.string().optional(),
  supplierPhone: z.string().optional(),
});

export async function createInventoryItem(values: unknown) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const parsed = itemSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.inventoryItem.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      branchId: parsed.data.branchId,
      quantity: parsed.data.quantity,
      reorderPoint: parsed.data.reorderPoint,
      purchasePrice: parsed.data.purchasePrice,
      supplier: parsed.data.supplier || null,
      supplierPhone: parsed.data.supplierPhone || null,
    },
  });

  revalidatePath("/inventory");
  return { success: true };
}

export async function updateInventoryItem(id: string, values: unknown) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const parsed = itemSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.inventoryItem.update({
    where: { id },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      branchId: parsed.data.branchId,
      quantity: parsed.data.quantity,
      reorderPoint: parsed.data.reorderPoint,
      purchasePrice: parsed.data.purchasePrice,
      supplier: parsed.data.supplier || null,
      supplierPhone: parsed.data.supplierPhone || null,
    },
  });

  revalidatePath("/inventory");
  return { success: true };
}

export async function deleteInventoryItem(id: string) {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "هذا الإجراء متاح لمدير النظام فقط" };

  const target = await prisma.inventoryItem.findUnique({ where: { id }, select: { id: true } });
  if (!target) return { error: "الصنف غير موجود" };

  await prisma.inventoryItem.delete({ where: { id } });

  revalidatePath("/inventory");
  return { success: true };
}
