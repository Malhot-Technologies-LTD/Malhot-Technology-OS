import { describe, expect, it } from "vitest";

import {
  activityChain,
  buildActivity,
  groupActivity,
  runIsComplete,
  type ActivityEvent,
  type ActivityKind,
} from "./activity";

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

const at = (iso: string) => `2026-09-24T${iso}Z`;
const event = (over: Partial<ActivityEvent> & { id: string; kind: ActivityKind; at: string }): ActivityEvent => ({
  actor: "Ana",
  subject: "AS-1 Ship it",
  href: "/os/tasks/AS-1",
  ...over,
});

describe("groupActivity", () => {
  it("says the name and the title once, and keeps the verbs in the order they happened", () => {
    // As the feed supplies them: newest first.
    const runs = groupActivity([
      event({ id: "AS-1:completed", kind: "task_completed", at: at("14:16:00") }),
      event({ id: "AS-1:accepted", kind: "task_accepted", at: at("14:15:30") }),
      event({ id: "AS-1:created", kind: "task_created", at: at("14:15:00") }),
    ]);

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      actor: "Ana",
      subject: "AS-1 Ship it",
      steps: ["task_created", "task_accepted", "task_completed"],
      at: at("14:16:00"),
      from: at("14:15:00"),
    });
  });

  it("will not join two people working on the same task", () => {
    const runs = groupActivity([
      event({ id: "AS-1:completed", kind: "task_completed", at: at("14:16:00"), actor: "Ben" }),
      event({ id: "AS-1:created", kind: "task_created", at: at("14:15:00"), actor: "Ana" }),
    ]);
    expect(runs.map((run) => [run.actor, run.steps])).toEqual([
      ["Ben", ["task_completed"]],
      ["Ana", ["task_created"]],
    ]);
  });

  it("will not join the same person across two different tasks", () => {
    const runs = groupActivity([
      event({ id: "AS-2:created", kind: "task_created", at: at("14:16:00"), subject: "AS-2 Other" }),
      event({ id: "AS-1:created", kind: "task_created", at: at("14:15:00") }),
    ]);
    expect(runs).toHaveLength(2);
  });

  /*
   * The one that would be wrong quietly. Anything the schema records without an
   * author carries actor null, and a member joining carries no subject at all —
   * matching on those alone would fold unrelated entries together.
   */
  it("will not join authorless events that share nothing but a null actor", () => {
    const runs = groupActivity([
      event({ id: "member:1", kind: "member_joined", at: at("12:00:00"), actor: "Ana", subject: "", href: null }),
      event({ id: "member:2", kind: "member_joined", at: at("11:00:00"), actor: "Ana", subject: "", href: null }),
    ]);
    expect(runs).toHaveLength(2);
  });

  it("joins a milestone that was set and then reached", () => {
    const runs = groupActivity([
      event({ id: "m:1:reached", kind: "milestone_reached", at: at("16:00:00"), actor: null, subject: "Beta" }),
      event({ id: "m:1:created", kind: "milestone_created", at: at("09:00:00"), actor: null, subject: "Beta" }),
    ]);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.steps).toEqual(["milestone_created", "milestone_reached"]);
  });

  it("only joins events that are next to each other, so the feed keeps its order", () => {
    const runs = groupActivity([
      event({ id: "AS-1:completed", kind: "task_completed", at: at("16:00:00") }),
      event({ id: "AS-2:created", kind: "task_created", at: at("15:00:00"), subject: "AS-2 Other" }),
      event({ id: "AS-1:created", kind: "task_created", at: at("14:00:00") }),
    ]);
    expect(runs.map((run) => run.subject)).toEqual(["AS-1 Ship it", "AS-2 Other", "AS-1 Ship it"]);
  });

  it("keeps an empty feed empty", () => {
    expect(groupActivity([])).toEqual([]);
  });

  describe("runIsComplete", () => {
    it("is true only when the run arrived somewhere final", () => {
      const run = (steps: ActivityKind[]) =>
        runIsComplete({ id: "x", actor: "Ana", subject: "s", href: null, steps, at: "", from: "" });
      expect(run(["task_created", "task_completed"])).toBe(true);
      expect(run(["milestone_created", "milestone_reached"])).toBe(true);
      expect(run(["task_created", "task_started"])).toBe(false);
      expect(run(["member_joined"])).toBe(false);
    });
  });
});

describe("activityChain", () => {
  it("keeps the full phrase when there is only one verb", () => {
    expect(activityChain(["milestone_created"])).toBe("set the milestone");
    expect(activityChain(["member_joined"])).toBe("joined the project");
  });

  it("shortens a chain so the line does not repeat the noun it already names", () => {
    expect(activityChain(["milestone_created", "milestone_reached"])).toBe("set → reached");
    expect(activityChain(["task_created", "task_accepted", "task_completed"])).toBe("created → accepted → completed");
  });

  it("has nothing to say about no steps", () => {
    expect(activityChain([])).toBe("");
  });
});
