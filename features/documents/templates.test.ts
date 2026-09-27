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
import { ROLE_PROFILES, combineRoles, listText, roleNamesFrom, roleProfile } from "./roles";

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
    expect(text).toContain("The Employee is hired as Developer");
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
        const clauses = combineRoles([profile.name]);
        expect(content.subtitle).toBe(`${profile.subtitle} Role`);
        expect(text).toContain(clauses.responsibilities);
        expect(text).toContain(profile.confidential[0]);
        expect(text).toContain(clauses.workProduct);
        expect(text).toContain(clauses.access);
        for (const term of clauses.accessTerms) expect(text).toContain(term);
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

  // Legal notices and letters (disciplinary notice, authorisation) keep the letter layout.
  it("uses the contract layout for every legal agreement", () => {
    for (const template of TEMPLATES.filter(
      (candidate) => candidate.legal && candidate.category === "Contracts & Legal",
    ))
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
    expect(roleNamesFrom("")).toEqual(["Developer / Technical"]);
    expect(roleNamesFrom(["Astronaut", "Hardware Engineer"].join("\n"))).toEqual(["Hardware Engineer"]);
  });

  it("have unique names and something in every clause", () => {
    expect(new Set(ROLE_PROFILES.map((profile) => profile.name)).size).toBe(ROLE_PROFILES.length);
    for (const profile of ROLE_PROFILES) {
      expect(profile.duties.length, profile.name).toBeGreaterThan(0);
      expect(profile.confidential.length, profile.name).toBeGreaterThan(0);
      expect(profile.workProduct.length, profile.name).toBeGreaterThan(0);
      expect(profile.access.length, profile.name).toBeGreaterThan(0);
    }
  });

  it("keeps the wording of documents saved with one of the original roles", () => {
    const developer = combineRoles(["Developer / Technical"]);
    expect(developer.subtitle).toBe("Developer / Technical Role");
    expect(developer.responsibilities).toBe(
      "software development, coding, technical architecture, quality assurance, testing, documentation, and other duties as assigned by management",
    );
    expect(developer.workProduct).toBe("source code, designs, and documentation");
    expect(developer.access).toBe("company systems, repositories, and credentials");
    expect(developer.ipHeading).toBe("Source code & IP ownership");
  });

  it("combines several roles, each clause once", () => {
    const both = combineRoles(["Developer / Technical", "Hardware Engineer"]);
    expect(both.subtitle).toBe("Developer / Technical & Hardware Engineering / Technical Role");
    expect(both.responsibilities).toContain("software development");
    expect(both.responsibilities).toContain("circuit and PCB design");
    expect(both.responsibilities.match(/other duties as assigned/g)).toHaveLength(1);
    expect(both.confidential.filter((item) => item === "Client information and contracts")).toHaveLength(1);
    expect(both.confidential.at(-1)).toBe("Any proprietary information");
    expect(both.access.match(/company systems/g)).toHaveLength(1);
    expect(both.access.endsWith("and credentials")).toBe(true);
    expect(both.ipHeading).toBe("Source code & IP ownership");
    expect(both.accessTerms).toHaveLength(1);

    const three = combineRoles([
      "Human Resources",
      "Finance & Accounting",
      "Administrative Assistant / Office Manager",
    ]);
    expect(three.subtitle).toBe(
      "Human Resources / Administrative, Finance & Accounting / Administrative & Administrative / Office Management Role",
    );
    expect(three.ipHeading).toBe("Work product & IP ownership");
    expect(three.accessTerms).toHaveLength(3);
  });

  it("prints every chosen position and its clauses in the offer and the agreement", () => {
    for (const key of ["offer_letter", "employment_contract"]) {
      const template = findTemplate(key)!;
      const values = {
        ...initialValues(template, context),
        position: ["Hardware Engineer", "Systems & Network Administrator"].join("\n"),
      };
      const text = JSON.stringify(template.build(values, context));
      expect(text).toContain("hired as Hardware Engineer and Systems & Network Administrator with");
      // Only listed titles, so the "clauses like" question is not asked.
      expect(missingFields(template, values)).not.toContain("Contract clauses like");
      expect(text).toContain("embedded firmware development");
      expect(text).toContain("backups and recovery");
      expect(text).toContain("must be returned on request or when the employment ends");
    }
  });

  it("writes lists in the house style", () => {
    expect(listText(["a"])).toBe("a");
    expect(listText(["a", "b"])).toBe("a and b");
    expect(listText(["a", "b", "c"])).toBe("a, b, and c");
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
