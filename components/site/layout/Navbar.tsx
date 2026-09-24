"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Logo } from "@/components/site/brand/Logo";
import { Icon } from "@/components/site/brand/Icon";
import { ButtonLink } from "@/components/site/ui/Button";
import { setScrollLocked } from "@/components/site/providers/SmoothScroll";
import { navLinks, site } from "@/content/site";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type NavUser = { name: string; email: string } | null;

/**
 * Asks who is signed in, once per full page load. The layout persists across
 * client-side navigation, so this does not re-run when moving between pages.
 * Signed out is the default and the fallback, so a failed request or a database
 * outage simply leaves "Sign in" showing.
 */
function useSessionUser(): NavUser {
  const [user, setUser] = useState<NavUser>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/site/session", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data: { user: NavUser }) => setUser(data.user ?? null))
      .catch(() => {
        // Aborted or offline: stay signed out.
      });
    return () => controller.abort();
  }, []);

  return user;
}

export function Navbar() {
  const user = useSessionUser();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Tying the menu to a pathname makes it close on navigation without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  const setOpen = (value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(open) : value;
    setOpenPath(next ? pathname : null);
  };

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 24);
    setHidden(latest > 420 && latest > previous && !open);
  });

  useEffect(() => {
    setScrollLocked(open);
    if (open) document.documentElement.style.overflow = "hidden";
    else document.documentElement.style.overflow = "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/*
       * Slides in; does not fade in.
       *
       * The entrance used to animate opacity 0 -> 1 as well, which meant that
       * for the first 650ms of every page load the navigation text was drawn
       * at a fraction of its colour — "Sign in" measured 2.49:1 against the
       * hero, well under the 4.5:1 it needs. Transform alone gets the same
       * arrival without a window in which the chrome is unreadable, and it is
       * the cheaper property to animate.
       */}
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: hidden ? -110 : 0 }}
        transition={{ duration: 0.65, ease: EASE.swift }}
        className="fixed inset-x-0 top-0 z-[90] pt-3 sm:pt-5"
      >
        <div className="shell">
          <div
            className={cn(
              "flex h-[4.1rem] items-center justify-between rounded-full px-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5",
              scrolled
                ? "border border-white/10 bg-[rgba(6,11,24,0.72)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
                : "border border-transparent bg-transparent",
            )}
          >
            <Link href="/" aria-label="MALHOT home" className="group/logo shrink-0">
              <Logo
                className="transition-transform duration-500 group-hover/logo:scale-[1.03]"
                markClassName="h-8 w-8"
              />
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative rounded-full px-4 py-2 text-[0.83rem] font-medium transition-colors duration-300",
                      active ? "text-white" : "text-white/55 hover:text-white",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full border border-brand-400/30 bg-brand-500/12"
                        transition={{ duration: 0.5, ease: EASE.swift }}
                      />
                    ) : null}
                    <span className="relative">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2.5 md:flex">
                {user ? (
                  <Link
                    href="/os"
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.78rem] text-white/75 transition hover:border-brand-400/50 hover:text-white"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[0.62rem] font-semibold text-white">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full px-3 py-2 text-[0.82rem] text-white/60 transition hover:text-white"
                  >
                    Sign in
                  </Link>
                )}
                <ButtonLink href="/start" size="sm" icon="arrowUpRight" className="hidden sm:inline-flex">
                  Start a Project
                </ButtonLink>
              </div>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-white transition hover:border-brand-400/60 lg:hidden"
              >
                <Icon name={open ? "close" : "menu"} className="h-[1.1rem] w-[1.1rem]" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="mobile-menu"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.7, ease: EASE.cinematic }}
            className="fixed inset-0 z-[89] flex flex-col overflow-y-auto bg-[#040810] pt-28 pb-10 lg:hidden"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute top-[-10%] right-[-20%] h-[28rem] w-[28rem] rounded-full blur-[110px]"
              style={{ background: "radial-gradient(circle, rgba(43,108,255,0.28), transparent 70%)" }}
            />
            <div className="shell relative flex flex-1 flex-col">
              <motion.nav
                aria-label="Primary"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } } }}
                className="flex flex-col"
              >
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    variants={{
                      hidden: { y: 40, opacity: 0 },
                      show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE.soft } },
                    }}
                    className="border-b border-white/8"
                  >
                    <Link
                      href={link.href}
                      className="flex items-baseline justify-between py-5"
                      onClick={() => setOpen(false)}
                    >
                      <span
                        className={cn("display text-[2.1rem]", isActive(link.href) ? "text-gradient" : "text-white/85")}
                      >
                        {link.label}
                      </span>
                      <span className="font-mono text-[0.68rem] text-white/55">0{index + 1}</span>
                    </Link>
                  </motion.div>
                ))}
              </motion.nav>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.7, ease: EASE.soft }}
                className="mt-10 flex flex-col gap-3"
              >
                <ButtonLink href="/start" size="lg" icon="arrowUpRight" magnetic={false} className="w-full">
                  Start a Project
                </ButtonLink>
                <ButtonLink
                  href={user ? "/os" : "/login"}
                  size="lg"
                  variant="secondary"
                  magnetic={false}
                  className="w-full"
                >
                  {user ? "Go to dashboard" : "Sign in"}
                </ButtonLink>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.7 }}
                className="mt-auto pt-10 text-[0.8rem] text-white/60"
              >
                <p className="text-white/70">{site.email}</p>
                <p className="mt-1">{site.phone}</p>
                <p className="mt-1">{site.location}</p>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
