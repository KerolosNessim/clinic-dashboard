import { toothKind, toothLabel, CONDITION_META } from "@/lib/dental-chart";
import { ToothShape } from "./tooth-shape";
import type { ToothCondition } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function Tooth({
  toothNumber,
  condition,
  hasNotes,
  jaw,
  selected,
  onClick,
}: {
  toothNumber: number;
  condition: ToothCondition;
  hasNotes: boolean;
  jaw: "upper" | "lower";
  selected: boolean;
  onClick: () => void;
}) {
  const meta = CONDITION_META[condition];
  const kind = toothKind(toothNumber);

  const numberLabel = (
    <span className="flex items-center gap-0.5 text-[8px] font-semibold text-slate-500 sm:gap-1 sm:text-[11px]">
      {toothNumber}
      {hasNotes && <span className="size-1 rounded-full bg-sky-500" aria-hidden="true" />}
    </span>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      title={toothLabel(toothNumber)}
      aria-label={`${toothLabel(toothNumber)} — رقم ${toothNumber} — ${meta.label}`}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-md p-0.5 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-sky-500 sm:gap-1 sm:p-1",
        selected && "-translate-y-0.5 ring-2 ring-sky-500 ring-offset-2 ring-offset-white"
      )}
    >
      {jaw === "upper" && numberLabel}
      <ToothShape
        kind={kind}
        crownFill={meta.crownFill}
        crownStroke={meta.crownStroke}
        rootFill={meta.rootFill}
        rootStroke={meta.rootStroke}
        dashed={meta.dashed}
        className={cn(
          "h-6 w-auto sm:h-8 md:h-9 lg:h-11",
          meta.dashed && "opacity-60",
          jaw === "upper" && "[transform:scaleY(-1)]"
        )}
      />
      {jaw === "lower" && numberLabel}
    </button>
  );
}
