import { describe, expect, it } from "vitest";

import type { DocumentContent } from "../content";
import type { DocumentTemplate, TemplateContext, Values } from "../template-kit";
import { FINANCE_TEMPLATES, daysOverdue, describeOverdue, parseAmount, sumAmounts } from "./finance";

const context: TemplateContext = {
  today: "2026-09-27",
  letterhead: {
    companyName: "Malhot Tech",
    tagline: "",
    address: "Kigali, Rwanda",
    email: "finance@example.com",
    phone: "",
    website: "",
    registration: "",
  },
  project: {
    key: "AS",
    name: "Attendance system",
    clientName: "Umoja Ltd",
    milestones: [
      { title: "Design", due: "2026-08-01", done: true },
      { title: "MVP", due: "2026-09-01", done: true },
      { title: "Launch", due: "2026-10-01", done: false },
    ],
  },
};

function template(key: string): DocumentTemplate {
  const found = FINANCE_TEMPLATES.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`No template ${key}`);
  return found;
}

function defaults(found: DocumentTemplate, from: TemplateContext = context): Values {
  const values: Values = {};
  for (const field of found.fields) {
    if (field.type === "items") values[field.name] = [{ description: "", quantity: 1, unitPrice: 0 }];
    else values[field.name] = field.default ? field.default(from) : "";
  }
  return values;
}

function facts(content: DocumentContent): Record<string, string> {
  return Object.fromEntries(content.blocks.flatMap((block) => (block.kind === "facts" ? block.rows : [])));
}

describe("finance templates", () => {
  it.each(FINANCE_TEMPLATES.map((found) => [found.key, found] as const))(
    "%s builds with and without a project",
    (_, found) => {
      for (const from of [context, { ...context, project: null }]) {
        const content = found.build(defaults(found, from), from);
        expect(content.title.length).toBeGreaterThan(0);
        expect(content.blocks.length).toBeGreaterThan(0);
        expect(found.category).toBe("Finance");
      }
    },
  );

  it("numbers references by default", () => {
    expect(defaults(template("proforma_invoice")).reference).toBe("PRO/20260927");
    expect(defaults(template("payment_receipt")).reference).toBe("RCT/20260927");
    expect(defaults(template("credit_note")).reference).toBe("CN/20260927");
    expect(defaults(template("payment_request")).reference).toBe("PR/20260927");
    expect(defaults(template("expense_claim")).reference).toBe("EXP/20260927");
    expect(defaults(template("purchase_order")).reference).toBe("PO/20260927");
  });

  it("prefills the payment request from the project", () => {
    const values = defaults(template("payment_request"));
    expect(values.clientName).toBe("Umoja Ltd");
    expect(values.projectName).toBe("Attendance system");
    expect(values.milestone).toBe("MVP");
  });
});

describe("days overdue", () => {
  it("counts whole days from the due date to the letter date", () => {
    expect(daysOverdue("2026-09-01", "2026-09-27")).toBe(26);
    expect(daysOverdue("2026-09-26", "2026-09-27")).toBe(1);
    expect(daysOverdue("2026-09-27", "2026-09-27")).toBe(0);
    expect(daysOverdue("2026-10-05", "2026-09-27")).toBe(-8);
  });

  it("crosses month and leap-year boundaries", () => {
    expect(daysOverdue("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysOverdue("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("is unknown when a date is missing or malformed", () => {
    expect(daysOverdue(null, "2026-09-27")).toBeNull();
    expect(daysOverdue("2026-09-01", null)).toBeNull();
    expect(daysOverdue("1 Sept 2026", "2026-09-27")).toBeNull();
    expect(daysOverdue("2026-13-45", "2026-09-27")).toBeNull();
  });

  it("describes the result", () => {
    expect(describeOverdue(null)).toBe("[Days overdue]");
    expect(describeOverdue(0)).toBe("Not yet overdue");
    expect(describeOverdue(-3)).toBe("Not yet overdue");
    expect(describeOverdue(1)).toBe("1 day");
    expect(describeOverdue(26)).toBe("26 days");
  });

  it("shows on the reminder, and escalates the wording by stage", () => {
    const reminder = template("payment_reminder");
    const base = {
      ...defaults(reminder),
      invoiceNumber: "INV/20260801",
      amount: "500000",
      dueDate: "2026-09-01",
      signatoryName: "J. Habimana",
    };
    const friendly = reminder.build(base, context);
    expect(friendly.title).toBe("Payment Reminder");
    expect(facts(friendly)["Days overdue"]).toBe("26 days");
    expect(facts(friendly)["Amount due"]).toBe("RWF 500,000");

    const first = reminder.build({ ...base, stage: "First overdue notice" }, context);
    expect(first.title).toBe("Overdue Payment Notice");

    const final = reminder.build({ ...base, stage: "Final payment notice" }, context);
    expect(final.title).toBe("Final Payment Notice");
    // Without a pay-by date the final notice leaves a gap instead of inventing a deadline.
    expect(JSON.stringify(final)).toContain("[Pay by]");

    const undated = reminder.build({ ...base, dueDate: "" }, context);
    expect(facts(undated)["Days overdue"]).toBe("[Days overdue]");
  });
});

describe("expense totals", () => {
  it("parses plain and currency-tagged amounts", () => {
    expect(parseAmount("12,500", "RWF")).toBe(12500);
    expect(parseAmount("RWF 12,500", "RWF")).toBe(12500);
    expect(parseAmount("12500 rwf", "RWF")).toBe(12500);
    expect(parseAmount("45.50", "USD")).toBe(45.5);
  });

  it("refuses amounts it cannot read or in another currency", () => {
    expect(parseAmount("", "RWF")).toBeNull();
    expect(parseAmount("about 5000", "RWF")).toBeNull();
    expect(parseAmount("12k", "RWF")).toBeNull();
    expect(parseAmount("USD 40", "RWF")).toBeNull();
  });

  it("sums only when every amount is readable", () => {
    expect(sumAmounts(["8,000", "RWF 4,500", "12000"], "RWF")).toBe(24500);
    expect(sumAmounts(["8,000", "tbc"], "RWF")).toBeNull();
    expect(sumAmounts([], "RWF")).toBeNull();
  });

  it("totals the expense claim table, or leaves a gap", () => {
    const claim = template("expense_claim");
    const values = {
      ...defaults(claim),
      employeeName: "Aline Uwase",
      expenses:
        "2026-09-12 | Taxi to client site | Attendance system | 8,000\n2026-09-14 | Lunch meeting | AS | 12,500",
    };
    const content = claim.build(values, context);
    expect(facts(content)["Total claimed"]).toBe("RWF 20,500");
    const grid = content.blocks.find((block) => block.kind === "table");
    expect(grid?.kind === "table" && grid.rows.at(-1)).toEqual(["", "Total", "", "RWF 20,500"]);

    const unreadable = claim.build(
      { ...values, expenses: `${values.expenses}\n2026-09-15 | Parking | AS | tbc` },
      context,
    );
    expect(facts(unreadable)["Total claimed"]).toBe("[Total claimed]");
  });
});

describe("priced finance documents", () => {
  it("totals the credit note with tax", () => {
    const note = template("credit_note");
    const content = note.build(
      {
        ...defaults(note),
        originalInvoice: "INV/20260801",
        items: [{ description: "Unused support hours", quantity: 2, unitPrice: 50000 }],
      },
      context,
    );
    expect(facts(content)["Total credited"]).toBe("RWF 118,000");
  });

  it("marks the proforma as not a tax invoice", () => {
    const proforma = template("proforma_invoice");
    const content = proforma.build(defaults(proforma), context);
    expect(content.subtitle).toContain("not a tax invoice");
  });
});
