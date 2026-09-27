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
import { ROLE_PROFILES, roleProfile } from "./roles";

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
      "Compensation",
      "CEO / signing for the company",
    ]);
  });

  it("prefills from the project", () => {
    const nda = findTemplate("nda")!;
    expect(initialValues(nda, context).partyName).toBe("Umoja Ltd");
    expect(initialValues(findTemplate("invoice")!, context).reference).toBe("INV/20260927");
  });

  it("follows the company agreement format for the employment contract", () => {
    const contract = findTemplate("employment_contract")!;
    const values = {
      ...initialValues(contract, context),
      employeeName: "Aline Uwase",
      position: "Developer",
      compensation: "14.295% of salary base",
      signatoryName: "J. Habimana",
    };
    const content = contract.build(values, context);
    expect(content.layout).toBe("contract");
    expect(content.title).toBe("Employment Agreement");
    expect(content.subtitle).toBe("Developer / Technical Role");
    // No date given: left as a line to sign by hand.
    expect(content.date).toBe("");
    const headings = content.blocks.flatMap((block) => (block.kind === "heading" ? [block.text] : []));
    expect(headings).toEqual([
      "1. POSITION & RESPONSIBILITIES",
      "2. COMPENSATION",
      "3. CONFIDENTIALITY",
      "4. SOURCE CODE & IP OWNERSHIP",
      "5. ACCESS & SECURITY",
      "6. TERMINATION",
      "7. GOVERNING LAW",
    ]);
    const text = JSON.stringify(content);
    expect(text).toContain("Compensation");
    expect(text).toContain("14.295% of salary base");
    expect(text).toContain("The Employee is hired as a Developer");
    expect(text).toContain("no longer wishes to be part of Malhot Technologies");
    expect(missingFields(contract, values)).toEqual([]);
    expect(contract.build({ ...values, agreementDate: "2026-10-01" }, context).date).toBe("1 October 2026");
  });

  it("lays the offer out like the company agreement, sections numbered in reading order", () => {
    const offer = findTemplate("offer_letter")!;
    const content = offer.build(
      { ...initialValues(offer, context), candidateName: "Aline Uwase", benefits: "Laptop" },
      context,
    );
    expect(content.layout).toBe("contract");
    expect(content.title).toBe("Offer of Employment");
    expect(content.subtitle).toBe("Developer / Technical Role");
    expect(content.blocks.flatMap((block) => (block.kind === "heading" ? [block.text] : []))).toEqual([
      "1. POSITION & RESPONSIBILITIES",
      "2. TERMS OF EMPLOYMENT",
      "3. COMPENSATION",
      "4. CONFIDENTIALITY",
      "5. SOURCE CODE & IP OWNERSHIP",
      "6. ACCESS & SECURITY",
      "7. TERMINATION",
      "8. ACCEPTANCE",
      "9. GOVERNING LAW",
    ]);
    expect(content.blocks.at(-1)).toMatchObject({
      kind: "signatures",
      parties: [{ role: "Employee signature", name: "Aline Uwase" }, { role: "CEO signature" }],
    });
  });

  it.each(ROLE_PROFILES.map((profile) => [profile.name, profile] as const))(
    "words the offer and the agreement for the %s role",
    (_, profile) => {
      for (const key of ["offer_letter", "employment_contract"]) {
        const template = findTemplate(key)!;
        const content = template.build({ ...initialValues(template, context), roleType: profile.name }, context);
        const text = JSON.stringify(content);
        expect(content.subtitle).toBe(profile.subtitle);
        expect(text).toContain(profile.responsibilities);
        expect(text).toContain(profile.confidential[0]);
        expect(text).toContain(profile.workProduct);
        expect(text).toContain(profile.access);
      }
    },
  );

  it("lets the author replace a role's standard duties and confidentiality list", () => {
    const offer = findTemplate("offer_letter")!;
    const text = JSON.stringify(
      offer.build(
        { ...initialValues(offer, context), responsibilities: "running the help desk", confidential: "Ticket data" },
        context,
      ),
    );
    expect(text).toContain("with responsibilities including running the help desk.");
    expect(text).toContain("Ticket data");
    expect(text).not.toContain("Source code and technical systems");
  });

  it("uses the contract layout for every legal template", () => {
    for (const template of TEMPLATES.filter((candidate) => candidate.legal))
      expect(template.build(initialValues(template, context), context).layout).toBe("contract");
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

describe("roles", () => {
  it("falls back to the technical role for unknown or old values", () => {
    expect(roleProfile(undefined).name).toBe("Developer / Technical");
    expect(roleProfile("Astronaut").name).toBe("Developer / Technical");
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
