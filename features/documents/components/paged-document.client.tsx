"use client";

import { memo, useDeferredValue, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type { Block, DocumentContent, Letterhead } from "../content";
import { BlockView, DocumentFooter, DocumentHead, PAPER_CLASS, PAPER_STYLE, blockStackClass } from "./document-paper";

const MM = 96 / 25.4;
const PAGE_WIDTH = 210 * MM;
/** The 297 mm sheet less its 18 mm top and bottom margins. */
const PAGE_CONTENT = (297 - 36) * MM;
/** Kept clear above the footer rule, so a full page never runs into it. */
const FOOTER_CLEARANCE = 12;
/** Between pages, before zoom. */
const PAGE_GAP = 32;
/**
 * Below this scale two pages side by side are too small to read (10.5 pt body
 * text shrinks under ~6 px), so the pages stack instead.
 */
const MIN_SPREAD_ZOOM = 0.55;
/** A paragraph never leaves fewer lines than this alone at the foot or head of a page. */
const MIN_LINES = 2;

/** Rows [from, to) of a block, or all of it. */
type Piece = { index: number; slice?: [number, number]; chars?: [number, number] };

/** A splittable block's rows (list items, table rows, lines of text), relative to its top. */
type Units = {
  tops: number[];
  bottoms: number[];
  /** Above the first row: a table's header, repeated on every page it continues on. */
  pre: number;
  /** Below the last row: an invoice's totals, drawn once at the end. */
  post: number;
  /** For a paragraph: where each line starts in its text. */
  offsets?: number[];
};

/**
 * A generated document as the A4 pages it will print on, for the screen.
 *
 * The blocks are drawn once, invisibly, at the true page width; each block is
 * measured and the pages are filled greedily. Headings stay with what follows
 * them. Parties, signatures, facts and invoice items move whole to the next
 * page (facts and items split by row only if one would not fit even an empty
 * page). Lists, tables, terms and paragraphs break between items, rows or
 * lines; a continued table repeats its header. A single block taller than a
 * page gets a page of its own that grows to fit, so nothing is ever cut off.
 *
 * Pages zoom to the width available rather than reflowing, as A4Frame does. On
 * a wide screen they sit in pairs, a two-page spread.
 *
 * Printing does not use this: PrintCopy prints DocumentPaper's single flow and
 * the browser paginates it on @page A4, so print breaks can differ slightly.
 */
export function PagedDocument({
  content,
  letterhead,
  id,
}: {
  content: DocumentContent;
  letterhead: Letterhead;
  id?: string;
}) {
  // Typing in the generator redraws the document on every keystroke; deferring
  // lets the keystroke paint first and the re-pagination follow when idle.
  const deferredContent = useDeferredValue(content);
  const deferredLetterhead = useDeferredValue(letterhead);
  return <Pages content={deferredContent} letterhead={deferredLetterhead} id={id} />;
}

const Pages = memo(function Pages({
  content,
  letterhead,
  id,
}: {
  content: DocumentContent;
  letterhead: Letterhead;
  id?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Piece[][] | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [fontsLoaded, noteFontsLoaded] = useReducer((count: number) => count + 1, 0);
  const contract = content.layout === "contract";
  const markId = `paper-${id ?? "paged"}`;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setWidth(frame.clientWidth);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Text measured before the web font arrives is measured in the fallback font.
  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) return;
    let live = true;
    const loaded = () => {
      if (live) noteFontsLoaded();
    };
    void fonts.ready.then(loaded);
    fonts.addEventListener("loadingdone", loaded);
    return () => {
      live = false;
      fonts.removeEventListener("loadingdone", loaded);
    };
  }, []);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const next = paginate(content.blocks, root);
    // Most keystrokes change no page break; skip the second render when so.
    setPages((previous) => (previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
  }, [content, letterhead, fontsLoaded]);

  const shown: Piece[][] = pages ?? [content.blocks.map((_, index) => ({ index }))];
  const total = shown.length;
  const available = width ?? PAGE_WIDTH;
  const spreadZoom = Math.min(1, available / (2 * PAGE_WIDTH + PAGE_GAP));
  // Pairs read 1–2, 3–4 rather than as a book with page 1 alone on the right:
  // these documents print single-sided, so there are no facing pages to imitate
  // and a lone first page would only waste the top row.
  const spread = total > 1 && spreadZoom >= MIN_SPREAD_ZOOM;
  const zoom = spread ? spreadZoom : Math.min(1, available / PAGE_WIDTH);

  return (
    <div ref={frameRef} id={id} className="relative w-full">
      <div
        style={{ zoom, gap: PAGE_GAP }}
        className={spread ? "grid grid-cols-[repeat(2,210mm)] justify-center" : "flex flex-col items-center"}
      >
        {shown.map((pieces, pageIndex) => (
          <section
            key={pageIndex}
            aria-label={`Page ${pageIndex + 1} of ${total}`}
            className={cn(PAPER_CLASS, "min-h-[297mm]")}
            style={PAPER_STYLE}
          >
            {pageIndex === 0 ? <DocumentHead content={content} letterhead={letterhead} markId={markId} /> : null}
            <div className={cn(blockStackClass(contract), pageIndex === 0 && (contract ? "mt-6" : "mt-5"))}>
              {pieces.map((piece) => (
                <PieceView
                  key={`${piece.index}-${piece.slice?.[0] ?? piece.chars?.[0] ?? 0}`}
                  piece={piece}
                  block={content.blocks[piece.index]}
                  contract={contract}
                />
              ))}
            </div>
            <DocumentFooter
              content={content}
              letterhead={letterhead}
              page={pages ? { number: pageIndex + 1, total } : undefined}
            />
          </section>
        ))}
      </div>

      {/* The measuring copy: laid out at full A4 width, clipped to nothing so it never widens the page. */}
      <div aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 size-0 overflow-hidden">
        <div ref={measureRef} className="w-[210mm]">
          <article className={PAPER_CLASS} style={PAPER_STYLE}>
            <DocumentHead content={content} letterhead={letterhead} markId={`${markId}-measure`} />
            <div data-body className={cn(blockStackClass(contract), contract ? "mt-6" : "mt-5")}>
              {content.blocks.map((block, index) => (
                <div key={index}>
                  <BlockView block={block} contract={contract} />
                </div>
              ))}
            </div>
            {/* The widest page number, so the footer is measured at its tallest. */}
            <DocumentFooter content={content} letterhead={letterhead} page={{ number: 99, total: 99 }} />
          </article>
        </div>
      </div>
    </div>
  );
});

function PieceView({ piece, block, contract }: { piece: Piece; block: Block | undefined; contract: boolean }) {
  // Pieces can outlive the content they were cut from for one unpainted render.
  if (!block) return null;
  if (piece.chars && block.kind === "paragraph") {
    const [start, end] = piece.chars;
    const text = block.text.slice(start, end).trim();
    // A paragraph broken mid-flow keeps its last line justified, as in print.
    const runsOn = end < block.text.length && !text.includes("\n");
    return (
      <div className={cn(runsOn && "[&>p]:[text-align-last:justify]")}>
        <BlockView block={{ kind: "paragraph", text }} contract={contract} />
      </div>
    );
  }
  return (
    <div>
      <BlockView block={block} contract={contract} slice={piece.slice} />
    </div>
  );
}

/** Reads the measuring copy and fills pages. Reads layout only; writes nothing to the DOM. */
function paginate(blocks: readonly Block[], root: HTMLElement): Piece[][] {
  const article = root.firstElementChild as HTMLElement;
  const body = article.querySelector<HTMLElement>("[data-body]")!;
  const footer = article.querySelector<HTMLElement>("footer")!;
  const bodyTop = body.getBoundingClientRect().top - article.getBoundingClientRect().top - 18 * MM;
  const rest = PAGE_CONTENT - footer.getBoundingClientRect().height - FOOTER_CLEARANCE;
  const first = rest - bodyTop;
  const gap = parseFloat(getComputedStyle(body).rowGap) || 0;
  const elements = Array.from(body.children) as HTMLElement[];
  const heights = elements.map((element) => element.getBoundingClientRect().height);

  const unitCache = new Map<number, Units | null>();
  const unitsOf = (index: number): Units | null => {
    if (!unitCache.has(index)) unitCache.set(index, splitUnits(blocks[index], elements[index], heights[index], rest));
    return unitCache.get(index)!;
  };
  const minRows = (units: Units) => (units.offsets ? MIN_LINES : 1);

  /** What must fit under a heading for it to stay on this page: the start of the next block. */
  const lead = (index: number): number => {
    if (blocks[index].kind === "heading")
      return heights[index] + (index + 1 < blocks.length ? gap + lead(index + 1) : 0);
    const units = unitsOf(index);
    return units ? chunk(units, 0, Math.min(minRows(units), units.tops.length)) : heights[index];
  };

  const pages: Piece[][] = [[]];
  let used = 0;
  let space = first;
  const current = () => pages[pages.length - 1];
  const newPage = () => {
    pages.push([]);
    used = 0;
    space = rest;
  };
  const place = (piece: Piece, height: number) => {
    used += (current().length > 0 ? gap : 0) + height;
    current().push(piece);
  };

  blocks.forEach((block, index) => {
    let from = 0;
    for (;;) {
      const empty = current().length === 0;
      const room = space - used - (empty ? 0 : gap);
      const units = from > 0 ? unitsOf(index) : null;
      const remaining = units ? chunk(units, from, units.tops.length) : heights[index];
      const piece = units ? rowsPiece(index, units, from, units.tops.length) : { index };

      if (block.kind === "heading") {
        const withNext = index + 1 < blocks.length ? remaining + gap + lead(index + 1) : remaining;
        if (empty || withNext <= room) {
          place(piece, remaining);
          return;
        }
        newPage();
        continue;
      }
      if (remaining <= room) {
        place(piece, remaining);
        return;
      }

      const splittable = unitsOf(index);
      if (splittable) {
        const to = fit(splittable, from, room, minRows(splittable), empty);
        if (to > from) {
          place(rowsPiece(index, splittable, from, to), chunk(splittable, from, to));
          from = to;
          newPage();
          continue;
        }
      }
      if (!empty) {
        newPage();
        continue;
      }
      // Taller than a whole page and cannot be split: it gets the page to itself.
      place(piece, remaining);
      return;
    }
  });

  return pages;
}

/** Height of rows [from, to) drawn as one piece, with the header and, at the end, the totals. */
function chunk(units: Units, from: number, to: number): number {
  const last = to === units.tops.length;
  return units.pre + units.bottoms[to - 1] - units.tops[from] + (last ? units.post : 0);
}

/**
 * The most rows from `from` that fit in `room`, keeping at least `min` rows on
 * each side of the break. `from` means no break fits; on an empty page at least
 * one row is taken, so pagination always moves forward.
 */
function fit(units: Units, from: number, room: number, min: number, force: boolean): number {
  const count = units.tops.length;
  let to = from;
  while (to < count && chunk(units, from, to + 1) <= room) to += 1;
  if (count - to < min) to = count - min;
  if (to - from < min) to = force ? Math.max(to, from + 1) : from;
  return Math.min(to, count);
}

function rowsPiece(index: number, units: Units, from: number, to: number): Piece {
  if (from === 0 && to === units.tops.length) return { index };
  if (units.offsets) return { index, chars: [units.offsets[from], units.offsets[to] ?? Number.MAX_SAFE_INTEGER] };
  return { index, slice: [from, to] };
}

/**
 * The rows a block may break between, or null if it must stay whole. Facts and
 * invoice items stay whole unless they are taller than an empty page.
 */
function splitUnits(block: Block, element: HTMLElement, height: number, page: number): Units | null {
  let rows: HTMLElement[];
  switch (block.kind) {
    case "paragraph":
      return lineUnits(element, height);
    case "list":
      rows = Array.from(element.querySelectorAll("li"));
      break;
    case "terms":
      rows = Array.from(element.querySelectorAll(":scope > dl > div"));
      break;
    case "table":
      rows = Array.from(element.querySelectorAll("tbody > tr"));
      break;
    case "facts":
    case "items":
      if (height <= page) return null;
      rows = Array.from(element.querySelectorAll("tbody > tr"));
      break;
    default:
      return null;
  }
  // An invoice with no lines shows one placeholder row; there is nothing to split.
  if (rows.length < 2 || (block.kind === "items" && rows.length !== itemRowCount(block))) return null;
  const top = element.getBoundingClientRect().top;
  const tops: number[] = [];
  const bottoms: number[] = [];
  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    tops.push(rect.top - top);
    bottoms.push(rect.bottom - top);
  }
  return { tops, bottoms, pre: tops[0], post: height - bottoms[bottoms.length - 1] };
}

function itemRowCount(block: Extract<Block, { kind: "items" }>): number {
  return block.items.filter((item) => item.description.trim() !== "" || item.unitPrice > 0).length;
}

/**
 * A paragraph's lines, found from where each word's first letter sits. The
 * paragraph renders its text verbatim (gap highlights only wrap it), so an
 * offset into its text nodes is an offset into the block's text.
 */
function lineUnits(element: HTMLElement, height: number): Units | null {
  const paragraph = element.firstElementChild;
  if (!paragraph) return null;
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const top = element.getBoundingClientRect().top;
  const glyphTops: number[] = [];
  const offsets: number[] = [];
  let base = 0;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    for (const word of node.data.matchAll(/\S+/g)) {
      range.setStart(node, word.index);
      range.setEnd(node, word.index + 1);
      const wordTop = range.getBoundingClientRect().top - top;
      // A new line starts when a word sits clearly below the line before.
      if (glyphTops.length === 0 || wordTop > glyphTops[glyphTops.length - 1] + 4) {
        glyphTops.push(wordTop);
        offsets.push(base + word.index);
      }
    }
    base += node.data.length;
  }
  if (glyphTops.length < 2) return null;
  // Lines are equally tall, so line boxes can be placed from the glyphs' spacing.
  const tops = glyphTops.map((glyphTop) => glyphTop - glyphTops[0]);
  const bottoms = tops.map((_, line) => (line + 1 < tops.length ? tops[line + 1] : height));
  return { tops, bottoms, pre: 0, post: 0, offsets };
}
