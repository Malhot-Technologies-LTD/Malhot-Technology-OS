import { AboutTeaser } from "@/components/site/sections/AboutTeaser";
import { Hero } from "@/components/site/sections/Hero";
import { Marquee } from "@/components/site/sections/Marquee";
import { ProcessStory } from "@/components/site/sections/ProcessStory";
import { ServicesShowcase } from "@/components/site/sections/ServicesShowcase";
import { StatsBand } from "@/components/site/sections/StatsBand";
import { Testimonials } from "@/components/site/sections/Testimonials";
import { WorkShowcase } from "@/components/site/sections/WorkShowcase";

export default function HomePage() {
  return (
    <div className="relative">
      <Hero />

      {/* The page pulls up over the pinned hero — square edge, full bleed. */}
      <div className="relative z-10 bg-site-ink-deep shadow-[0_-50px_90px_-40px_rgba(0,0,0,0.85)]">
        <Marquee />
        <AboutTeaser />
        <ServicesShowcase />
        <ProcessStory />
        <WorkShowcase />
        <StatsBand />
        <Testimonials />
      </div>
    </div>
  );
}
