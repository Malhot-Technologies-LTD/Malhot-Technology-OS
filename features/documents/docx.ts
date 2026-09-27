import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HighlightColor,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlignTable,
  WidthType,
  type IBorderOptions,
  type IParagraphOptions,
  type IRunOptions,
} from "docx";

import { formatMoney, itemTotals, type Block, type DocumentContent, type Letterhead } from "./content";

/**
 * The Word (.docx) edition of a generated document: the same content and the
 * same A4 layout as DocumentPaper, drawn with Word's own tables and borders so
 * it stays editable. Loaded only when someone downloads, so the library never
 * weighs on the page.
 *
 * Colours match the paper: navy #0b1f4b, brand blue #1652e6, greys for rules.
 * [Bracketed] gaps are highlighted, as on screen, so they are hard to miss.
 */

const NAVY = "0B1F4B";
const BLUE = "1652E6";
const INK = "1B2230";
const MUTED = "5B6580";
const RULE = "D6DBE6";
const TINT = "F5F7FB";
const FONT = "Calibri";

// A4 in twentieths of a point, with 18 mm margins all round.
const PAGE = { width: 11906, height: 16838, margin: 1020 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

const NONE: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const line = (color: string, size = 4): IBorderOptions => ({ style: BorderStyle.SINGLE, size, color });

/** Runs for a string, with [gaps] highlighted and newlines kept. */
function runs(text: string, options: IRunOptions = {}): TextRun[] {
  return text.split("\n").flatMap((lineText, lineIndex) =>
    lineText
      .split(/(\[[^\]]+\])/g)
      .filter(Boolean)
      .map(
        (part, partIndex) =>
          new TextRun({
            ...options,
            text: part,
            break: lineIndex > 0 && partIndex === 0 ? 1 : undefined,
            highlight: /^\[[^\]]+\]$/.test(part) ? HighlightColor.YELLOW : undefined,
          }),
      ),
  );
}

function para(text: string, run: IRunOptions = {}, options: IParagraphOptions = {}): Paragraph {
  return new Paragraph({ spacing: { after: 120 }, ...options, children: runs(text, run) });
}

function cell(children: Paragraph[], options: Partial<ConstructorParameters<typeof TableCell>[0]> = {}) {
  return new TableCell({ margins: { top: 100, bottom: 100, left: 160, right: 160 }, ...options, children });
}

function table(rows: TableRow[], widths: number[], borders: object = NO_BORDERS) {
  return new Table({
    rows,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders,
  });
}

async function logo(): Promise<ImageRun | null> {
  try {
    const response = await fetch("/brand-mark.png");
    if (!response.ok) return null;
    const data = new Uint8Array(await response.arrayBuffer());
    return new ImageRun({ type: "png", data, transformation: { width: 56, height: 44 } });
  } catch {
    // No logo is better than no document: the name still heads the page.
    return null;
  }
}

function contactLine(letterhead: Letterhead): string {
  return [letterhead.address, letterhead.phone, letterhead.email, letterhead.website, letterhead.registration]
    .filter(Boolean)
    .join("  ·  ");
}

function contractHead(content: DocumentContent, letterhead: Letterhead, mark: ImageRun | null) {
  const name = new Paragraph({
    children: [
      new TextRun({
        text: (letterhead.companyName || "[Company name]").toUpperCase(),
        bold: true,
        size: 34,
        color: NAVY,
        characterSpacing: 40,
      }),
    ],
  });
  const tagline = letterhead.tagline
    ? [
        new Paragraph({
          children: [new TextRun({ text: `“${letterhead.tagline}”`, italics: true, size: 17, color: BLUE })],
        }),
      ]
    : [];
  // Fixed widths: left to autofit, Word squeezes the name into a narrow column.
  const nameWidth = 5000;
  const markWidth = mark ? 1100 : 0;
  const brand = new Table({
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.FIXED,
    width: { size: markWidth + nameWidth, type: WidthType.DXA },
    columnWidths: mark ? [markWidth, nameWidth] : [nameWidth],
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          ...(mark
            ? [
                cell([new Paragraph({ alignment: AlignmentType.RIGHT, children: [mark] })], {
                  width: { size: markWidth, type: WidthType.DXA },
                  verticalAlign: VerticalAlignTable.CENTER,
                  margins: { top: 0, bottom: 0, left: 0, right: 160 },
                }),
              ]
            : []),
          cell([name, ...tagline], {
            width: { size: nameWidth, type: WidthType.DXA },
            verticalAlign: VerticalAlignTable.CENTER,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          }),
        ],
      }),
    ],
  });
  const contact = contactLine(letterhead);
  const blocks: (Paragraph | Table)[] = [
    brand,
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 0 },
      border: { bottom: { ...line(NAVY, 12), space: 8 } },
      children: [new TextRun({ text: contact, size: 15, color: MUTED })],
    }),
  ];
  if (content.reference)
    blocks.push(
      para(
        `Ref: ${content.reference}`,
        { size: 16, color: MUTED },
        { alignment: AlignmentType.RIGHT, spacing: { before: 120 } },
      ),
    );
  blocks.push(
    para(
      content.title.toUpperCase(),
      { bold: true, size: 36, color: NAVY, characterSpacing: 50 },
      {
        alignment: AlignmentType.CENTER,
        spacing: { before: content.reference ? 120 : 360, after: 40 },
      },
    ),
  );
  if (content.subtitle)
    blocks.push(
      para(
        content.subtitle,
        { size: 21, color: BLUE, bold: true },
        { alignment: AlignmentType.CENTER, spacing: { after: 240 } },
      ),
    );
  blocks.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 320 },
      children: [
        new TextRun({
          text: `${(content.dateLabel ?? "Date").toUpperCase()}:  `,
          bold: true,
          size: 19,
          color: "3A4358",
          characterSpacing: 10,
        }),
        ...(content.date
          ? runs(content.date, { size: 19 })
          : [new TextRun({ text: "______________________", size: 19 })]),
      ],
    }),
  );
  return blocks;
}

function letterHead(content: DocumentContent, letterhead: Letterhead, mark: ImageRun | null) {
  const contact = [
    letterhead.address,
    letterhead.phone,
    letterhead.email,
    letterhead.website,
    letterhead.registration,
  ].filter(Boolean);
  const brand = [
    new Paragraph({
      children: [
        new TextRun({
          text: (letterhead.companyName || "[Company name]").toUpperCase(),
          bold: true,
          size: 30,
          color: NAVY,
          characterSpacing: 30,
        }),
      ],
    }),
    ...(letterhead.tagline
      ? [
          new Paragraph({
            children: [
              new TextRun({ text: letterhead.tagline.toUpperCase(), size: 14, color: MUTED, characterSpacing: 30 }),
            ],
          }),
        ]
      : []),
  ];
  const markWidth = mark ? 1000 : 0;
  const head = table(
    [
      new TableRow({
        children: [
          ...(mark
            ? [
                cell([new Paragraph({ children: [mark] })], {
                  verticalAlign: VerticalAlignTable.CENTER,
                  margins: { top: 0, bottom: 0, left: 0, right: 100 },
                }),
              ]
            : []),
          cell(brand, { verticalAlign: VerticalAlignTable.CENTER, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          cell(
            contact.map((item) =>
              para(item, { size: 16, color: MUTED }, { alignment: AlignmentType.RIGHT, spacing: { after: 0 } }),
            ),
            { verticalAlign: VerticalAlignTable.CENTER, margins: { top: 0, bottom: 0, left: 0, right: 0 } },
          ),
        ],
      }),
    ],
    [markWidth, (CONTENT_WIDTH - markWidth) * 0.6, (CONTENT_WIDTH - markWidth) * 0.4].filter(Boolean),
  );
  const blocks: (Paragraph | Table)[] = [
    head,
    new Paragraph({ spacing: { after: 240 }, border: { bottom: { ...line(NAVY, 12), space: 6 } }, children: [] }),
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
      spacing: { after: 240 },
      children: [
        ...(content.reference ? runs(`Ref: ${content.reference}`, { size: 18, color: MUTED }) : []),
        new TextRun({ text: "\t", size: 18 }),
        ...runs(content.date, { size: 18, color: MUTED }),
      ],
    }),
  ];
  (content.recipient ?? []).forEach((item, index) =>
    blocks.push(para(item, { bold: index === 0 }, { spacing: { after: 0 } })),
  );
  blocks.push(
    para(
      content.title,
      { bold: true, size: 34, color: NAVY },
      { spacing: { before: 240, after: content.subtitle ? 40 : 200 } },
    ),
  );
  if (content.subtitle) blocks.push(para(content.subtitle, { size: 21, color: BLUE }, { spacing: { after: 200 } }));
  return blocks;
}

function blockToDocx(block: Block, contract: boolean, listIndex: number): (Paragraph | Table)[] {
  switch (block.kind) {
    case "heading":
      return [
        contract
          ? para(
              block.text,
              { bold: true, size: 21, color: NAVY, characterSpacing: 12 },
              {
                keepNext: true,
                spacing: { before: 280, after: 120 },
                border: { bottom: { ...line(RULE), space: 3 } },
              },
            )
          : para(
              block.text,
              { bold: true, size: 22, color: NAVY },
              { keepNext: true, spacing: { before: 200, after: 100 } },
            ),
      ];
    case "paragraph":
      return [para(block.text, {}, { alignment: AlignmentType.JUSTIFIED })];
    case "list":
      return block.items.map((item, index) =>
        para(
          item,
          {},
          {
            numbering: block.ordered
              ? { reference: "ordered", level: 0, instance: listIndex }
              : { reference: "bullets", level: 0 },
            spacing: { after: index === block.items.length - 1 ? 120 : 40 },
          },
        ),
      );
    case "terms":
      return block.rows.map(
        ([label, value]) =>
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: `${label}: `, bold: true, color: NAVY }), ...runs(value)],
          }),
      );
    case "facts":
      return [
        table(
          block.rows.map(
            ([label, value]) =>
              new TableRow({
                cantSplit: true,
                children: [
                  cell([para(label, { bold: true, color: "3A4358" }, { spacing: { after: 0 } })], {
                    shading: { type: ShadingType.CLEAR, color: "auto", fill: TINT },
                  }),
                  cell([para(value, {}, { spacing: { after: 0 } })]),
                ],
              }),
          ),
          [CONTENT_WIDTH * 0.38, CONTENT_WIDTH * 0.62],
          { ...NO_BORDERS, top: line("E3E7EF"), bottom: line("E3E7EF"), insideHorizontal: line("E3E7EF") },
        ),
        new Paragraph({ spacing: { after: 60 }, children: [] }),
      ];
    case "items": {
      const rows = block.items.filter((item) => item.description.trim() !== "" || item.unitPrice > 0);
      const totals = itemTotals(rows, block.taxRate);
      const widths = [CONTENT_WIDTH * 0.44, CONTENT_WIDTH * 0.12, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.22];
      const right = { alignment: AlignmentType.RIGHT, spacing: { after: 0 } } as const;
      const header = new TableRow({
        tableHeader: true,
        children: ["Description", "Qty", "Unit price", "Amount"].map((label, index) =>
          cell([para(label, { bold: true, color: "FFFFFF" }, index === 0 ? { spacing: { after: 0 } } : right)], {
            shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
          }),
        ),
      });
      const body = (rows.length > 0 ? rows : [{ description: "[Line items]", quantity: 0, unitPrice: 0 }]).map(
        (item) =>
          new TableRow({
            cantSplit: true,
            children: [
              cell([para(item.description, {}, { spacing: { after: 0 } })]),
              cell([para(rows.length ? String(item.quantity) : "", {}, right)]),
              cell([para(rows.length ? formatMoney(item.unitPrice, block.currency) : "", {}, right)]),
              cell([para(rows.length ? formatMoney(item.quantity * item.unitPrice, block.currency) : "", {}, right)]),
            ],
          }),
      );
      const total = (label: string, amount: number, bold = false) =>
        new TableRow({
          children: [
            cell([para(label, { bold, color: bold ? NAVY : MUTED }, right)], {
              columnSpan: 3,
              borders: { top: NONE, bottom: NONE, left: NONE, right: NONE },
            }),
            cell([para(formatMoney(amount, block.currency), { bold, color: bold ? NAVY : INK }, right)], {
              borders: { top: NONE, bottom: NONE, left: NONE, right: NONE },
            }),
          ],
        });
      return [
        table(
          [
            header,
            ...body,
            ...(block.taxLabel ? [total("Subtotal", totals.subtotal), total(block.taxLabel, totals.tax)] : []),
            total("Total", totals.total, true),
          ],
          widths,
          { ...NO_BORDERS, insideHorizontal: line("E3E7EF") },
        ),
        new Paragraph({ spacing: { after: 60 }, children: [] }),
      ];
    }
    case "table": {
      const width = CONTENT_WIDTH / Math.max(block.columns.length, 1);
      const header = new TableRow({
        tableHeader: true,
        children: block.columns.map((column) =>
          cell([para(column, { bold: true, color: "FFFFFF" }, { spacing: { after: 0 } })], {
            shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
          }),
        ),
      });
      const body = block.rows.map(
        (row, rowIndex) =>
          new TableRow({
            cantSplit: true,
            children: block.columns.map((_, cellIndex) =>
              cell([para(row[cellIndex] ?? "", {}, { spacing: { after: 0 } })], {
                ...(rowIndex % 2 === 1 ? { shading: { type: ShadingType.CLEAR, color: "auto", fill: "F8F9FC" } } : {}),
              }),
            ),
          }),
      );
      return [
        table(
          [header, ...body],
          block.columns.map(() => width),
          { ...NO_BORDERS, insideHorizontal: line("E3E7EF"), bottom: line("E3E7EF") },
        ),
        new Paragraph({ spacing: { after: 60 }, children: [] }),
      ];
    }
    case "note":
      return [
        para(
          block.text,
          { size: 19, color: "3A4358" },
          {
            border: { left: { ...line(BLUE, 18), space: 8 } },
            shading: { type: ShadingType.CLEAR, color: "auto", fill: TINT },
            indent: { left: 160 },
          },
        ),
      ];
    case "parties": {
      const width = CONTENT_WIDTH / Math.max(block.parties.length, 1);
      return [
        para(block.intro, {}, { keepNext: true, spacing: { after: 160 } }),
        table(
          [
            new TableRow({
              cantSplit: true,
              children: block.parties.map((party) =>
                cell(
                  [
                    para(
                      `${party.role.toUpperCase()}:`,
                      { bold: true, size: 16, color: BLUE, characterSpacing: 20 },
                      { spacing: { after: 40 } },
                    ),
                    ...party.lines.map((item, index) =>
                      para(item, index === 0 ? { bold: true, color: NAVY } : {}, { spacing: { after: 20 } }),
                    ),
                  ],
                  {
                    shading: { type: ShadingType.CLEAR, color: "auto", fill: TINT },
                    borders: { top: line(RULE), bottom: line(RULE), right: line(RULE), left: line(BLUE, 18) },
                    margins: { top: 140, bottom: 140, left: 220, right: 220 },
                  },
                ),
              ),
            }),
          ],
          block.parties.map(() => width),
          { ...NO_BORDERS, insideVertical: { style: BorderStyle.SINGLE, size: 24, color: "FFFFFF" } },
        ),
        new Paragraph({ spacing: { after: 60 }, children: [] }),
      ];
    }
    case "signatures": {
      const width = CONTENT_WIDTH / Math.max(block.parties.length, 1);
      const boxed = contract ? line(RULE) : NONE;
      return [
        new Paragraph({ spacing: { before: 360 }, keepNext: true, children: [] }),
        table(
          [
            new TableRow({
              cantSplit: true,
              children: block.parties.map((party) =>
                cell(
                  [
                    para(
                      contract ? party.role.toUpperCase() : party.role,
                      { bold: true, size: 17, color: NAVY, characterSpacing: contract ? 20 : 0 },
                      { spacing: { after: 560 } },
                    ),
                    para("_________________________________", { color: INK }, { spacing: { after: 60 } }),
                    party.name
                      ? para(
                          contract ? party.name : `Name: ${party.name}`,
                          { bold: contract },
                          { spacing: { after: 20 } },
                        )
                      : para("Name: ____________________", {}, { spacing: { after: 20 } }),
                    ...(party.title
                      ? [
                          para(
                            contract ? party.title : `Title: ${party.title}`,
                            { color: MUTED },
                            { spacing: { after: 20 } },
                          ),
                        ]
                      : []),
                    para("Date: _______________", {}, { spacing: { before: 100, after: 0 } }),
                  ],
                  { margins: { top: 160, bottom: 200, left: contract ? 220 : 0, right: 220 } },
                ),
              ),
            }),
          ],
          block.parties.map(() => width),
          { top: boxed, bottom: boxed, left: boxed, right: boxed, insideHorizontal: NONE, insideVertical: boxed },
        ),
      ];
    }
  }
}

function footer(content: DocumentContent, letterhead: Letterhead) {
  const left = [letterhead.companyName, letterhead.registration].filter(Boolean).join(" · ");
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { ...line(RULE), space: 6 } },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
        children: [
          new TextRun({ text: left, size: 15, color: "7A8399" }),
          new TextRun({ text: "\t", size: 15 }),
          ...(content.classification
            ? [
                new TextRun({
                  text: `${content.classification.toUpperCase()}   ·   `,
                  size: 15,
                  bold: true,
                  color: "7A8399",
                  characterSpacing: 10,
                }),
              ]
            : []),
          new TextRun({
            children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
            size: 15,
            color: "7A8399",
          }),
        ],
      }),
    ],
  });
}

/** Builds the .docx file for a document, ready to hand to the browser as a download. */
export async function documentToDocx(content: DocumentContent, letterhead: Letterhead): Promise<Blob> {
  const contract = content.layout === "contract";
  const mark = await logo();
  let orderedLists = 0;
  const body = content.blocks.flatMap((block) =>
    blockToDocx(block, contract, block.kind === "list" && block.ordered ? ++orderedLists : 0),
  );

  const document = new Document({
    creator: letterhead.companyName || undefined,
    title: content.subtitle ? `${content.title} — ${content.subtitle}` : content.title,
    styles: {
      default: { document: { run: { font: FONT, size: 21, color: INK }, paragraph: { spacing: { line: 276 } } } },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { run: { color: BLUE }, paragraph: { indent: { left: 440, hanging: 260 } } },
            },
          ],
        },
        {
          reference: "ordered",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 440, hanging: 300 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin, footer: 500 },
          },
        },
        footers: { default: footer(content, letterhead) },
        children: [
          ...(contract ? contractHead(content, letterhead, mark) : letterHead(content, letterhead, mark)),
          ...body,
        ],
      },
    ],
  });
  return Packer.toBlob(document);
}

/** "Offer of Employment — Aline Uwase" → "Offer-of-Employment-Aline-Uwase.docx" */
export function docxFileName(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 80);
  return `${base || "document"}.docx`;
}
