"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Check, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { searchPatients } from "@/lib/actions/appointments";
import { initials } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type PatientOption = {
  id: string;
  fullName: string;
  phone: string;
  gender: string | null;
  birthDate: Date | null;
  registrationBranch: { name: string };
};

function calculateAge(birthDate: Date | null) {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function PatientCombobox({
  value,
  displayName,
  onChange,
  ariaInvalid,
}: {
  value: string;
  displayName?: string;
  onChange: (patient: { id: string; fullName: string }) => void;
  ariaInvalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientOption[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const data = await searchPatients(query);
        setResults(data);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-invalid={ariaInvalid}
            className={cn("h-11 w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            <span className="flex items-center gap-2 truncate">
              <User className="size-4 opacity-60" />
              {displayName || "ابحث عن مريض بالاسم أو الهاتف"}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-(--anchor-width) min-w-96 p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب اسم المريض أو رقم الهاتف"
            className="h-9 border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isPending && (
            <div className="flex items-center justify-center py-4">
              <Spinner />
            </div>
          )}
          {!isPending && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">لا يوجد مرضى مطابقين</p>
          )}
          {!isPending && query.trim().length < 2 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">اكتب حرفين على الأقل للبحث</p>
          )}
          {!isPending &&
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange({ id: p.id, fullName: p.fullName });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-start hover:bg-muted"
              >
                <Avatar>
                  <AvatarFallback className="bg-sky-100 text-sky-700">{initials(p.fullName)}</AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground">{p.fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[p.gender, calculateAge(p.birthDate) !== null ? `${calculateAge(p.birthDate)} سنة` : null, p.registrationBranch.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {p.phone}
                  </span>
                </span>
                {value === p.id && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
