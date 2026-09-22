import { PageSkeleton } from "@/components/os/skeletons";

/** Fallback for any OS route without its own loading boundary. */
export default function OsLoading() {
  return <PageSkeleton />;
}
