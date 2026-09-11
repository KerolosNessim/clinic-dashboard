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

export function PatientsFilters({
  branches,
  doctors,
}: {
  branches: { id: string; name: string }[];
  doctors: { id: string; name: string }[];
}) {
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

  const hasFilters = searchParams.get("q") || searchParams.get("branch") || searchParams.get("doctor");

  return (
    <div className="flex max-lg:flex-wrap items-center gap-3">
      <InputGroup className="h-11 lg:w-1/2 w-full bg-white">
        <InputGroupInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف"
        />
        <InputGroupAddon align="inline-start" className="px-2">
          <Search className="size-4" />
        </InputGroupAddon>
      </InputGroup>

      {branches.length > 0 && (
        <Select
          value={searchParams.get("branch") ?? ""}
          onValueChange={(value) => pushParams({ branch: value || undefined })}
        >
          <SelectTrigger className="h-11! bg-white lg:w-1/4 w-full">
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

      {doctors.length > 0 && (
        <Select
          value={searchParams.get("doctor") ?? ""}
          onValueChange={(value) => pushParams({ doctor: value || undefined })}
        >
          <SelectTrigger className="h-11! bg-white lg:w-1/4 w-full">
            <SelectValue placeholder="الطبيب">
              {(value: string) => doctors.find((d) => d.id === value)?.name ?? "الطبيب"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
  );
}
