"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";

const STATUS_OPTIONS = [
  { value: "PAID", label: "مدفوعة بالكامل" },
  { value: "PARTIAL", label: "مدفوعة جزئياً" },
  { value: "OVERDUE", label: "متأخرة السداد" },
];

const METHOD_OPTIONS = [
  { value: "CASH", label: "نقدي" },
  { value: "TRANSFER", label: "تحويل" },
];

export function InvoicesFilters({ branches }: { branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  function pushParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== (searchParams.get("q") ?? "")) {
        pushParams({ q: search || undefined });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasFilters =
    searchParams.get("q") ||
    searchParams.get("branch") ||
    searchParams.get("status") ||
    searchParams.get("method") ||
    searchParams.get("from") ||
    searchParams.get("to");

  return (
    <div className="space-y-3">
      <InputGroup className="h-12 lg:full w-full bg-white text-base">
        <InputGroupInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف"
          className="text-base"
        />
        <InputGroupAddon align="inline-start" className="px-2.5">
          <Search className="size-5" />
        </InputGroupAddon>
      </InputGroup>

      <div className="flex max-lg:flex-wrap items-center gap-3">
        {branches.length > 0 && (
          <Select
            value={searchParams.get("branch") ?? ""}
            onValueChange={(value) => pushParams({ branch: value || undefined })}
          >
            <SelectTrigger className="h-11! bg-white lg:w-1/5 w-full">
              <SelectValue placeholder="الفرع">
                {(value: string) => branches.find((b) => b.id === value)?.name ?? "الفرع"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={searchParams.get("status") ?? ""}
          onValueChange={(value) => pushParams({ status: value || undefined })}
        >
          <SelectTrigger className="h-11! bg-white lg:w-1/5 w-full">
            <SelectValue placeholder="الحالة">
              {(value: string) => STATUS_OPTIONS.find((s) => s.value === value)?.label ?? "الحالة"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("method") ?? ""}
          onValueChange={(value) => pushParams({ method: value || undefined })}
        >
          <SelectTrigger className="h-11! bg-white lg:w-1/5 w-full">
            <SelectValue placeholder="طريقة الدفع">
              {(value: string) => METHOD_OPTIONS.find((m) => m.value === value)?.label ?? "طريقة الدفع"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {METHOD_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DatePicker
          value={searchParams.get("from") ?? undefined}
          onChange={(value) => pushParams({ from: value })}
          placeholder="من تاريخ"
          className="h-11! bg-white lg:w-1/5 w-full"
        />
        <DatePicker
          value={searchParams.get("to") ?? undefined}
          onChange={(value) => pushParams({ to: value })}
          placeholder="إلى تاريخ"
          className="h-11! bg-white lg:w-1/5 w-full"
        />

        {hasFilters && (
          <Button
            type="button"
            variant="destructive"
            className="h-11!"
            onClick={() => {
              setSearch("");
              router.push(pathname);
            }}
          >
            مسح الفلتر
            <X data-icon="inline-end" />
          </Button>
        )}
      </div>
    </div>
  );
}
