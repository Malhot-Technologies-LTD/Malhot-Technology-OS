import { LogoMark } from "@/components/site/brand/Logo";
import { cn } from "@/lib/utils";

import { formatMoney, itemTotals, type Block, type DocumentContent, type Letterhead } from "../content";

/**
 * A generated document on company letterhead: an A4 sheet that looks the same
 * on screen and on paper.
 *
 * Colours are fixed rather than theme tokens. Paper is white in dark mode too,
 * and a document printed from a dark screen must not come out grey. The navy
 * and blue are the brand's own (#0b1f4b, #1652e6), used as a thin rule and the
 * title only, so the page reads as corporate rather than decorated.
 *
 * Gaps the author has not filled in — text in [square brackets] — are
 * highlighted on screen so they are easy to spot, and print plainly.
 */
export function DocumentPaper({
  content,
  letterhead,
  className,
  id,
}: {
  content: DocumentContent;
  letterhead: Letterhead;
  className?: string;
  id?: string;
}) {
  const contact = [letterhead.address, letterhead.phone, letterhead.email, letterhead.website].filter(Boolean);

  return (
    <article
      id={id}
      className={cn(
        "document-paper mx-auto flex w-full max-w-[210mm] flex-col bg-white px-[14mm] py-[14mm] text-[10.5pt] leading-[1.55] text-[#1b2230] shadow-[0_1px_3px_rgba(15,23,42,0.12),0_12px_32px_-12px_rgba(15,23,42,0.25)] sm:px-[18mm] sm:py-[16mm] print:max-w-none print:p-0 print:shadow-none",
        className,
      )}
      style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
    >
      <header className="flex items-start justify-between gap-6 border-b-2 border-[#0b1f4b] pb-4">
        <div className="flex items-center gap-3">
          <LogoMark id={`paper-${id ?? "doc"}`} onLight className="h-[34px] w-[42px] shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-[15pt] font-bold tracking-[0.08em] text-[#0b1f4b] uppercase">
              {letterhead.companyName || "[Company name]"}
            </span>
            {letterhead.tagline ? (
              <span className="text-[7.5pt] font-medium tracking-[0.2em] text-[#5b6580] uppercase">
                {letterhead.tagline}
              </span>
            ) : null}
          </div>
        </div>
        <address className="text-right text-[8.5pt] leading-[1.5] text-[#5b6580] not-italic">
          {contact.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          {letterhead.registration ? <span className="block">{letterhead.registration}</span> : null}
        </address>
      </header>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[9pt] text-[#5b6580]">
        {content.reference ? (
          <span>
            Ref: <Gap>{content.reference}</Gap>
          </span>
        ) : (
          <span />
        )}
        <span>
          <Gap>{content.date}</Gap>
        </span>
      </div>

      {content.recipient && content.recipient.length > 0 ? (
        <div className="mt-5 text-[10pt]">
          {content.recipient.map((line, index) => (
            <span key={`${line}-${index}`} className={cn("block", index === 0 && "font-semibold")}>
              <Gap>{line}</Gap>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        <h1 className="text-[17pt] leading-tight font-bold text-[#0b1f4b]">
          <Gap>{content.title}</Gap>
        </h1>
        {content.subtitle ? (
          <p className="mt-1 text-[10.5pt] font-medium text-[#1652e6]">
            <Gap>{content.subtitle}</Gap>
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {content.blocks.map((block, index) => (
          <BlockView key={index} block={block} />
        ))}
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#d6dbe6] pt-3 text-[7.5pt] text-[#7a8399]">
        <span>
          {letterhead.companyName}
          {letterhead.registration ? ` · ${letterhead.registration}` : ""}
        </span>
        {content.classification ? (
          <span className="font-semibold tracking-[0.08em] uppercase">{content.classification}</span>
        ) : null}
      </footer>
    </article>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return (
        <h2 className="mt-2 [break-after:avoid] text-[11pt] font-bold text-[#0b1f4b]">
          <Gap>{block.text}</Gap>
        </h2>
      );
    case "paragraph":
      return (
        <p className="text-justify [hyphens:auto] whitespace-pre-line">
          <Gap>{block.text}</Gap>
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={cn("flex flex-col gap-1 pl-5", block.ordered ? "list-decimal" : "list-disc marker:text-[#1652e6]")}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Gap>{item}</Gap>
            </li>
          ))}
        </Tag>
      );
    }
    case "facts":
      return (
        <table className="w-full border-collapse [break-inside:avoid] text-[10pt]">
          <tbody>
            {block.rows.map(([label, value]) => (
              <tr key={label} className="border-b border-[#e3e7ef]">
                <th
                  scope="row"
                  className="w-[38%] bg-[#f5f7fb] px-3 py-1.5 text-left align-top font-semibold text-[#3a4358]"
                >
                  {label}
                </th>
                <td className="px-3 py-1.5 align-top">
                  <Gap>{value}</Gap>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "items": {
      const rows = block.items.filter((item) => item.description.trim() !== "" || item.unitPrice > 0);
      const totals = itemTotals(rows, block.taxRate);
      return (
        <table className="w-full border-collapse [break-inside:avoid] text-[9.5pt]">
          <thead>
            <tr className="bg-[#0b1f4b] text-left text-white">
              <th scope="col" className="px-3 py-2 font-semibold">
                Description
              </th>
              <th scope="col" className="w-[12%] px-3 py-2 text-right font-semibold">
                Qty
              </th>
              <th scope="col" className="w-[22%] px-3 py-2 text-right font-semibold">
                Unit price
              </th>
              <th scope="col" className="w-[22%] px-3 py-2 text-right font-semibold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="border-b border-[#e3e7ef]">
                <td colSpan={4} className="px-3 py-2 text-[#9aa3b5]">
                  <Gap>[Line items]</Gap>
                </td>
              </tr>
            ) : (
              rows.map((item, index) => (
                <tr key={index} className="border-b border-[#e3e7ef]">
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(item.unitPrice, block.currency)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(item.quantity * item.unitPrice, block.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="tabular-nums">
            {block.taxLabel ? (
              <>
                <tr>
                  <td colSpan={3} className="px-3 pt-2 text-right text-[#5b6580]">
                    Subtotal
                  </td>
                  <td className="px-3 pt-2 text-right">{formatMoney(totals.subtotal, block.currency)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-3 text-right text-[#5b6580]">
                    {block.taxLabel}
                  </td>
                  <td className="px-3 text-right">{formatMoney(totals.tax, block.currency)}</td>
                </tr>
              </>
            ) : null}
            <tr>
              <td colSpan={3} className="px-3 pt-2 text-right font-bold text-[#0b1f4b]">
                Total
              </td>
              <td className="px-3 pt-2 text-right font-bold text-[#0b1f4b]">
                {formatMoney(totals.total, block.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      );
    }
    case "note":
      return (
        <p className="border-l-[3px] border-[#1652e6] bg-[#f5f7fb] px-3 py-2 text-[9.5pt] text-[#3a4358]">
          <Gap>{block.text}</Gap>
        </p>
      );
    case "signatures":
      return (
        <div
          className={cn(
            "mt-8 grid [break-inside:avoid] gap-10",
            block.parties.length > 1 ? "grid-cols-2" : "grid-cols-1 sm:w-1/2",
          )}
        >
          {block.parties.map((party, index) => (
            <div key={index} className="flex flex-col gap-1 text-[9.5pt]">
              <span className="font-semibold text-[#3a4358]">
                <Gap>{party.role}</Gap>
              </span>
              <span className="mt-10 block border-b border-[#1b2230]" aria-hidden="true" />
              <span className="mt-1">
                Name: {party.name ? <Gap>{party.name}</Gap> : <span className="text-[#9aa3b5]">________________</span>}
              </span>
              {party.title ? <span>Title: {party.title}</span> : null}
              <span>Date: ________________</span>
            </div>
          ))}
        </div>
      );
  }
}

/** Highlights [bracketed] gaps so an unfinished document is obvious before it goes out. */
function Gap({ children }: { children: string }) {
  if (!children.includes("[")) return <>{children}</>;
  const parts = children.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, index) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <mark
            key={index}
            className="rounded-sm bg-[#fff4c2] px-0.5 text-[#8a5a00] print:bg-transparent print:text-inherit"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
