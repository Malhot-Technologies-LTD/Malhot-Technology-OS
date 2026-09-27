import { describe, expect, it } from "vitest";

import { buildActivity } from "./activity";

const empty = { projectKey: "AS", tasks: [], goals: [], mvpItems: [], milestones: [], members: [] };

describe("buildActivity", () => {
  it("turns each recorded moment of a task into its own event, newest first", () => {
    const events = buildActivity({
      ...empty,
      tasks: [
        {
          seq: 7,
          title: "Ship it",
          created_at: "2026-09-01T09:00:00Z",
          accepted_at: "2026-09-01T10:00:00Z",
          started_at: "2026-09-02T09:00:00Z",
          completed_at: "2026-09-03T09:00:00Z",
          assignee: { full_name: "Ana" },
          creator: { full_name: "Ben" },
        },
      ],
    });
    expect(events.map((event) => [event.kind, event.actor])).toEqual([
      ["task_completed", "Ana"],
      ["task_started", "Ana"],
      ["task_accepted", "Ana"],
      ["task_created", "Ben"],
    ]);
    expect(events[0]).toMatchObject({ subject: "AS-7 Ship it", href: "/os/tasks/AS-7" });
  });

  it("skips moments that have not happened", () => {
    const events = buildActivity({
      ...empty,
      tasks: [
        {
          seq: 1,
          title: "Open",
          created_at: "2026-09-01T09:00:00Z",
          accepted_at: null,
          started_at: null,
          completed_at: null,
          assignee: null,
        },
      ],
      milestones: [{ id: "m1", title: "Beta", created_at: "2026-09-01T08:00:00Z", completed_at: null }],
    });
    expect(events.map((event) => event.kind)).toEqual(["task_created", "milestone_created"]);
    expect(events[0]!.actor).toBeNull();
  });

  it("includes planning, people and documents, and respects the limit", () => {
    const events = buildActivity(
      {
        ...empty,
        goals: [{ id: "g", title: "Goal", created_at: "2026-09-05T00:00:00Z" }],
        mvpItems: [{ id: "v", title: "Item", created_at: "2026-09-04T00:00:00Z" }],
        members: [{ user_id: "u", created_at: "2026-09-03T00:00:00Z", profile: { full_name: "Cai" } }],
        documents: [{ id: "d", title: "Brief", created_at: "2026-09-06T00:00:00Z", uploader: { full_name: "Ana" } }],
      },
      3,
    );
    expect(events.map((event) => event.kind)).toEqual(["document_uploaded", "goal_created", "mvp_created"]);
  });
});
