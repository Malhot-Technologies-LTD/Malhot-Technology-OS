import { describe, expect, it } from "vitest";

import { formatMoney, itemTotals, longDate } from "./content";
import {
  TEMPLATES,
  findTemplate,
  initialValues,
  missingFields,
  sanitiseValues,
  type TemplateContext,
} from "./templates";

const context: TemplateContext = {
  today: "2026-09-27",
  letterhead: {
    companyName: "Malhot Technologies",
    tagline: "",
    address: "Kigali, Rwanda",
    email: "hello@malhot.com",
    phone: "",
    website: "",
    registration: "",
  },
  project: { key: "AS", name: "Attendance system", clientName: "Umoja Ltd" },
};

describe("templates", () => {
  it("have unique keys", () => {
    expect(new Set(TEMPLATES.map((template) => template.key)).size).toBe(TEMPLATES.length);
  });

  it.each(TEMPLATES.map((template) => [template.key, template] as const))(
    "%s builds from its defaults",
    (_, template) => {
      const content = template.build(initialValues(template, context), context);
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.blocks.length).toBeGreaterThan(0);
    },
  );

  it("shows gaps for missing facts instead of inventing them", () => {
    const offer = findTemplate("offer_letter")!;
    const content = offer.build(initialValues(offer, context), context);
    expect(JSON.stringify(content)).toContain("[Candidate's full name]");
    expect(missingFields(offer, initialValues(offer, context))).toEqual([
      "Candidate's full name",
      "Position",
      "Start date",
      "Gross monthly salary",
      "Signed for the company by",
    ]);
  });

  it("prefills from the project", () => {
    const nda = findTemplate("nda")!;
    expect(initialValues(nda, context).partyName).toBe("Umoja Ltd");
    expect(initialValues(nda, context).reference).toBe("MAL/LEGAL/20260927");
  });

  it("fills an employment contract with the facts given", () => {
    const contract = findTemplate("employment_contract")!;
    const values = {
      ...initialValues(contract, context),
      employeeName: "Aline Uwase",
      position: "Backend Developer",
      startDate: "2026-10-01",
      salary: "1200000",
      signatoryName: "J. Habimana",
    };
    const text = JSON.stringify(contract.build(values, context));
    expect(text).toContain("Aline Uwase");
    expect(text).toContain("1 October 2026");
    expect(text).toContain("RWF 1,200,000");
    expect(missingFields(contract, values)).toEqual([]);
  });

  it("keeps only declared fields with the right shapes from stored JSON", () => {
    const invoice = findTemplate("invoice")!;
    const values = sanitiseValues(invoice, {
      clientName: "Umoja",
      items: [{ description: "Design", quantity: "2", unitPrice: "50000", extra: "x" }],
      injected: "<script>",
    });
    expect(values.clientName).toBe("Umoja");
    expect(values.items).toEqual([{ description: "Design", quantity: 2, unitPrice: 50000 }]);
    expect(values).not.toHaveProperty("injected");
    expect(sanitiseValues(invoice, null).clientName).toBe("");
  });
});

describe("money and dates", () => {
  it("formats without decimals for francs and with them for dollars", () => {
    expect(formatMoney(1250000, "rwf")).toBe("RWF 1,250,000");
    expect(formatMoney(99.5, "USD")).toBe("USD 99.50");
  });

  it("totals line items with tax", () => {
    expect(
      itemTotals(
        [
          { description: "a", quantity: 2, unitPrice: 100 },
          { description: "b", quantity: 1, unitPrice: 50 },
        ],
        18,
      ),
    ).toEqual({
      subtotal: 250,
      tax: 45,
      total: 295,
    });
  });

  it("writes dates out in full and leaves free text alone", () => {
    expect(longDate("2026-10-01")).toBe("1 October 2026");
    expect(longDate("next week")).toBe("next week");
  });
});
