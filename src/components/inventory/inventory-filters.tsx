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
const CATEGORY_OPTIONS = [
  { value: "MATERIALS", label: "مواد" },
  { value: "TOOLS", label: "أدوات" },
  { value: "DEVICES", label: "أجهزة" },
];

export function InventoryFilters({ branches }: { branches: { id: string; name: string }[] }) {
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

  const hasFilters = searchParams.get("q") || searchParams.get("branch") || searchParams.get("category");

  return (
    <div className="space-y-3">
      <InputGroup className="h-12 lg:full w-full bg-white text-base">
        <InputGroupInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم الصنف"
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
          value={searchParams.get("category") ?? ""}
          onValueChange={(value) => pushParams({ category: value || undefined })}
        >
          <SelectTrigger className="h-11! bg-white lg:w-1/5 w-full">
            <SelectValue placeholder="الفئة">
              {(value: string) => CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? "الفئة"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
