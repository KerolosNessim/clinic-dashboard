import { ListPageSkeleton } from "@/components/shared/list-skeleton";

export default function AppointmentsLoading() {
  return <ListPageSkeleton filters={4} rows={7} />;
}
