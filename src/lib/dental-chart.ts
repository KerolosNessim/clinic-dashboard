import { ToothCondition } from "@/generated/prisma/enums";

/** FDI numbering, arranged so each column lines up with the matching tooth in the opposite jaw */
export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

// Valid FDI tooth numbers: 11-18, 21-28, 31-38, 41-48 (quadrant 1-4, position 1-8).
export function isValidFdiToothNumber(toothNumber: number) {
  const quadrant = Math.floor(toothNumber / 10);
  const position = toothNumber % 10;
  return quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
}

export type ToothKind = "INCISOR" | "CANINE" | "PREMOLAR" | "MOLAR";

export function toothKind(toothNumber: number): ToothKind {
  const position = toothNumber % 10;
  if (position <= 2) return "INCISOR";
  if (position === 3) return "CANINE";
  if (position <= 5) return "PREMOLAR";
  return "MOLAR";
}

const KIND_LABEL: Record<ToothKind, string> = {
  INCISOR: "قاطع",
  CANINE: "ناب",
  PREMOLAR: "ضاحك",
  MOLAR: "طاحن",
};

export function toothLabel(toothNumber: number): string {
  const quadrant = Math.floor(toothNumber / 10);
  const jaw = quadrant === 1 || quadrant === 2 ? "علوي" : "سفلي";
  const side = quadrant === 1 || quadrant === 4 ? "أيمن" : "أيسر";
  return `${KIND_LABEL[toothKind(toothNumber)]} ${jaw} ${side}`;
}

export const CONDITION_ORDER: ToothCondition[] = ["HEALTHY", "FILLED", "NEEDS_TREATMENT", "CROWN", "EXTRACTED"];

export const CONDITION_META: Record<
  ToothCondition,
  {
    label: string;
    /** SVG fill/stroke utilities — only apply inside an <svg>, use for the tooth shape */
    crownFill: string;
    crownStroke: string;
    rootFill: string;
    rootStroke: string;
    /** DOM bg/border utilities — use for badges, legend swatches, and other non-SVG elements */
    swatchBg: string;
    swatchBorder: string;
    swatchText: string;
    dashed?: boolean;
  }
> = {
  HEALTHY: {
    label: "سليم",
    crownFill: "fill-slate-100",
    crownStroke: "stroke-slate-300",
    rootFill: "fill-slate-50",
    rootStroke: "stroke-slate-300",
    swatchBg: "bg-slate-100",
    swatchBorder: "border-slate-300",
    swatchText: "text-slate-700",
  },
  FILLED: {
    label: "محشو",
    crownFill: "fill-sky-100",
    crownStroke: "stroke-sky-300",
    rootFill: "fill-sky-50",
    rootStroke: "stroke-sky-300",
    swatchBg: "bg-sky-100",
    swatchBorder: "border-sky-300",
    swatchText: "text-sky-700",
  },
  EXTRACTED: {
    label: "مخلوع",
    crownFill: "fill-slate-50",
    crownStroke: "stroke-slate-300",
    rootFill: "fill-slate-50",
    rootStroke: "stroke-slate-300",
    swatchBg: "bg-slate-50",
    swatchBorder: "border-slate-300",
    swatchText: "text-slate-500",
    dashed: true,
  },
  NEEDS_TREATMENT: {
    label: "يحتاج علاج",
    crownFill: "fill-red-100",
    crownStroke: "stroke-red-300",
    rootFill: "fill-red-50",
    rootStroke: "stroke-red-300",
    swatchBg: "bg-red-100",
    swatchBorder: "border-red-300",
    swatchText: "text-red-700",
  },
  CROWN: {
    label: "تركيبة",
    crownFill: "fill-teal-100",
    crownStroke: "stroke-teal-300",
    rootFill: "fill-teal-50",
    rootStroke: "stroke-teal-300",
    swatchBg: "bg-teal-100",
    swatchBorder: "border-teal-300",
    swatchText: "text-teal-700",
  },
};
