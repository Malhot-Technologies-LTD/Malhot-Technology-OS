import { formatMoney, itemTotals, type Block } from "../content";
import {
  common,
  company,
  date,
  items,
  lines,
  money,
  optional,
  paragraphs,
  ref,
  table,
  tableRows,
  text,
  type DocumentTemplate,
  type FieldDef,
  type TemplateContext,
  type Values,
} from "../template-kit";

/**
 * Finance templates. The originals in this category (invoice, quotation) live
 * in ../templates.ts; everything here follows their letter layout: reference,
 * date, recipient, title, a facts table, then the detail.
 */

// Shared fields -----------------------------------------------------------------

const clientField: FieldDef = {
  name: "clientName",
  label: "Client",
  type: "text",
  required: true,
  default: (context) => context.project?.clientName ?? "",
};

const clientAddressField: FieldDef = { name: "clientAddress", label: "Client's address", type: "textarea" };

const projectField: FieldDef = {
  name: "projectName",
  label: "Project",
  type: "text",
  default: (context) => context.project?.name ?? "",
};

const taxRateField: FieldDef = {
  name: "taxRate",
  label: "Tax rate (%)",
  type: "number",
  default: () => "18",
  hint: "18 for VAT in Rwanda; 0 if not registered",
};

const paymentField: FieldDef = {
  name: "payment",
  label: "Payment details",
  type: "textarea",
  wide: true,
  placeholder: "Bank name, account name, account number, SWIFT\nMobile money number",
};

const notesField: FieldDef = { name: "notes", label: "Notes", type: "textarea", wide: true };

const contactField: FieldDef = {
  name: "contact",
  label: "Contact for queries",
  type: "text",
  hint: "Who the client should speak to about this, e.g. an email or phone number.",
  default: (context) => context.letterhead.email,
};

// Helpers -----------------------------------------------------------------------

function recipient(values: Values): string[] {
  return [text(values, "clientName", "Client"), ...(optional(values, "clientAddress")?.split("\n") ?? [])];
}

function taxRate(values: Values): number {
  return Number(optional(values, "taxRate") ?? 0) || 0;
}

function itemsBlock(values: Values, currency: string, rate: number): Block {
  return {
    kind: "items",
    currency,
    items: items(values, "items"),
    taxRate: rate,
    taxLabel: rate > 0 ? `VAT (${rate}%)` : "",
  };
}

function paymentBlocks(values: Values): Block[] {
  return optional(values, "payment")
    ? [
        { kind: "heading", text: "Payment details" },
        { kind: "list", items: lines(values, "payment") },
      ]
    : [];
}

function signature(values: Values, context: TemplateContext): Block {
  return {
    kind: "signatures",
    parties: [
      {
        role: `For ${company(context)}`,
        name: text(values, "signatoryName", "Signatory"),
        title: optional(values, "signatoryTitle") ?? undefined,
      },
    ],
  };
}

const DAY = 24 * 60 * 60 * 1000;

function isoTime(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}

/**
 * Whole days from the due date to the letter date: positive when overdue,
 * zero or negative when not yet due, null when either date is missing or not
 * an ISO date (so the document shows a gap rather than a guess).
 */
export function daysOverdue(dueDate: string | null, onDate: string | null): number | null {
  const due = isoTime(dueDate);
  const on = isoTime(onDate);
  return due === null || on === null ? null : Math.round((on - due) / DAY);
}

export function describeOverdue(days: number | null): string {
  if (days === null) return "[Days overdue]";
  if (days <= 0) return "Not yet overdue";
  return days === 1 ? "1 day" : `${days} days`;
}

/**
 * An amount typed into a table cell: "12,500", "12500.50" or "RWF 12,500".
 * A currency code other than the document's makes it unparseable, so a total
 * is never silently summed across currencies.
 */
export function parseAmount(raw: string, currency: string): number | null {
  const match = raw.trim().match(/^(?:([A-Za-z]{3})\s*)?(-?[\d,]*\.?\d+)(?:\s*([A-Za-z]{3}))?$/);
  if (!match) return null;
  const code = match[1] ?? match[3];
  if (code && code.toUpperCase() !== currency.trim().toUpperCase()) return null;
  const amount = Number(match[2].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

/** The sum of the amounts, or null when there are none or any one is unreadable. */
export function sumAmounts(amounts: readonly string[], currency: string): number | null {
  if (amounts.length === 0) return null;
  let total = 0;
  for (const raw of amounts) {
    const amount = parseAmount(raw, currency);
    if (amount === null) return null;
    total += amount;
  }
  return total;
}

// Proforma invoice ----------------------------------------------------------------

const proformaInvoice: DocumentTemplate = {
  key: "proforma_invoice",
  name: "Proforma invoice",
  category: "Finance",
  documentType: "other",
  summary: "A priced advance invoice for approval or deposit, clearly marked as not a tax invoice.",
  fields: [
    { name: "reference", label: "Proforma number", type: "text", default: ref("PRO") },
    common.date,
    { ...clientField, label: "Bill to" },
    clientAddressField,
    projectField,
    common.currency,
    { name: "items", label: "Line items", type: "items" },
    taxRateField,
    { name: "validUntil", label: "Valid until", type: "date", required: true },
    paymentField,
    notesField,
  ],
  build(values) {
    const currency = text(values, "currency", "Currency");
    const rate = taxRate(values);
    const totals = itemTotals(items(values, "items"), rate);
    const project = optional(values, "projectName");
    return {
      title: "Proforma Invoice",
      subtitle: "PROFORMA — not a tax invoice",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: recipient(values),
      blocks: [
        {
          kind: "facts",
          rows: [
            ...(project ? ([["Project", project]] as const) : []),
            ["Valid until", date(values, "validUntil", "Valid until")],
            ["Total", formatMoney(totals.total, currency)],
          ],
        },
        itemsBlock(values, currency, rate),
        ...paymentBlocks(values),
        ...paragraphs(values, "notes"),
        {
          kind: "note",
          text: "This is a proforma invoice: it sets out the price in advance and is not a tax invoice. A tax invoice will be issued when payment is received. Prices are valid until the date above.",
        },
      ],
    };
  },
};

// Payment request -------------------------------------------------------------------

/** The most recently listed completed milestone, if the project has one. */
function lastDoneMilestone(context: TemplateContext): string {
  const done = context.project?.milestones?.filter((milestone) => milestone.done) ?? [];
  return done.at(-1)?.title ?? "";
}

const paymentRequest: DocumentTemplate = {
  key: "payment_request",
  name: "Milestone payment request",
  category: "Finance",
  documentType: "other",
  summary: "Ask a client to pay for a completed project milestone, listing the work delivered.",
  fields: [
    common.reference("PR"),
    common.date,
    clientField,
    clientAddressField,
    { name: "attention", label: "Attention (contact person)", type: "text" },
    { ...projectField, required: true },
    {
      name: "milestone",
      label: "Milestone",
      type: "text",
      required: true,
      default: lastDoneMilestone,
    },
    {
      name: "workCompleted",
      label: "Work completed",
      type: "textarea",
      wide: true,
      hint: "One deliverable per line.",
    },
    common.currency,
    { name: "amount", label: "Amount due", type: "number", required: true },
    { name: "dueDate", label: "Payment due", type: "date", required: true },
    paymentField,
    contactField,
    notesField,
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const project = text(values, "projectName", "Project");
    const milestone = text(values, "milestone", "Milestone");
    const amount = money(values, "amount", "Amount due", currency);
    const due = date(values, "dueDate", "Payment due");
    const work = lines(values, "workCompleted");
    return {
      title: "Payment Request",
      subtitle: `${project} — ${milestone}`,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: [
        ...(optional(values, "attention") ? [`Attn: ${optional(values, "attention")}`] : []),
        ...recipient(values),
      ],
      blocks: [
        { kind: "paragraph", text: `Dear ${optional(values, "attention") ?? "Sir or Madam"},` },
        {
          kind: "paragraph",
          text: `We are pleased to confirm that the ${milestone} milestone of ${project} has been completed. In line with our agreement, we kindly request payment of ${amount} for this milestone by ${due}.`,
        },
        {
          kind: "facts",
          rows: [
            ["Project", project],
            ["Milestone", milestone],
            ["Amount due", amount],
            ["Payment due", due],
          ],
        },
        { kind: "heading", text: "Work completed" },
        work.length > 0 ? { kind: "list", items: work } : { kind: "paragraph", text: "[Work completed]" },
        ...paymentBlocks(values),
        ...paragraphs(values, "notes"),
        {
          kind: "paragraph",
          text: `For any questions about this request, please contact ${text(values, "contact", "Contact for queries")}. Thank you for your continued partnership.`,
        },
        { kind: "paragraph", text: "Yours faithfully," },
        signature(values, context),
      ],
    };
  },
};

// Payment reminder ------------------------------------------------------------------

const REMINDER_STAGES = ["Friendly reminder", "First overdue notice", "Final payment notice"] as const;

const paymentReminder: DocumentTemplate = {
  key: "payment_reminder",
  name: "Payment reminder",
  category: "Finance",
  documentType: "other",
  summary: "Remind a client about an unpaid invoice, from a friendly nudge to a final notice.",
  fields: [
    {
      name: "stage",
      label: "Stage",
      type: "select",
      options: REMINDER_STAGES,
      default: () => REMINDER_STAGES[0],
      hint: "The wording becomes firmer, but stays polite, at each stage.",
    },
    common.reference("REM"),
    common.date,
    clientField,
    clientAddressField,
    { name: "attention", label: "Attention (contact person)", type: "text" },
    { name: "invoiceNumber", label: "Invoice number", type: "text", required: true },
    { name: "invoiceDate", label: "Invoice date", type: "date" },
    common.currency,
    { name: "amount", label: "Amount due", type: "number", required: true },
    { name: "dueDate", label: "Original due date", type: "date", required: true },
    {
      name: "payBy",
      label: "Please pay by",
      type: "date",
      hint: "The new date you are asking for. Needed for a final notice.",
    },
    paymentField,
    contactField,
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const stage = optional(values, "stage") ?? REMINDER_STAGES[0];
    const currency = text(values, "currency", "Currency");
    const invoice = text(values, "invoiceNumber", "Invoice number");
    const invoiceDate = date(values, "invoiceDate", "Invoice date");
    const amount = money(values, "amount", "Amount due", currency);
    const due = date(values, "dueDate", "Original due date");
    const overdue = describeOverdue(daysOverdue(optional(values, "dueDate"), optional(values, "date")));
    const payBy = optional(values, "payBy") ? date(values, "payBy", "Pay by") : null;
    const contact = text(values, "contact", "Contact for queries");

    const wording: Record<(typeof REMINDER_STAGES)[number], { title: string; body: string[] }> = {
      "Friendly reminder": {
        title: "Payment Reminder",
        body: [
          `This is a friendly reminder that invoice ${invoice}, dated ${invoiceDate}, for ${amount} was due for payment on ${due}. We understand that invoices are sometimes overlooked, so we wanted to bring it to your attention.`,
          `We would be grateful if you could arrange payment ${payBy ? `by ${payBy}` : "at your earliest convenience"}. If you have already paid, please accept our thanks and disregard this letter.`,
        ],
      },
      "First overdue notice": {
        title: "Overdue Payment Notice",
        body: [
          `According to our records, invoice ${invoice}, dated ${invoiceDate}, for ${amount} remains unpaid. It was due on ${due} and is now overdue.`,
          `We kindly ask that you settle the outstanding amount ${payBy ? `by ${payBy}` : "as soon as possible"}. If there is a problem with the invoice or with the work it covers, please let us know so that we can resolve it promptly. If payment has been made in the last few days, please send us the payment reference so we can match it to your account.`,
        ],
      },
      "Final payment notice": {
        title: "Final Payment Notice",
        body: [
          `Despite our earlier reminders, invoice ${invoice}, dated ${invoiceDate}, for ${amount} remains unpaid. It was due on ${due}.`,
          `We ask that the full amount be paid by ${payBy ?? "[Pay by]"}. If payment is not received by that date, we will have to consider the further steps available to us to recover the amount, which may include pausing further work until the account is settled. We would much prefer to resolve this with you directly, so please contact us before that date if anything prevents payment.`,
        ],
      },
    };
    const letter = wording[stage as (typeof REMINDER_STAGES)[number]] ?? wording["Friendly reminder"];

    return {
      title: letter.title,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: [
        ...(optional(values, "attention") ? [`Attn: ${optional(values, "attention")}`] : []),
        ...recipient(values),
      ],
      blocks: [
        { kind: "paragraph", text: `Dear ${optional(values, "attention") ?? "Sir or Madam"},` },
        ...letter.body.map((paragraph) => ({ kind: "paragraph", text: paragraph }) as const),
        {
          kind: "facts",
          rows: [
            ["Invoice number", invoice],
            ["Invoice date", invoiceDate],
            ["Amount due", amount],
            ["Original due date", due],
            ["Days overdue", overdue],
            ...(payBy ? ([["Please pay by", payBy]] as const) : []),
          ],
        },
        ...paymentBlocks(values),
        {
          kind: "paragraph",
          text: `For any questions about this invoice, please contact ${contact}. Thank you for your attention to this matter.`,
        },
        { kind: "paragraph", text: "Yours faithfully," },
        signature(values, context),
      ],
    };
  },
};

// Receipt ---------------------------------------------------------------------------

const PAYMENT_METHODS = ["Bank transfer", "Mobile money", "Cash", "Card", "Cheque"] as const;

const receipt: DocumentTemplate = {
  key: "payment_receipt",
  name: "Receipt",
  category: "Finance",
  documentType: "other",
  summary: "Confirm a payment received: who paid, how much, how, and what it was for.",
  fields: [
    { name: "reference", label: "Receipt number", type: "text", default: ref("RCT") },
    common.date,
    { ...clientField, label: "Received from" },
    clientAddressField,
    common.currency,
    { name: "amount", label: "Amount received", type: "number", required: true },
    {
      name: "amountWords",
      label: "Amount in words",
      type: "text",
      wide: true,
      placeholder: "e.g. Five hundred thousand Rwandan francs",
    },
    {
      name: "method",
      label: "Payment method",
      type: "select",
      options: PAYMENT_METHODS,
      default: () => PAYMENT_METHODS[0],
    },
    {
      name: "transactionReference",
      label: "Transaction reference",
      type: "text",
      hint: "Bank or mobile money transaction ID, or cheque number.",
    },
    { name: "forReference", label: "For invoice / reference", type: "text", required: true },
    {
      name: "balance",
      label: "Balance remaining",
      type: "number",
      hint: "Enter 0 when the invoice is paid in full.",
    },
    notesField,
    { name: "receivedBy", label: "Received by", type: "text", required: true },
    { name: "receivedByTitle", label: "Received by (title)", type: "text" },
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const amount = money(values, "amount", "Amount received", currency);
    const words = optional(values, "amountWords");
    const method = text(values, "method", "Payment method");
    const forReference = text(values, "forReference", "Invoice / reference");
    const transaction = optional(values, "transactionReference");
    return {
      title: "Receipt",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: recipient(values),
      blocks: [
        {
          kind: "paragraph",
          text: `Received with thanks from ${text(values, "clientName", "Received from")} the sum of ${amount}${words ? ` (${words})` : ""} by ${method.toLowerCase()}, in payment of ${forReference}.`,
        },
        {
          kind: "facts",
          rows: [
            ["Amount received", amount],
            ...(words ? ([["Amount in words", words]] as const) : []),
            ["Payment method", method],
            ...(transaction ? ([["Transaction reference", transaction]] as const) : []),
            ["For", forReference],
            ["Balance remaining", money(values, "balance", "Balance remaining", currency)],
          ],
        },
        ...paragraphs(values, "notes"),
        {
          kind: "signatures",
          parties: [
            {
              role: `Received for ${company(context)}`,
              name: text(values, "receivedBy", "Received by"),
              title: optional(values, "receivedByTitle") ?? undefined,
            },
          ],
        },
        { kind: "note", text: "Please keep this receipt as proof of payment." },
      ],
    };
  },
};

// Credit note -----------------------------------------------------------------------

const CREDIT_APPLICATIONS = [
  "Refund to the client",
  "Credit against the next invoice",
  "Credit against the outstanding balance",
] as const;

const creditNote: DocumentTemplate = {
  key: "credit_note",
  name: "Credit note",
  category: "Finance",
  documentType: "other",
  summary: "Reduce or cancel an invoice: what is credited, why, and how the credit will be applied.",
  fields: [
    { name: "reference", label: "Credit note number", type: "text", default: ref("CN") },
    common.date,
    clientField,
    clientAddressField,
    { name: "originalInvoice", label: "Original invoice number", type: "text", required: true },
    { name: "originalInvoiceDate", label: "Original invoice date", type: "date" },
    { name: "reason", label: "Reason for credit", type: "textarea", wide: true, required: true },
    common.currency,
    { name: "items", label: "Credited items", type: "items" },
    { ...taxRateField, hint: "Use the rate charged on the original invoice." },
    {
      name: "application",
      label: "How the credit will be applied",
      type: "select",
      options: CREDIT_APPLICATIONS,
      default: () => CREDIT_APPLICATIONS[1],
    },
    {
      name: "refundDetails",
      label: "Refund details",
      type: "textarea",
      wide: true,
      hint: "For refunds: how and when the money will be returned.",
    },
    notesField,
    common.signatory,
    common.signatoryTitle,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const rate = taxRate(values);
    const total = formatMoney(itemTotals(items(values, "items"), rate).total, currency);
    const invoice = text(values, "originalInvoice", "Original invoice number");
    const invoiceDate = optional(values, "originalInvoiceDate");
    const application = optional(values, "application") ?? CREDIT_APPLICATIONS[1];
    const applied =
      application === "Refund to the client"
        ? `The amount of ${total} will be refunded to you.`
        : application === "Credit against the outstanding balance"
          ? `The amount of ${total} has been credited against the outstanding balance on your account.`
          : `The amount of ${total} will be deducted from your next invoice.`;
    return {
      title: "Credit Note",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: recipient(values),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Original invoice", invoice],
            ...(invoiceDate ? ([["Invoice date", date(values, "originalInvoiceDate", "Invoice date")]] as const) : []),
            ["Total credited", total],
            ["Applied as", application],
          ],
        },
        { kind: "heading", text: "Reason for credit" },
        ...(paragraphs(values, "reason").length > 0
          ? paragraphs(values, "reason")
          : [{ kind: "paragraph", text: "[Reason for credit]" } as const]),
        { kind: "heading", text: "Credited items" },
        itemsBlock(values, currency, rate),
        {
          kind: "paragraph",
          text: `This credit note reduces the amount of invoice ${invoice} by ${total}. ${applied}`,
        },
        ...(optional(values, "refundDetails")
          ? ([
              { kind: "heading", text: "Refund details" },
              { kind: "list", items: lines(values, "refundDetails") },
            ] as const)
          : []),
        ...paragraphs(values, "notes"),
        signature(values, context),
      ],
    };
  },
};

// Purchase order --------------------------------------------------------------------

const purchaseOrder: DocumentTemplate = {
  key: "purchase_order",
  name: "Purchase order",
  category: "Finance",
  documentType: "other",
  summary: "Order goods or services from a supplier: items, tax, delivery and payment terms.",
  fields: [
    { name: "reference", label: "PO number", type: "text", default: ref("PO") },
    common.date,
    { name: "supplierName", label: "Supplier", type: "text", required: true },
    { name: "supplierAddress", label: "Supplier's address", type: "textarea" },
    { name: "supplierContact", label: "Supplier contact (name, phone or email)", type: "text" },
    {
      name: "deliveryAddress",
      label: "Deliver to",
      type: "textarea",
      default: (context) => context.letterhead.address,
    },
    { name: "deliveryDate", label: "Delivery date", type: "date", required: true },
    common.currency,
    { name: "items", label: "Items ordered", type: "items" },
    taxRateField,
    {
      name: "paymentTerms",
      label: "Payment terms",
      type: "text",
      required: true,
      placeholder: "e.g. 30 days from receipt of a valid invoice",
    },
    notesField,
    { ...common.signatory, label: "Authorised by" },
    common.signatoryTitle,
  ],
  build(values, context) {
    const currency = text(values, "currency", "Currency");
    const rate = taxRate(values);
    const totals = itemTotals(items(values, "items"), rate);
    const deliverTo = lines(values, "deliveryAddress");
    const contact = optional(values, "supplierContact");
    return {
      title: "Purchase Order",
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      recipient: [
        text(values, "supplierName", "Supplier"),
        ...(optional(values, "supplierAddress")?.split("\n") ?? []),
        ...(contact ? [contact] : []),
      ],
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Deliver to", deliverTo.length > 0 ? deliverTo.join(", ") : "[Delivery address]"],
            ["Delivery date", date(values, "deliveryDate", "Delivery date")],
            ["Payment terms", text(values, "paymentTerms", "Payment terms")],
            ["Order total", formatMoney(totals.total, currency)],
          ],
        },
        itemsBlock(values, currency, rate),
        ...paragraphs(values, "notes"),
        {
          kind: "note",
          text: "Please quote this PO number on your delivery note and invoice. Invoices without a PO number may be delayed.",
        },
        {
          kind: "signatures",
          parties: [
            {
              role: `Authorised for ${company(context)}`,
              name: text(values, "signatoryName", "Authorised by"),
              title: optional(values, "signatoryTitle") ?? undefined,
            },
          ],
        },
      ],
    };
  },
};

// Expense claim ---------------------------------------------------------------------

const EXPENSE_COLUMNS = ["Date", "Description", "Project", "Amount"] as const;

const expenseClaim: DocumentTemplate = {
  key: "expense_claim",
  name: "Expense claim",
  category: "Finance",
  documentType: "other",
  summary: "Claim back work expenses: itemised costs, total, declaration and approvals.",
  fields: [
    common.reference("EXP"),
    common.date,
    { name: "employeeName", label: "Employee", type: "text", required: true },
    { name: "position", label: "Position / department", type: "text" },
    { name: "periodFrom", label: "Period from", type: "date", required: true },
    { name: "periodTo", label: "Period to", type: "date", required: true },
    common.currency,
    {
      name: "expenses",
      label: "Expenses (Date | Description | Project | Amount)",
      type: "textarea",
      wide: true,
      required: true,
      placeholder: "2026-09-12 | Taxi to client site | Attendance system | 8,000",
      hint: "One expense per line. Amounts as plain numbers in the claim currency, so the total can be added up.",
    },
    {
      name: "receiptsAttached",
      label: "Receipts attached",
      type: "select",
      options: ["Yes", "No"],
      default: () => "Yes",
    },
    notesField,
    { name: "managerName", label: "Approving manager", type: "text" },
    { name: "financeName", label: "Finance approval by", type: "text" },
  ],
  build(values) {
    const currency = text(values, "currency", "Currency");
    const employee = text(values, "employeeName", "Employee");
    const rows = tableRows(values, "expenses", EXPENSE_COLUMNS.length);
    const total = sumAmounts(
      rows.map((row) => row[3]),
      currency,
    );
    const totalText = total === null ? "[Total claimed]" : formatMoney(total, currency);
    const displayRows = rows.map((row) => {
      const amount = parseAmount(row[3], currency);
      return [row[0], row[1], row[2], amount === null ? row[3] || "[Amount]" : formatMoney(amount, currency)];
    });
    const receipts = optional(values, "receiptsAttached");
    const position = optional(values, "position");
    return {
      title: "Expense Claim",
      subtitle: employee,
      reference: optional(values, "reference") ?? undefined,
      date: date(values, "date", "Date"),
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Employee", employee],
            ...(position ? ([["Position", position]] as const) : []),
            ["Period", `${date(values, "periodFrom", "Period from")} – ${date(values, "periodTo", "Period to")}`],
            ["Total claimed", totalText],
            ["Receipts attached", receipts ?? "[Receipts attached]"],
          ],
        },
        { kind: "heading", text: "Expenses" },
        table(EXPENSE_COLUMNS, rows.length > 0 ? [...displayRows, ["", "Total", "", totalText]] : [], "Expenses"),
        ...(receipts === "No"
          ? ([
              {
                kind: "note",
                text: "No receipts are attached to this claim. Finance may ask for other evidence of the expenses before paying it.",
              },
            ] as const)
          : []),
        ...paragraphs(values, "notes"),
        { kind: "heading", text: "Declaration" },
        {
          kind: "paragraph",
          text: `I, ${employee}, declare that the expenses above were incurred wholly and necessarily in the course of my work, that they have not been claimed before, and that any receipts attached are genuine.`,
        },
        {
          kind: "signatures",
          parties: [
            { role: "Employee", name: employee },
            { role: "Manager approval", name: optional(values, "managerName") ?? "" },
            { role: "Finance approval", name: optional(values, "financeName") ?? "" },
          ],
        },
      ],
    };
  },
};

export const FINANCE_TEMPLATES: readonly DocumentTemplate[] = [
  proformaInvoice,
  paymentRequest,
  paymentReminder,
  receipt,
  creditNote,
  purchaseOrder,
  expenseClaim,
];
