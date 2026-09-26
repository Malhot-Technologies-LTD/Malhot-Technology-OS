"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon, type IconName } from "@/components/site/brand/Icon";
import { Logo } from "@/components/site/brand/Logo";
import { ButtonLink } from "@/components/site/ui/Button";
import { aboutLinks, navLinks, projects, services, site, type NavMenu } from "@/content/site";
import { cn } from "@/lib/utils";

export type NavUser = { name: string; email: string } | null;

/** Delay before a hovered menu closes, so crossing a few pixels of gap does not drop it. */
const CLOSE_DELAY_MS = 150;

/**
 * Asks who is signed in, once per full page load. The layout persists across
 * client-side navigation, so this does not re-run when moving between pages.
 * Signed out is the default and the fallback, so a failed request or a database
 * outage simply leaves the header without a Dashboard link.
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

/**
 * Site header: a white bar that stays at the top of the viewport, with
 * full-width dropdown panels under About, Services and Projects.
 *
 * A dropdown opens on hover, and from the keyboard through the chevron button
 * beside its link, which carries `aria-expanded`. The top-level word itself is
 * still a plain link to the section's page. Escape closes the panel and returns
 * focus to the chevron; moving focus or the pointer out of the item closes it,
 * as does pressing anywhere outside the header. A panel is tied to the
 * pathname it opened on, so navigating closes it without an effect.
 *
 * Below `lg` the same structure renders as a stacked menu with accordions.
 *
 * Sign in is not here: the login is for the team, not for visitors, so it
 * lives in the footer. Someone already signed in gets a Dashboard link here,
 * because for them it is the most likely next step.
 */
export function Navbar() {
  const user = useSessionUser();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const [desktopMenu, setDesktopMenu] = useState<{ menu: NavMenu; path: string } | null>(null);
  const openMenu = desktopMenu?.path === pathname ? desktopMenu.menu : null;
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const mobileOpen = mobilePath === pathname;
  const [mobileSection, setMobileSection] = useState<NavMenu | null>(null);

  const open = (menu: NavMenu) => {
    window.clearTimeout(closeTimer.current);
    setDesktopMenu({ menu, path: pathname });
  };
  const close = () => {
    window.clearTimeout(closeTimer.current);
    setDesktopMenu(null);
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setDesktopMenu(null), CLOSE_DELAY_MS);
  };

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!openMenu && !mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openMenu) {
        headerRef.current?.querySelector<HTMLButtonElement>(`[data-menu-toggle="${openMenu}"]`)?.focus();
      }
      setDesktopMenu(null);
      setMobilePath(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setDesktopMenu(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openMenu, mobileOpen]);

  // An in-page anchor ("/services#process") is never the current page, or it would underline alongside Services.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="shell flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0" onClick={close}>
          <Logo onLight />
        </Link>

        <nav aria-label="Primary" className="hidden h-full lg:block">
          <ul className="flex h-full items-stretch">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              const menu = link.menu;
              const expanded = menu !== undefined && openMenu === menu;

              return (
                <li
                  key={link.href}
                  className="relative flex items-center"
                  onPointerEnter={menu ? () => open(menu) : undefined}
                  onPointerLeave={menu ? closeSoon : undefined}
                  onBlur={
                    menu
                      ? (event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeSoon();
                        }
                      : undefined
                  }
                >
                  <Link
                    href={link.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "py-2 text-[0.9rem] font-medium transition-colors",
                      menu ? "pr-0.5 pl-3" : "px-3",
                      active || expanded ? "text-brand" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    {link.label}
                  </Link>
                  {menu ? (
                    <button
                      type="button"
                      data-menu-toggle={menu}
                      aria-expanded={expanded}
                      aria-controls={`nav-panel-${menu}`}
                      aria-label={`${link.label} menu`}
                      onClick={() => (expanded ? close() : open(menu))}
                      className={cn(
                        "mr-1.5 grid h-7 w-6 place-items-center rounded-[var(--radius-s)] transition-colors hover:bg-bg-subtle",
                        active || expanded ? "text-brand" : "text-fg-subtle",
                      )}
                    >
                      <Icon
                        name="chevronDown"
                        className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")}
                      />
                    </button>
                  ) : null}
                  {active ? <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 bg-brand" /> : null}

                  {expanded ? (
                    <DesktopPanel id={`nav-panel-${menu}`} label={link.label}>
                      <MenuContent menu={menu} onNavigate={close} />
                    </DesktopPanel>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/os"
              className="hidden px-3 py-2 text-[0.9rem] font-medium text-fg-muted transition-colors hover:text-fg md:block"
            >
              Dashboard
            </Link>
          ) : null}
          <ButtonLink href="/start" className="hidden sm:inline-flex">
            Start a project
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMobilePath(mobileOpen ? null : pathname)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-menu"
            className="grid h-10 w-10 place-items-center rounded-[var(--radius-m)] border border-border text-fg transition-colors hover:bg-bg-subtle lg:hidden"
          >
            <Icon name={mobileOpen ? "close" : "menu"} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="site-mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-white lg:hidden"
        >
          <nav aria-label="Primary" className="shell py-3">
            <ul>
              {navLinks.map((link) => {
                const menu = link.menu;
                const expanded = menu !== undefined && mobileSection === menu;
                return (
                  <li key={link.href} className="border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between">
                      <Link
                        href={link.href}
                        onClick={() => setMobilePath(null)}
                        aria-current={isActive(link.href) ? "page" : undefined}
                        className={cn(
                          "flex-1 py-3.5 text-[1rem] font-medium",
                          isActive(link.href) ? "text-brand" : "text-fg",
                        )}
                      >
                        {link.label}
                      </Link>
                      {menu ? (
                        <button
                          type="button"
                          onClick={() => setMobileSection(expanded ? null : menu)}
                          aria-expanded={expanded}
                          aria-controls={`mobile-panel-${menu}`}
                          aria-label={`${link.label} menu`}
                          className="grid h-10 w-10 place-items-center rounded-[var(--radius-m)] text-fg-muted hover:bg-bg-subtle"
                        >
                          <Icon
                            name="chevronDown"
                            className={cn("h-5 w-5 transition-transform duration-200", expanded && "rotate-180")}
                          />
                        </button>
                      ) : null}
                    </div>
                    {expanded ? (
                      <div id={`mobile-panel-${menu}`} className="pb-4">
                        <MobileMenuLinks menu={menu} onNavigate={() => setMobilePath(null)} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 grid gap-2 pb-2 sm:grid-cols-2">
              <ButtonLink href="/start" size="lg" className="w-full">
                Start a project
              </ButtonLink>
              {user ? (
                <ButtonLink href="/os" size="lg" variant="secondary" className="w-full">
                  Dashboard
                </ButtonLink>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

/* --------------------------------- Desktop -------------------------------- */

/**
 * `fixed` directly under the bar: the header is sticky at the top of the
 * viewport and 4.5rem tall at `lg`, the only width where panels render, so the
 * panel spans the full window width whatever item opened it. It stays the list
 * item's DOM child, which is what keeps the pointer "inside" the item as it
 * moves down into the panel.
 */
function DesktopPanel({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div
      id={id}
      role="region"
      aria-label={`${label} menu`}
      className="fixed inset-x-0 top-[4.5rem] border-y border-border bg-white shadow-[var(--shadow-l)]"
    >
      <div className="shell py-8">{children}</div>
    </div>
  );
}

function MenuContent({ menu, onNavigate }: { menu: NavMenu; onNavigate: () => void }) {
  if (menu === "about") {
    return (
      <div className="grid grid-cols-[1fr_20rem] gap-8">
        <ul className="grid grid-cols-2 content-start gap-1 xl:grid-cols-3">
          {aboutLinks.map((item) => (
            <li key={item.href}>
              <MenuLink {...item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <Promo
          title="A team that finishes what it starts"
          copy="Planned with you, tested before it ships, documented so you own it."
          href="/about"
          cta="Read our story"
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  if (menu === "services") {
    return (
      <div className="grid grid-cols-[1fr_20rem] gap-8">
        <ul className="grid grid-cols-2 content-start gap-1 xl:grid-cols-3">
          {services.map((service) => (
            <li key={service.slug}>
              <MenuLink
                label={service.title}
                href={`/services#${service.slug}`}
                description={service.short}
                icon={service.icon}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
        <Promo
          title="Not sure where to start?"
          copy="Tell us what you are building. We will recommend the right mix of services and a first estimate."
          href="/start"
          cta="Start a project"
          onNavigate={onNavigate}
          links={[
            { label: "How we work", href: "/services#process" },
            { label: "Ways to work with us", href: "/services#engagements" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_20rem] gap-8">
      <ul className="grid grid-cols-2 content-start gap-1 xl:grid-cols-3">
        {projects.map((project) => (
          <li key={project.slug}>
            <MenuLink
              label={project.title}
              href={`/projects/${project.slug}`}
              description={`${project.category} · ${project.kind}`}
              icon={project.category === "Mobile" ? "mobile" : project.category === "Design" ? "design" : "code"}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
      <Promo
        title="See everything we have built"
        copy="Web platforms, mobile apps and design systems, and the problem each one solved."
        href="/projects"
        cta="All projects"
        onNavigate={onNavigate}
      />
    </div>
  );
}

function MenuLink({
  label,
  href,
  description,
  icon,
  onNavigate,
}: {
  label: string;
  href: string;
  description: string;
  icon: IconName;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex h-full gap-3.5 rounded-[var(--radius-m)] p-3 transition-colors hover:bg-bg-subtle"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-m)] bg-brand-subtle text-brand transition-colors group-hover:bg-brand group-hover:text-white">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.925rem] font-semibold text-fg group-hover:text-brand">{label}</span>
        <span className="mt-0.5 block text-[0.85rem] leading-snug text-fg-muted">{description}</span>
      </span>
    </Link>
  );
}

function Promo({
  title,
  copy,
  href,
  cta,
  links,
  onNavigate,
}: {
  title: string;
  copy: string;
  href: string;
  cta: string;
  links?: { label: string; href: string }[];
  onNavigate: () => void;
}) {
  return (
    <div className="on-ink flex flex-col rounded-[var(--radius-l)] bg-site-ink p-6 text-white">
      <p className="text-[1.05rem] leading-snug font-semibold">{title}</p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-site-ink-fg-muted">{copy}</p>
      {links ? (
        <ul className="mt-4 space-y-1.5 text-[0.875rem]">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                className="inline-flex items-center gap-1.5 text-site-blue-bright hover:text-white hover:underline"
              >
                {link.label}
                <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto pt-5">
        <Link
          href={href}
          onClick={onNavigate}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-m)] bg-white px-4 text-[0.875rem] font-semibold text-site-ink transition-colors hover:bg-brand-subtle"
        >
          {cta}
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------- Mobile --------------------------------- */

function MobileMenuLinks({ menu, onNavigate }: { menu: NavMenu; onNavigate: () => void }) {
  const items =
    menu === "about"
      ? aboutLinks.map((item) => ({ label: item.label, href: item.href }))
      : menu === "services"
        ? [
            ...services.map((service) => ({ label: service.title, href: `/services#${service.slug}` })),
            { label: "Ways to work with us", href: "/services#engagements" },
          ]
        : [
            { label: "All projects", href: "/projects" },
            ...projects.map((project) => ({ label: project.title, href: `/projects/${project.slug}` })),
          ];

  return (
    <ul className="space-y-0.5 border-l-2 border-brand-subtle pl-4">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="block py-2 text-[0.95rem] text-fg-muted hover:text-brand"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
