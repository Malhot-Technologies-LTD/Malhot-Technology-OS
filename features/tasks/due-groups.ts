import type { TaskStatus } from "@/features/tasks/schemas";
import type { Priority } from "@/types/domain";

export type MyTask = {
  id: string;
  seq: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueAt: string | null;
  acceptedAt: string | null;
  project: { key: string; name: string };
};

export type DueGroup = { key: string; label: string; tasks: MyTask[] };

const DAY = 86_400_000;

/**
 * Buckets by the reader's own calendar: "today" ends at their midnight, not the
 * server's. That is why this runs in the browser, and why it needs a clock.
 */
export function groupTasks(tasks: readonly MyTask[], now: Date): DueGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + DAY;
  const endOfWeek = startOfToday + 7 * DAY;
  const groups: DueGroup[] = [
    { key: "overdue", label: "Overdue", tasks: [] },
    { key: "today", label: "Today", tasks: [] },
    { key: "week", label: "Next 7 days", tasks: [] },
    { key: "later", label: "Later", tasks: [] },
    { key: "none", label: "No deadline", tasks: [] },
  ];
  const [overdue, today, week, later, none] = groups;
  for (const task of tasks) {
    if (!task.dueAt) none.tasks.push(task);
    else {
      const due = Date.parse(task.dueAt);
      if (due < now.getTime()) overdue.tasks.push(task);
      else if (due < endOfToday) today.tasks.push(task);
      else if (due < endOfWeek) week.tasks.push(task);
      else later.tasks.push(task);
    }
  }
  return groups.filter((group) => group.tasks.length > 0);
}
