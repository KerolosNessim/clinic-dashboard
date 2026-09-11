"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function ExpensesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل المصروفات"
      description="حدث خطأ أثناء جلب بيانات المصروفات. جرّب مرة أخرى."
    />
  );
}
