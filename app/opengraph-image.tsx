import { ImageResponse } from "next/og";

import { site } from "@/content/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default Open Graph card: dark, typographic, one accent — matches the website register. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#14161c",
        color: "#f2f3f5",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 600 }}>
        <div
          style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(150deg, #2b8cff, #1236d8)" }}
        />
        {site.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05, maxWidth: 980 }}>
          {site.tagline}
        </div>
        <div style={{ fontSize: 28, color: "#5b6380" }}>Websites · Web applications · Backend systems · Automation</div>
      </div>
    </div>,
    size,
  );
}
