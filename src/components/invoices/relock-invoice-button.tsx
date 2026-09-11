"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { relockInvoice } from "@/lib/actions/invoices";

export function RelockInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await relockInvoice(invoiceId);
      if (result?.error) {
        toast.add({ title: result.error, type: "error" });
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button variant="outline" type="button" disabled={isPending} onClick={handleClick}>
      {isPending ? <Spinner /> : <Lock data-icon="inline-start" />}
      إعادة القفل
    </Button>
  );
}
