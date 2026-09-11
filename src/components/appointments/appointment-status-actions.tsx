"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateAppointmentStatus, cancelAppointment } from "@/lib/actions/appointments";
import { RecordVisitDialog } from "@/components/appointments/record-visit-dialog";
import { isSameCalendarDay } from "@/lib/date-utils";
import type { AppointmentStatus } from "@/generated/prisma/client";

export function AppointmentStatusActions({
  appointmentId,
  status,
  patientName,
  branchId,
  doctorId,
  dateTime,
  branches,
  doctors,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  patientName?: string;
  branchId: string;
  doctorId: string;
  dateTime: Date;
  branches: { id: string; name: string; workingHours: unknown }[];
  doctors: { id: string; name: string; branchIds: string[] }[];
}) {
  const isToday = isSameCalendarDay(new Date(dateTime), new Date());
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [noShowReason, setNoShowReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleNoShow() {
    setError(null);
    startTransition(async () => {
      const result = await updateAppointmentStatus(appointmentId, "NO_SHOW", noShowReason || undefined);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNoShowOpen(false);
      setNoShowReason("");
      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelAppointment(appointmentId, cancelReason || undefined);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setCancelOpen(false);
      setCancelReason("");
      router.refresh();
    });
  }

  if (status !== "CONFIRMED") return null;

  return (
    <div className="flex items-center gap-1.5">
      <RecordVisitDialog
        appointmentId={appointmentId}
        patientName={patientName}
        branchId={branchId}
        doctorId={doctorId}
        dateTime={dateTime}
        branches={branches}
        doctors={doctors}
      />

      <AlertDialog
        open={noShowOpen}
        onOpenChange={(next) => {
          setNoShowOpen(next);
          if (!next) setError(null);
        }}
      >
        <AlertDialogTrigger
          render={
            <Button
              variant="amber"
              type="button"
              disabled={isPending || !isToday}
              title={!isToday ? "لا يمكن تسجيل عدم الحضور إلا في نفس يوم الموعد" : undefined}
            >
              <XCircle data-icon="inline-end" />
              لم يحضر
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">تسجيل عدم الحضور</AlertDialogTitle>
            <AlertDialogDescription>{error ?? "هل المريض لم يحضر لهذا الموعد؟"}</AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="noShowReason">السبب (اختياري)</FieldLabel>
            <Textarea
              id="noShowReason"
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              placeholder="مثال: لم يرد على الاتصال"
            />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">تراجع</AlertDialogCancel>
            <AlertDialogAction type="button" variant="amber" disabled={isPending} onClick={handleNoShow}>
              {isPending && <Spinner />}
              تأكيد عدم الحضور
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelOpen}
        onOpenChange={(next) => {
          setCancelOpen(next);
          if (!next) setError(null);
        }}
      >
        <AlertDialogTrigger
          render={
            <Button variant="destructive" type="button" disabled={isPending}>
              <Ban data-icon="inline-end" />
              إلغاء
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">إلغاء الموعد</AlertDialogTitle>
            <AlertDialogDescription>{error ?? "هل أنت متأكد من إلغاء هذا الموعد؟"}</AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="cancelReason">سبب الإلغاء (اختياري)</FieldLabel>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="مثال: طلب المريض تأجيل الموعد"
            />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">تراجع</AlertDialogCancel>
            <AlertDialogAction type="button" variant="destructive" disabled={isPending} onClick={handleCancel}>
              {isPending && <Spinner />}
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
