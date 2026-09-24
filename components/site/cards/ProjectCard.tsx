"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Icon } from "@/components/site/brand/Icon";
import { TiltCard } from "@/components/site/ui/Atmosphere";
import type { Project } from "@/content/site";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ProjectCard({
  project,
  index = 0,
  className,
  compact = false,
}: {
  project: Project;
  index?: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: EASE.soft, delay: Math.min(index * 0.07, 0.35) }}
      className={className}
    >
      <TiltCard strength={5}>
        <Link
          href={`/projects/${project.slug}`}
          className="group relative block overflow-hidden rounded-[1.6rem] border border-white/8 bg-[#070d1d] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-brand-400/45 hover:shadow-[0_40px_90px_-50px_rgba(43,108,255,0.85)]"
        >
          <div className={cn("relative overflow-hidden", compact ? "aspect-[16/11]" : "aspect-[16/10]")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              loading="lazy"
              decoding="async"
              src={project.cover || project.image}
              alt={project.title}
              className="h-full w-full scale-[1.02] object-cover opacity-80 transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.09] group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,15,0.15)_0%,rgba(4,7,15,0.55)_60%,rgba(4,7,15,0.95)_100%)]" />
            <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
              <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_100%,rgba(43,108,255,0.28),transparent_70%)]" />
            </div>

            <span className="absolute top-4 left-4 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[0.66rem] tracking-[0.2em] text-white/75 uppercase backdrop-blur-md">
              {project.category}
            </span>
            <span className="absolute top-4 right-4 grid h-9 w-9 translate-y-2 place-items-center rounded-full border border-brand-400/50 bg-brand-500/20 text-white opacity-0 backdrop-blur-md transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
              <Icon name="arrowUpRight" className="h-4 w-4" />
            </span>
          </div>

          <div className="relative flex items-end justify-between gap-4 px-5 pt-4 pb-5">
            <div className="min-w-0">
              <h3 className="display truncate text-[1.12rem] text-white transition-transform duration-500 group-hover:-translate-y-0.5">
                {project.title}
              </h3>
              <p className="mt-1.5 truncate text-[0.8rem] text-white/60">{project.kind}</p>
            </div>
            <span className="shrink-0 font-mono text-[0.68rem] text-white/55">{project.year}</span>
          </div>

          <span
            aria-hidden
            className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-brand-400 via-brand-300 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
          />
        </Link>
      </TiltCard>
    </motion.div>
  );
}
