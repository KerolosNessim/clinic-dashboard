"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function InventoryError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل المخزون"
      description="حدث خطأ أثناء جلب بيانات المخزون. جرّب مرة أخرى، أو راجع مدير النظام لو استمرت المشكلة."
    />
  );
}
