import { prisma } from "@/lib/prisma";
import { Prisma, InventoryCategory } from "@/generated/prisma/client";

export const INVENTORY_PAGE_SIZE = 10;

export type InventoryFilters = {
  search?: string;
  branchId?: string;
  category?: string;
  page?: number;
};

export const CATEGORY_OPTIONS: { value: InventoryCategory; label: string }[] = [
  { value: "MATERIALS", label: "مواد" },
  { value: "TOOLS", label: "أدوات" },
  { value: "DEVICES", label: "أجهزة" },
];

const inventoryListInclude = {
  branch: { select: { id: true, name: true } },
} satisfies Prisma.InventoryItemInclude;

export type InventoryListRow = Prisma.InventoryItemGetPayload<{ include: typeof inventoryListInclude }>;

export async function getInventoryItems(filters: InventoryFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const where: Prisma.InventoryItemWhereInput = {
    ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.category ? { category: filters.category as InventoryCategory } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: inventoryListInclude,
      orderBy: { name: "asc" },
      skip: (page - 1) * INVENTORY_PAGE_SIZE,
      take: INVENTORY_PAGE_SIZE,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return { items, total, page, pageSize: INVENTORY_PAGE_SIZE };
}

export async function getInventoryFilterOptions() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return { branches, categories: CATEGORY_OPTIONS };
}
