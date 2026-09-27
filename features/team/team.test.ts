import { describe, expect, it } from "vitest";

import { isMemberDocumentPath, kindForTemplate, memberDocumentPath, memberRecordSchema } from "./schemas";
import { memberTimeline } from "./timeline";

const ORG = "11111111-1111-4111-8111-111111111111";
const ALICE = "22222222-2222-4222-8222-222222222222";
const BOB = "33333333-3333-4333-8333-333333333333";

describe("member record", () => {
  it("accepts a sparse record and turns blanks into nulls", () => {
    const parsed = memberRecordSchema.parse({
      userId: ALICE,
      position: "Developer",
      employmentType: "",
      startDate: "",
    });
    expect(parsed).toMatchObject({ position: "Developer", employmentType: null, startDate: null, reportsTo: null });
  });

  it("refuses an end before the start and reporting to oneself", () => {
    expect(
      memberRecordSchema.safeParse({ userId: ALICE, startDate: "2026-05-01", endDate: "2026-04-01" }).success,
    ).toBe(false);
    expect(memberRecordSchema.safeParse({ userId: ALICE, reportsTo: ALICE }).success).toBe(false);
    expect(memberRecordSchema.safeParse({ userId: ALICE, reportsTo: BOB }).success).toBe(true);
  });
});

describe("member files", () => {
  it("keeps each file in its person's folder", () => {
    const path = memberDocumentPath(ORG, ALICE, "Signed contract (final).pdf", "u1");
    expect(path).toBe(`${ORG}/${ALICE}/u1-Signed-contract-final-.pdf`);
    expect(isMemberDocumentPath(path, ORG, ALICE)).toBe(true);
    expect(isMemberDocumentPath(path, ORG, BOB)).toBe(false);
    expect(isMemberDocumentPath(`${ORG}/${ALICE}/../${BOB}/x.pdf`, ORG, ALICE)).toBe(false);
  });

  it("files generated documents by what they are", () => {
    expect(kindForTemplate("offer_letter")).toBe("offer");
    expect(kindForTemplate("employment_contract")).toBe("contract");
    expect(kindForTemplate("employment_certificate")).toBe("certificate");
    expect(kindForTemplate("invoice")).toBe("other");
  });
});

describe("memberTimeline", () => {
  it("lists each recorded moment, newest first, without repeating a task", () => {
    const task = {
      id: "t1",
      seq: 4,
      title: "Login page",
      accepted_at: "2026-10-01T08:00:00Z",
      started_at: "2026-10-01T09:00:00Z",
      completed_at: "2026-10-02T16:00:00Z",
      project: { key: "AS", name: "Attendance" },
    };
    const timeline = memberTimeline([
      task,
      task,
      { ...task, id: "t2", accepted_at: null, started_at: null, completed_at: null },
    ]);
    expect(timeline.map((entry) => entry.verb)).toEqual(["finished", "started", "accepted"]);
  });
});
