"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ListPageError({
  error,
  reset,
  title = "تعذّر تحميل البيانات",
  description = "حدث خطأ غير متوقع أثناء جلب البيانات. جرّب مرة أخرى، أو راجع مدير النظام لو استمرت المشكلة.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-350 flex-col items-center gap-3 px-6 py-24 text-center">
      <TriangleAlert className="size-10 text-red-500" />
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <Button onClick={() => reset()}>إعادة المحاولة</Button>
    </div>
  );
}
