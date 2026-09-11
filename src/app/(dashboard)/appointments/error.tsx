"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function AppointmentsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل المواعيد"
      description="حدث خطأ أثناء جلب المواعيد. جرّب مرة أخرى."
    />
  );
}
