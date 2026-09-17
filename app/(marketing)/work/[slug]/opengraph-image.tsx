import { ImageResponse } from "next/og";

import { site } from "@/content/site";
import { getCaseStudy } from "@/content/work";

export const alt = "Case study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CaseStudyOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  const title = study?.title ?? "Case study";
  const meta = study ? `${study.client} · ${study.year}` : site.name;

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
        <div style={{ fontSize: 26, color: "#5b6380" }}>{meta}</div>
        <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.1, maxWidth: 1000 }}>
          {title}
        </div>
      </div>
    </div>,
    size,
  );
}
