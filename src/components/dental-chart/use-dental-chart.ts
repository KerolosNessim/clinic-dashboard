"use client";

import { useState, useTransition } from "react";
import { updateToothRecord } from "@/lib/actions/dental-chart";
import type { ToothCondition } from "@/generated/prisma/enums";

export type ToothState = { condition: ToothCondition; notes: string | null };
type ToothRecordMap = Record<number, ToothState>;

const DEFAULT_STATE: ToothState = { condition: "HEALTHY", notes: null };

export function useDentalChart(
  patientId: string,
  initialRecords: { toothNumber: number; condition: ToothCondition; notes: string | null }[]
) {
  const [records, setRecords] = useState<ToothRecordMap>(() => {
    const map: ToothRecordMap = {};
    for (const r of initialRecords) map[r.toothNumber] = { condition: r.condition, notes: r.notes };
    return map;
  });
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function getTooth(toothNumber: number): ToothState {
    return records[toothNumber] ?? DEFAULT_STATE;
  }

  function save(toothNumber: number, condition: ToothCondition, notes: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateToothRecord(patientId, toothNumber, { condition, notes });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setRecords((prev) => ({ ...prev, [toothNumber]: { condition, notes: notes || null } }));
    });
  }

  return { getTooth, selectedTooth, setSelectedTooth, save, isPending, error };
}
