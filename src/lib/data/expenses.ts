import { prisma } from "@/lib/prisma";
import { Prisma, ExpenseCategory } from "@/generated/prisma/client";

export const EXPENSES_PAGE_SIZE = 10;

export type ExpenseFilters = {
  search?: string;
  branchId?: string;
  category?: string;
  from?: string;
  to?: string;
  page?: number;
};

export const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "RENT", label: "إيجار" },
  { value: "UTILITIES", label: "مرافق (كهرباء / مياه)" },
  { value: "SALARIES", label: "رواتب" },
  { value: "MAINTENANCE", label: "صيانة" },
  { value: "MARKETING", label: "تسويق" },
  { value: "OTHER", label: "أخرى" },
];

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

const expenseListInclude = {
  branch: { select: { id: true, name: true } },
  recordedByUser: { select: { name: true } },
} satisfies Prisma.ExpenseInclude;

export type ExpenseListRow = Prisma.ExpenseGetPayload<{ include: typeof expenseListInclude }>;

function expenseWhere(filters: ExpenseFilters): Prisma.ExpenseWhereInput {
  return {
    ...(filters.search ? { description: { contains: filters.search, mode: "insensitive" } } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.category ? { category: filters.category as ExpenseCategory } : {}),
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: startOfDay(new Date(filters.from)) } : {}),
            ...(filters.to ? { lte: endOfDay(new Date(filters.to)) } : {}),
          },
        }
      : {}),
  };
}

export async function getExpenses(filters: ExpenseFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const where = expenseWhere(filters);

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: expenseListInclude,
      orderBy: { date: "desc" },
      skip: (page - 1) * EXPENSES_PAGE_SIZE,
      take: EXPENSES_PAGE_SIZE,
    }),
    prisma.expense.count({ where }),
  ]);

  return { expenses, total, page, pageSize: EXPENSES_PAGE_SIZE };
}

export async function getExpenseSummary(filters: ExpenseFilters) {
  const where = expenseWhere(filters);
  const [totalAgg, byBranch] = await Promise.all([
    prisma.expense.aggregate({ _sum: { amount: true }, where }),
    prisma.expense.groupBy({ by: ["branchId"], where, _sum: { amount: true } }),
  ]);

  const branches = byBranch.length
    ? await prisma.branch.findMany({
        where: { id: { in: byBranch.map((b) => b.branchId) } },
        select: { id: true, name: true },
      })
    : [];
  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

  return {
    total: Number(totalAgg._sum.amount ?? 0),
    byBranch: byBranch.map((b) => ({
      branchId: b.branchId,
      branchName: branchNameById.get(b.branchId) ?? "—",
      total: Number(b._sum.amount ?? 0),
    })),
  };
}

export async function getExpenseFilterOptions() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return { branches, categories: CATEGORY_OPTIONS };
}
