import type { ToothKind } from "@/lib/dental-chart";

const SHAPES: Record<ToothKind, { viewBox: string; crown: string; roots: string[] }> = {
  INCISOR: {
    viewBox: "0 0 32 50",
    crown: "M10,29 Q8,21 8,11 Q8,7 12,6 L20,6 Q24,7 24,11 Q24,21 22,29 Z",
    roots: ["M10,29 Q9,37 16,47 Q23,37 22,29 Z"],
  },
  CANINE: {
    viewBox: "0 0 32 50",
    crown: "M10,29 Q8,21 8,12 Q8,9 10,8 L13,8 L16,4 L19,8 L22,8 Q24,9 24,12 Q24,21 22,29 Z",
    roots: ["M10,29 Q9,37 16,47 Q23,37 22,29 Z"],
  },
  PREMOLAR: {
    viewBox: "0 0 32 50",
    crown:
      "M10,29 Q8,21 8,12 Q8,8 11,7 Q12,5 14,7 Q16,9 18,7 Q20,5 21,7 Q24,8 24,12 Q24,21 22,29 Z",
    roots: ["M10,29 Q9,37 16,47 Q23,37 22,29 Z"],
  },
  MOLAR: {
    viewBox: "0 0 38 52",
    crown:
      "M13,31 Q10,23 10,13 Q10,9 13,8 Q15,6 17,8 Q19,6 21,8 Q23,6 25,8 Q28,9 28,13 Q28,23 25,31 Z",
    roots: [
      "M13,31 Q11,37 14,43 Q15,45 16,42 Q16,36 15,31 Z",
      "M25,31 Q27,37 24,43 Q23,45 22,42 Q22,36 23,31 Z",
    ],
  },
};

export function ToothShape({
  kind,
  crownFill,
  crownStroke,
  rootFill,
  rootStroke,
  dashed,
  className,
}: {
  kind: ToothKind;
  crownFill: string;
  crownStroke: string;
  rootFill: string;
  rootStroke: string;
  dashed?: boolean;
  className?: string;
}) {
  const shape = SHAPES[kind];
  return (
    <svg viewBox={shape.viewBox} className={className} aria-hidden="true">
      {shape.roots.map((d, i) => (
        <path
          key={i}
          d={d}
          className={`${rootFill} ${rootStroke} opacity-70`}
          strokeWidth={1.5}
          strokeDasharray={dashed ? "3 2" : undefined}
        />
      ))}
      <path
        d={shape.crown}
        className={`${crownFill} ${crownStroke}`}
        strokeWidth={1.5}
        strokeDasharray={dashed ? "3 2" : undefined}
      />
    </svg>
  );
}
