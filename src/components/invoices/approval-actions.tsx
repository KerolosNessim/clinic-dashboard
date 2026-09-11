"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X as XIcon } from "lucide-react";
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
import { processApprovalRequest } from "@/lib/actions/invoices";

export function ApprovalActions({ requestId }: { requestId: string }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await processApprovalRequest(requestId, "APPROVED");
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await processApprovalRequest(requestId, "REJECTED", adminNote || undefined);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setRejectOpen(false);
      setAdminNote("");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="emerald" type="button" disabled={isPending} onClick={handleApprove}>
        {isPending && <Spinner />}
        اعتماد
        <Check data-icon="inline-end" />
      </Button>

      <AlertDialog
        open={rejectOpen}
        onOpenChange={(next) => {
          setRejectOpen(next);
          if (!next) setError(null);
        }}
      >
        <AlertDialogTrigger
          render={
            <Button variant="destructive" type="button" disabled={isPending}>
              رفض
              <XIcon data-icon="inline-end" />
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">رفض الطلب</AlertDialogTitle>
            <AlertDialogDescription>{error ?? "أضف ملاحظة توضح سبب الرفض (اختياري)"}</AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="adminNote">ملاحظة الأدمن</FieldLabel>
            <Textarea
              id="adminNote"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="مثال: المبلغ المطلوب تعديله غير مبرر"
            />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">تراجع</AlertDialogCancel>
            <AlertDialogAction type="button" variant="destructive" disabled={isPending} onClick={handleReject}>
              {isPending && <Spinner />}
              تأكيد الرفض
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
