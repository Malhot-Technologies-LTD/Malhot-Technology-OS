/**
 * What a project needs before it can leave planning
 * (docs/product/project-lifecycle.md#status-state-machine).
 *
 * One definition, three readers: the overview checklist, the dashboard's
 * blocker count, and `changeProjectStatus`. They used to compute the same rule
 * separately, which is how a project could satisfy the checklist on screen and
 * still be refused by the server — the two could drift and nobody would notice
 * until someone pressed Activate.
 *
 * Pure and dependency-free so it can be unit tested and used on either side.
 */

export type ReadinessFacts = {
  goalCount: number;
  mvpCount: number;
  managerId: string | null;
  /** Milestones are recommended, not required; omit when the caller has not loaded them. */
  milestoneCount?: number;
  startDate: string | null;
};

export type ReadinessItem = {
  key: "goal" | "mvp" | "manager" | "startDate" | "milestone";
  /** Checklist wording: a thing you can tick off. */
  label: string;
  /** Sentence wording: reads after "This project still needs …". */
  need: string;
  done: boolean;
  /** Recommended rather than required; never blocks activation. */
  optional?: boolean;
};

export function readinessItems(facts: ReadinessFacts): ReadinessItem[] {
  const items: ReadinessItem[] = [
    { key: "goal", label: "At least one goal", need: "a goal", done: facts.goalCount > 0 },
    { key: "mvp", label: "At least one MVP item", need: "an MVP item", done: facts.mvpCount > 0 },
    { key: "manager", label: "A manager", need: "a manager", done: Boolean(facts.managerId) },
    { key: "startDate", label: "A start date", need: "a start date", done: Boolean(facts.startDate) },
  ];

  if (facts.milestoneCount !== undefined) {
    items.push({
      key: "milestone",
      label: "A milestone",
      need: "a milestone",
      done: facts.milestoneCount > 0,
      optional: true,
    });
  }

  return items;
}

/** The required items still outstanding. Empty means the project can be activated. */
export function readinessBlockers(facts: ReadinessFacts): ReadinessItem[] {
  return readinessItems(facts).filter((item) => !item.optional && !item.done);
}

export function isReadyToStart(facts: ReadinessFacts): boolean {
  return readinessBlockers(facts).length === 0;
}

/**
 * Names what is actually missing rather than restating the whole rule.
 *
 * "A project needs at least one goal, one MVP item, a manager and a start date"
 * is true but useless when three of the four are already there: it reads as a
 * denial of work you have done, and leaves you to guess which one it means.
 */
export function readinessMessage(blockers: readonly ReadinessItem[]): string {
  if (blockers.length === 0) return "This project is ready to start.";
  return `This project still needs ${joinNeeds(blockers.map((item) => item.need))} before it can start.`;
}

function joinNeeds(needs: readonly string[]): string {
  if (needs.length === 1) return needs[0]!;
  return `${needs.slice(0, -1).join(", ")} and ${needs[needs.length - 1]}`;
}
