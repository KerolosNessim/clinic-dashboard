import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  /** Hide this column below the given breakpoint to keep dense rows readable on small screens */
  hideBelow?: "sm" | "md" | "lg";
};

const HIDE_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export type DataTablePagination = {
  page: number;
  pageSize: number;
  total: number;
  /** The route this table lives on — page links are plain `<a href>` so pagination works without client JS */
  basePath: string;
  /** Other active query params (filters, search) to preserve across page links */
  searchParams?: Record<string, string | undefined>;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  /** Makes the whole row a link (e.g. to a detail page) */
  rowHref?: (row: T) => string;
  /** Trailing per-row actions cell (icon button, dropdown menu, …) */
  actions?: (row: T) => React.ReactNode;
  title?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
  empty: { icon: LucideIcon; title: string; description?: string };
  pagination?: DataTablePagination;
};

export function DataTable<T>({
  columns,
  data,
  getRowId,
  rowHref,
  actions,
  title,
  toolbarEnd,
  empty,
  pagination,
}: DataTableProps<T>) {
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      {(title || toolbarEnd) && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          {title && <p className="text-lg font-semibold text-foreground">{title}</p>}
          {toolbarEnd}
        </div>
      )}

      {data.length === 0 ? (
        <Empty className="border-0 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <empty.icon />
            </EmptyMedia>
            <EmptyTitle>{empty.title}</EmptyTitle>
            {empty.description && <EmptyDescription>{empty.description}</EmptyDescription>}
          </EmptyHeader>
        </Empty>
      ) : (
        <Table dir="rtl" >
          <TableHeader>
            <TableRow className="bg-slate-100 hover:bg-slate-100 ">
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(
                    "text-right text-slate-500",
                    col.hideBelow && HIDE_CLASS[col.hideBelow],
                    col.headerClassName
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right  text-slate-500">
                الإجراءات
                </TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const id = getRowId(row);
              const href = rowHref?.(row);
              return (
                <TableRow key={id} className="hover:bg-slate-50 ">
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        "h-16",
                        col.hideBelow && HIDE_CLASS[col.hideBelow],
                        col.cellClassName
                      )}
                    >
                      {href ? (
                        <Link href={href} className="block">
                          {col.cell(row)}
                        </Link>
                      ) : (
                        col.cell(row)
                      )}
                    </TableCell>
                  ))}
                  {actions && <TableCell className="min-w-64">{actions(row)}</TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            عرض {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} من{" "}
            {pagination.total}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="السابق"
                  href={pageHref(pagination, Math.max(1, pagination.page - 1))}
                  className={pagination.page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {pageList(pagination.page, totalPages).map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink href={pageHref(pagination, p)} isActive={p === pagination.page}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  text="التالي"
                  href={pageHref(pagination, Math.min(totalPages, pagination.page + 1))}
                  className={
                    pagination.page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

function pageHref(pagination: DataTablePagination, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(pagination.searchParams ?? {})) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `${pagination.basePath}?${params.toString()}`;
}

function pageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis");
    result.push(p);
    prev = p;
  }
  return result;
}

/** A reusable "avatar + title + subtitle" cell for the row's primary identity column (patient, doctor, user…) */
export function DataTablePrimaryCell({
  title,
  subtitle,
  avatarText,
  avatarClassName,
}: {
  title: string;
  subtitle?: string;
  avatarText: string;
  avatarClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback className={cn("bg-sky-100 text-sky-700", avatarClassName)}>
          {avatarText}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col ">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}
