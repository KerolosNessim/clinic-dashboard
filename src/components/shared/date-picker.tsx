"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { arEG } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDateValue(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDateValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function DatePicker({
  value,
  onChange,
  placeholder = "اختر تاريخ",
  className,
  disabledAfter,
  disabledBefore,
  "aria-invalid": ariaInvalid,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Dates after this are not selectable (e.g. today, for a birth date) */
  disabledAfter?: Date;
  /** Dates before this are not selectable (e.g. today, to block booking in the past) */
  disabledBefore?: Date;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);

  const disabledMatchers = [
    disabledAfter ? { after: disabledAfter } : null,
    disabledBefore ? { before: disabledBefore } : null,
  ].filter((m): m is { after: Date } | { before: Date } => m !== null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-invalid={ariaInvalid}
            className={cn(
              "h-11 w-full justify-between font-normal",
              !selected && "text-muted-foreground",
              className
            )}
          >
            {selected
              ? new Intl.DateTimeFormat("ar-EG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(selected)
              : placeholder}
            <CalendarIcon className="size-4 opacity-60" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          dir="rtl"
          locale={arEG}
          captionLayout="dropdown"
          endMonth={disabledAfter}
          startMonth={disabledBefore}
          disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
          defaultMonth={selected ?? disabledBefore}
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(toDateValue(date));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
