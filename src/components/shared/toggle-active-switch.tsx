"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

export function ToggleActiveSwitch({
  id,
  initialActive,
  action,
}: {
  id: string;
  initialActive: boolean;
  action: (id: string, isActive: boolean) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [checked, setChecked] = useState(initialActive);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      const result = await action(id, next);
      if (result?.error) {
        setChecked(!next);
        toast.add({ title: result.error, type: "error" });
        return;
      }
      router.refresh();
    });
  }

  return <Switch checked={checked} onCheckedChange={handleChange} />;
}
