import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/os/empty-state";
import { Badge } from "@/components/ui/badge";
import { MarkHandledButton } from "@/features/inquiries/components/mark-handled-button.client";
import type { InquiryRow } from "@/features/inquiries/queries";
import { BUDGET_RANGES } from "@/features/inquiries/schemas";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function budgetLabel(value: string | null): string | null {
  return BUDGET_RANGES.find((b) => b.value === value)?.label ?? value;
}

export function InquiryList({ inquiries }: { inquiries: readonly InquiryRow[] }) {
  if (inquiries.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No enquiries yet"
        description="Messages sent through the website contact form appear here for organisation admins."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {inquiries.map((inquiry) => {
        const handled = Boolean(inquiry.handled_at);
        const budget = budgetLabel(inquiry.budget_range);
        return (
          <li
            key={inquiry.id}
            className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 data-[handled=true]:opacity-70"
            data-handled={handled}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">
                  {inquiry.name}
                  {inquiry.company ? <span className="text-fg-muted"> · {inquiry.company}</span> : null}
                </span>
                <a
                  href={`mailto:${inquiry.email}`}
                  className="truncate text-sm text-fg-muted underline-offset-4 hover:underline"
                >
                  {inquiry.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                {handled ? (
                  <Badge
                    variant="outline"
                    className="border-status-success-border bg-status-success-bg text-status-success-fg"
                  >
                    Handled
                  </Badge>
                ) : (
                  <>
                    <Badge
                      variant="outline"
                      className="border-status-info-border bg-status-info-bg text-status-info-fg"
                    >
                      New
                    </Badge>
                    <MarkHandledButton id={inquiry.id} />
                  </>
                )}
              </div>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{inquiry.message}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
              <span>{dateFormat.format(new Date(inquiry.created_at))}</span>
              {budget ? <span>Budget: {budget}</span> : null}
              {inquiry.source_path ? <span>From {inquiry.source_path}</span> : null}
              {handled && inquiry.handled_by ? (
                <span>Handled by {inquiry.handled_by.full_name || "an admin"}</span>
              ) : null}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
