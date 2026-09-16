/**
 * Company-level facts used across the website. Anything marked `placeholder`
 * is a stand-in until the content owner supplies the real value (OD-7).
 */
export const site = {
  name: "Malhot Technologies",
  shortName: "Malhot",
  tagline: "We design, build and ship software systems.",
  description:
    "Malhot Technologies is a software company that designs, builds and ships websites, web applications, backend systems and automation for clients who need software that works.",
  location: "Kigali, Rwanda",
  contactEmail: { value: "hello@malhot.tech", placeholder: true },
  founded: { value: "2024", placeholder: true },
} as const;

export const primaryNav = [
  { label: "Services", href: "/services" },
  { label: "Work", href: "/work" },
  { label: "Process", href: "/process" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerNav = {
  company: [
    { label: "About", href: "/about" },
    { label: "Process", href: "/process" },
    { label: "Contact", href: "/contact" },
  ],
  work: [
    { label: "Services", href: "/services" },
    { label: "Selected work", href: "/work" },
  ],
  legal: [{ label: "Privacy", href: "/privacy" }],
} as const;
