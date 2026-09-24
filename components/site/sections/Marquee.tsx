"use client";

import { capabilities } from "@/content/site";

export function Marquee() {
  const items = [...capabilities, ...capabilities];

  return (
    <section className="relative rounded-t-[1.75rem] border-y border-white/8 bg-[#050a16] py-6 sm:rounded-t-[2.5rem]">
      <div className="overflow-hidden mask-fade-x">
        <div className="flex w-max animate-marquee items-center gap-10 pr-10">
          {items.map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-10">
              <span className="text-[0.78rem] font-medium tracking-[0.28em] text-white/60 uppercase">{item}</span>
              <span className="h-1 w-1 rounded-full bg-brand-400/70 shadow-[0_0_10px_2px_rgba(43,108,255,0.6)]" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
