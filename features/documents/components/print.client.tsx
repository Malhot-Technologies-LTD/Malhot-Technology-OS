"use client";

import { Printer } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

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

/** Opens the browser's print dialog, where "Save as PDF" is one of the printers. */
export function PrintButton({ label = "Print / Save as PDF", disabled }: { label?: string; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" disabled={disabled} onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}
