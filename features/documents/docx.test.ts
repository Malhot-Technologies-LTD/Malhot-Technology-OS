import { describe, expect, it } from "vitest";

import { documentToDocx, docxFileName } from "./docx";
import { findTemplate, initialValues, type TemplateContext } from "./templates";

const context: TemplateContext = {
  today: "2026-09-27",
  letterhead: {
    companyName: "Malhot Tech",
    tagline: "Your Vision. Our Technology. Real Solutions.",
    address: "Kigali, Rwanda",
    email: "",
    phone: "",
    website: "",
    registration: "",
  },
  project: null,
};

async function documentXml(key: string): Promise<string> {
  const template = findTemplate(key)!;
  const blob = await documentToDocx(template.build(initialValues(template, context), context), context.letterhead);
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file("word/document.xml")!.async("string");
}

describe("Word export", () => {
  it("sets the page to A4", async () => {
    const xml = await documentXml("offer_letter");
    expect(xml).toMatch(/<w:pgSz w:w="11906" w:h="16838"/);
  });

  it("carries the document's content, with gaps highlighted", async () => {
    const xml = await documentXml("offer_letter");
    expect(xml).toContain("OFFER OF EMPLOYMENT");
    expect(xml).toContain("1. POSITION &amp; RESPONSIBILITIES");
    expect(xml).toContain("[Candidate&apos;s full name]");
    expect(xml).toContain('<w:highlight w:val="yellow"/>');
  });

  it("exports letter-style documents with line items", async () => {
    const xml = await documentXml("invoice");
    expect(xml).toContain("Unit price");
  });

  it("names the file after the title", () => {
    expect(docxFileName("Offer of employment — Aline Uwase")).toBe("Offer-of-employment-Aline-Uwase.docx");
    expect(docxFileName("   ")).toBe("document.docx");
  });
});
