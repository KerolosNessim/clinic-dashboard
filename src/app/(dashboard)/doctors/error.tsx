"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function DoctorsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل الأطباء"
      description="حدث خطأ أثناء جلب قائمة الأطباء. جرّب مرة أخرى."
    />
  );
}
