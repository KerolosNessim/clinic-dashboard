"use client";

import { ListPageError } from "@/components/shared/list-error";

export default function BranchesError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ListPageError
      {...props}
      title="تعذّر تحميل الفروع"
      description="حدث خطأ أثناء جلب قائمة الفروع. جرّب مرة أخرى."
    />
  );
}
