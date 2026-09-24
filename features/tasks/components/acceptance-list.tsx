import { CalendarClock, Check, Clock } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/os/user-menu.client";
import { formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { Countdown } from "@/features/tasks/components/countdown.client";
import type { AcceptanceRow } from "@/features/tasks/queries";

/**
 * Work that has been picked up, or is waiting to be.
 *
 * Deliberately a list rather than the task card. The card answers "what is this
 * task"; this answers "who acknowledged what, and when" — the person is the
 * subject, so they lead each row, and everything else is context.
 */
export function AcceptanceList({ rows, mode }: { rows: readonly AcceptanceRow[]; mode: "accepted" | "waiting" }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="well"
        icon={mode === "accepted" ? Check : Clock}
        title={mode === "accepted" ? "Nothing accepted yet" : "Everything has been picked up"}
        description={
          mode === "accepted"
            ? "When somebody takes on a task you assigned, it appears here."
            : "Every task you have handed out has been acknowledged by the person holding it."
        }
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-4 p-4">
          <UserAvatar name={row.assignee?.full_name ?? "Unassigned"} avatarUrl={row.assignee?.avatar_url ?? null} />

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px]">
              <span className="font-medium">{row.assignee?.full_name ?? "Nobody"}</span>{" "}
              <span className="text-fg-muted">{mode === "accepted" ? "took on" : "has not yet accepted"}</span>{" "}
              <span className="font-medium">{row.title}</span>
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
              {row.project ? (
                <Link
                  href={`/os/projects/${row.project.key}`}
                  className="font-mono text-fg-subtle hover:text-fg hover:underline"
                >
                  {row.project.key}-{row.seq}
                </Link>
              ) : null}
              {mode === "accepted" && row.accepted_at ? <span>accepted {formatDate(row.accepted_at)}</span> : null}
              {row.due_at ? (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  {formatDate(row.due_at)}
                  <Countdown dueAt={row.due_at} className="font-medium" />
                </span>
              ) : null}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
