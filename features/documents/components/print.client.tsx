"use client";

import { FileDown, Printer } from "lucide-react";
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import type { DocumentContent, Letterhead } from "../content";

const noSubscription = () => () => {};

function printRoot(): HTMLElement {
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Renders its children a second time, into #print-root at the top of <body>,
 * where the print stylesheet in app/globals.css shows them and nothing else.
 * The on-screen copy is untouched. Nothing renders on the server: there is no
 * body to portal into until the browser has taken over.
 */
export function PrintCopy({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(children, printRoot());
}

/** Opens the browser's print dialog on A4, where "Save as PDF" is one of the printers. */
export function PrintButton({ label = "Save as PDF", disabled }: { label?: string; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" disabled={disabled} onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}

/**
 * Downloads the document as an editable Word file, on A4. The exporter and its
 * library load on the first click, not with the page.
 */
export function DownloadWordButton({
  content,
  letterhead,
  fileTitle,
  disabled,
}: {
  content: DocumentContent;
  letterhead: Letterhead;
  /** Names the file, e.g. "Offer of employment — Aline Uwase". */
  fileTitle: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { documentToDocx, docxFileName } = await import("../docx");
      const blob = await documentToDocx(content, letterhead);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = docxFileName(fileTitle);
      link.click();
      // Revoked on the next tick: some browsers start the download asynchronously.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      toast.error("The Word file could not be created. Try again, or use Save as PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" disabled={disabled || busy} onClick={download}>
      <FileDown aria-hidden="true" />
      {busy ? "Preparing…" : "Download Word"}
    </Button>
  );
}

const A4_WIDTH_PX = (210 / 25.4) * 96;

/**
 * Shows an A4 page at its true proportions in whatever width is available: the
 * page keeps its real 210 mm layout and is zoomed down to fit, instead of the
 * text reflowing into a narrower, taller sheet that no longer matches paper.
 */
export function A4Frame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => setZoom(Math.min(1, element.clientWidth / A4_WIDTH_PX));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      <div style={{ zoom }}>{children}</div>
    </div>
  );
}
