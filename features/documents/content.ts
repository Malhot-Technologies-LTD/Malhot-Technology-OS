/**
 * The shape every generated document is built into, and the letterhead it is
 * printed on. Templates produce this structure; one renderer draws it. Keeping
 * content and presentation apart is what lets every document share the same
 * professional layout, and lets the layout improve without touching templates.
 */

export type LineItem = { description: string; quantity: number; unitPrice: number };

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: readonly string[]; ordered?: boolean }
  | { kind: "facts"; rows: readonly (readonly [string, string])[] }
  | {
      kind: "items";
      currency: string;
      items: readonly LineItem[];
      /** Percentage applied to the subtotal, e.g. 18 for VAT. */
      taxRate: number;
      taxLabel: string;
    }
  | { kind: "note"; text: string }
  /** "Label: value" lines, label bold, as in "Compensation: 14.295% of salary base". */
  | { kind: "terms"; rows: readonly (readonly [string, string])[] }
  /** The parties to an agreement, side by side under an introductory sentence. */
  | { kind: "parties"; intro: string; parties: readonly { role: string; lines: readonly string[] }[] }
  | { kind: "signatures"; parties: readonly { role: string; name: string; title?: string }[] }
  /**
   * A grid with a header row: milestones, SLA severities, risks, test cases,
   * action items. Cells are plain text ([gaps] highlighted). Rows keep
   * together across pages; the header repeats on each printed page.
   */
  | { kind: "table"; columns: readonly string[]; rows: readonly (readonly string[])[] };

export type DocumentContent = {
  title: string;
  subtitle?: string;
  reference?: string;
  date: string;
  /** Who it is addressed to, printed above the body like a letter. */
  recipient?: readonly string[];
  blocks: readonly Block[];
  /** Printed in the footer of every page, e.g. "Confidential". */
  classification?: string;
  /**
   * "letter" (default) sets reference and date at the top like correspondence.
   * "contract" follows the company's agreement format: centred title and role,
   * an AGREEMENT DATE line left blank for signing when no date is given,
   * CAPS numbered sections and a two-column signature block.
   */
  layout?: "letter" | "contract";
  /** Label for the date line in the contract layout, e.g. "AGREEMENT DATE". */
  dateLabel?: string;
};

export type Letterhead = {
  companyName: string;
  tagline: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  registration: string;
};

export const LETTERHEAD_FIELDS: readonly { key: keyof Letterhead; label: string; placeholder?: string }[] = [
  { key: "companyName", label: "Company name" },
  { key: "tagline", label: "Tagline" },
  { key: "address", label: "Address" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "registration", label: "Registration / TIN", placeholder: "e.g. TIN 123456789" },
];

const MONEY_CACHE = new Map<string, Intl.NumberFormat>();

/** "RWF 1,250,000" — currency code first, which reads unambiguously in East Africa. */
export function formatMoney(amount: number, currency: string): string {
  const code = currency.trim().toUpperCase() || "RWF";
  let format = MONEY_CACHE.get(code);
  if (!format) {
    const digits = code === "RWF" || code === "UGX" || code === "TZS" ? 0 : 2;
    format = new Intl.NumberFormat("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    MONEY_CACHE.set(code, format);
  }
  return `${code} ${format.format(Number.isFinite(amount) ? amount : 0)}`;
}

export function itemTotals(items: readonly LineItem[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-10-01" → "1 October 2026"; anything unparseable is returned as typed. */
export function longDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? value : LONG_DATE.format(new Date(time));
}
