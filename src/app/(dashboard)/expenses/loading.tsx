import { ListPageSkeleton } from "@/components/shared/list-skeleton";

export default function ExpensesLoading() {
  return <ListPageSkeleton filters={4} />;
}
