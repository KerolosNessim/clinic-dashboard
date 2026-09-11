"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function InvoicesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل الفواتير"
      description="حدث خطأ أثناء جلب الفواتير. جرّب مرة أخرى."
    />
  );
}
