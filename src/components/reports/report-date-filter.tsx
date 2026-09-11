"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { DatePicker } from "@/components/shared/date-picker";

export function ReportDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function pushParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters = searchParams.get("from") || searchParams.get("to");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field className="w-full sm:w-56">
        <FieldLabel>من تاريخ</FieldLabel>
        <DatePicker value={searchParams.get("from") ?? undefined} onChange={(v) => pushParams({ from: v })} />
      </Field>
      <Field className="w-full sm:w-56">
        <FieldLabel>إلى تاريخ</FieldLabel>
        <DatePicker value={searchParams.get("to") ?? undefined} onChange={(v) => pushParams({ to: v })} />
      </Field>
      {hasFilters && (
        <Button type="button" variant="destructive" className="h-11!" onClick={() => router.push(pathname)}>
          مسح
          <X data-icon="inline-end" />
        </Button>
      )}
    </div>
  );
}
