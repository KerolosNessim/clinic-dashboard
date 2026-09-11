"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function ReportsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل التقارير"
      description="حدث خطأ أثناء حساب التقرير، ربما بسبب نطاق تاريخ غير صالح. جرّب مرة أخرى."
    />
  );
}
