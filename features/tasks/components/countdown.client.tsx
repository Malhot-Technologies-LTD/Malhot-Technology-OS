"use client";

import { useEffect, useState } from "react";

import { formatRemaining, remainingTone } from "@/features/tasks/schemas";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  danger: "text-status-danger-fg",
  warning: "text-status-warning-fg",
  neutral: "text-fg-muted",
} as const;

/**
 * How long is left on a deadline, counting down live.
 *
 * Rendered as `null` on the server and filled in after mount. The server and
 * the browser sit in different places and, more to the point, at different
 * instants — a server-rendered "3h 12m left" is already wrong by the time it
 * arrives, and React would flag the mismatch. The deadline itself comes from
 * the server as an ISO instant; only the arithmetic is local.
 *
 * Ticks once a minute, not once a second. The text is never finer than minutes,
 * so a faster timer would redraw the same characters and keep the tab awake for
 * nothing. It sharpens to every ten seconds inside the final minute, which is
 * the only stretch where a person is genuinely watching it.
 */
export function Countdown({ dueAt, className }: { dueAt: string; className?: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const deadline = new Date(dueAt).getTime();
    if (Number.isNaN(deadline)) return;

    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(left);
      // Inside the last minute the seconds matter; outside it they never show.
      timer = setTimeout(tick, Math.abs(left) < 60_000 ? 10_000 : 60_000);
    };

    tick();
    return () => clearTimeout(timer);
  }, [dueAt]);

  if (remaining === null) return null;

  return (
    <span className={cn("tabular-nums", TONE_CLASS[remainingTone(remaining)], className)}>
      {formatRemaining(remaining)}
    </span>
  );
}
