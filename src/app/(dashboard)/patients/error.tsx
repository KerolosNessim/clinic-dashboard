"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function PatientsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل المرضى"
      description="حدث خطأ أثناء جلب قائمة المرضى. جرّب مرة أخرى."
    />
  );
}
