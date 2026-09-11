"use client";

import { UPPER_TEETH, LOWER_TEETH, CONDITION_ORDER, CONDITION_META } from "@/lib/dental-chart";
import type { ToothCondition } from "@/generated/prisma/enums";
import { Tooth } from "./tooth";
import { ToothDetailPanel } from "./tooth-detail-panel";
import { useDentalChart } from "./use-dental-chart";
import { cn } from "@/lib/utils";

function ToothRow({
  teeth,
  jaw,
  getTooth,
  selectedTooth,
  onSelect,
}: {
  teeth: readonly number[];
  jaw: "upper" | "lower";
  getTooth: (n: number) => { condition: ToothCondition; notes: string | null };
  selectedTooth: number | null;
  onSelect: (n: number) => void;
}) {
  return (
    <div dir="rtl" className="flex min-w-max items-end justify-center gap-0.5 sm:gap-1">
      {teeth.map((n, i) => {
        const state = getTooth(n);
        return (
          <div
            key={n}
            className={cn(i === 7 && "border-e border-dashed border-slate-300 pe-1 me-0.5 sm:pe-2 sm:me-1")}
          >
            <Tooth
              toothNumber={n}
              condition={state.condition}
              hasNotes={!!state.notes}
              jaw={jaw}
              selected={selectedTooth === n}
              onClick={() => onSelect(n)}
            />
          </div>
        );
      })}
    </div>
  );
}

export function DentalChart({
  patientId,
  initialRecords,
}: {
  patientId: string;
  initialRecords: { toothNumber: number; condition: ToothCondition; notes: string | null }[];
}) {
  const { getTooth, selectedTooth, setSelectedTooth, save, isPending, error } = useDentalChart(
    patientId,
    initialRecords
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-white p-4 sm:p-6 lg:col-span-2">
        <div className="mx-auto w-full max-w-2xl overflow-x-auto sm:overflow-x-visible">
          <div className="mx-auto mb-2 h-3 w-[85%] rounded-full bg-rose-100" />
          <ToothRow teeth={UPPER_TEETH} jaw="upper" getTooth={getTooth} selectedTooth={selectedTooth} onSelect={setSelectedTooth} />

          <div className="my-5 border-t border-dashed border-rose-200" />

          <ToothRow teeth={LOWER_TEETH} jaw="lower" getTooth={getTooth} selectedTooth={selectedTooth} onSelect={setSelectedTooth} />
          <div className="mx-auto mt-2 h-3 w-[85%] rounded-full bg-rose-100" />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border pt-4">
          {CONDITION_ORDER.map((c) => (
            <div key={c} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className={cn(
                  "size-3 rounded-sm border",
                  CONDITION_META[c].swatchBg,
                  CONDITION_META[c].swatchBorder,
                  CONDITION_META[c].dashed && "border-dashed"
                )}
              />
              {CONDITION_META[c].label}
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-1">
        <ToothDetailPanel
          toothNumber={selectedTooth}
          state={selectedTooth ? getTooth(selectedTooth) : { condition: "HEALTHY", notes: null }}
          onSave={(condition, notes) => selectedTooth && save(selectedTooth, condition, notes)}
          isPending={isPending}
          error={error}
        />
      </div>
    </div>
  );
}
