"use client";

/** Last-resort boundary: replaces the root layout, so it must render its own html/body without app styles. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        {error.digest ? <p style={{ opacity: 0.6 }}>ref {error.digest}</p> : null}
        <button type="button" onClick={retry}>
          Try again
        </button>
      </body>
    </html>
  );
}
