import { Database } from "lucide-react";

/** Shown until the company_files migration is applied; nothing else on the page can work before then. */
export function FilesNotReady() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg"
    >
      <Database className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        Files need a one-time database update (migration <code className="font-mono">20260927210000_company_files</code>
        ). Until then you can still generate documents and save them to a project from Documents.
      </p>
    </div>
  );
}
