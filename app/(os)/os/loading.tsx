import { DashboardSkeleton } from "@/components/os/skeletons";

/** Home's own loading boundary; it is the densest page in the OS. */
export default function OsLoading() {
  return <DashboardSkeleton />;
}
