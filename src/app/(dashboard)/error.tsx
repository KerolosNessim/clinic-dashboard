"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل لوحة التحكم"
      description="حدث خطأ أثناء جلب بيانات اليوم. جرّب مرة أخرى."
    />
  );
}
