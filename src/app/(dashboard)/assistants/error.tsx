"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function AssistantsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل المساعدين"
      description="حدث خطأ أثناء جلب قائمة المساعدين. جرّب مرة أخرى."
    />
  );
}
