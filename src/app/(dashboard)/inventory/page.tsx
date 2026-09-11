import { notFound } from "next/navigation";
import { Package, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  getInventoryItems,
  getInventoryFilterOptions,
  CATEGORY_OPTIONS,
  type InventoryFilters,
  type InventoryListRow,
} from "@/lib/data/inventory";
import { DataTable, DataTablePrimaryCell, type DataTableColumn } from "@/components/shared/data-table";
import { InventoryFilters as InventoryFiltersBar } from "@/components/inventory/inventory-filters";
import { InventoryItemFormDialog } from "@/components/inventory/inventory-item-form-dialog";
import { DeleteInventoryItemButton } from "@/components/inventory/delete-inventory-item-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
);

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") notFound();

  const sp = await searchParams;

  const filters: InventoryFilters = {
    search: sp.q,
    branchId: sp.branch,
    category: sp.category,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [{ items, total, page, pageSize }, filterOptions] = await Promise.all([
    getInventoryItems(filters),
    getInventoryFilterOptions(),
  ]);

  const columns: DataTableColumn<InventoryListRow>[] = [
    {
      id: "name",
      header: "الصنف",
      cell: (i) => <DataTablePrimaryCell title={i.name} subtitle={i.branch.name} avatarText={i.name.slice(0, 2)} />,
    },
    {
      id: "category",
      header: "الفئة",
      hideBelow: "sm",
      cell: (i) => <span className="text-slate-600">{CATEGORY_LABEL[i.category] ?? i.category}</span>,
    },
    {
      id: "quantity",
      header: "الكمية",
      cell: (i) => {
        const low = Number(i.quantity) <= Number(i.reorderPoint);
        return (
          <span className={cn("font-medium", low ? "text-red-600" : "text-slate-700")}>
            {Number(i.quantity)} {i.unit}
          </span>
        );
      },
    },
    {
      id: "reorderPoint",
      header: "حد إعادة الطلب",
      hideBelow: "md",
      cell: (i) => <span className="text-slate-600">{Number(i.reorderPoint)}</span>,
    },
    {
      id: "supplier",
      header: "المورد",
      hideBelow: "lg",
      cell: (i) => <span className="text-slate-600">{i.supplier ?? "—"}</span>,
    },
    {
      id: "purchasePrice",
      header: "سعر الشراء",
      hideBelow: "lg",
      cell: (i) => <span className="text-slate-600">{formatCurrency(Number(i.purchasePrice))}</span>,
    },
    {
      id: "expiry",
      header: "الصلاحية",
      hideBelow: "md",
      cell: (i) => {
        if (!i.expiryDate) return <span className="text-slate-400">—</span>;
        const soon = i.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
        return (
          <span className={cn("text-slate-600", soon && "font-medium text-red-600")}>
            {formatDate(i.expiryDate)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">المخزون</h1>
        <InventoryItemFormDialog
          branches={filterOptions.branches}
          triggerLabel="صنف جديد"
          triggerIcon={<Plus data-icon="inline-end" />}
        />
      </div>

      <InventoryFiltersBar branches={filterOptions.branches} />

      <DataTable
        columns={columns}
        data={items}
        getRowId={(i) => i.id}
        actions={(i) => (
          <div className="flex items-center gap-1.5">
            <InventoryItemFormDialog
              branches={filterOptions.branches}
              triggerLabel="تعديل"
              triggerVariant="amber"
              item={{
                id: i.id,
                name: i.name,
                category: i.category,
                unit: i.unit,
                branchId: i.branchId,
                quantity: Number(i.quantity),
                reorderPoint: Number(i.reorderPoint),
                purchasePrice: Number(i.purchasePrice),
                supplier: i.supplier,
                supplierPhone: i.supplierPhone,
              }}
            />
            <DeleteInventoryItemButton itemId={i.id} itemName={i.name} />
          </div>
        )}
        empty={{ icon: Package, title: "لا توجد أصناف", description: "ابدأ بإضافة أول صنف للمخزون" }}
        pagination={{
          page,
          pageSize,
          total,
          basePath: "/inventory",
          searchParams: {
            q: filters.search,
            branch: filters.branchId,
            category: filters.category,
          },
        }}
      />
    </div>
  );
}
