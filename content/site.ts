/**
 * Website content, rendered by `app/(marketing)`.
 *
 * Ported from the standalone Malhot-Website repository (commit d6daad3) when
 * the public site and the OS became one application. The design is that site's;
 * the delivery — SEO, sitemap, Open Graph, the inquiry pipeline — stays the
 * OS's.
 *
 * The rule in content/README.md still holds: never invent client names, metrics,
 * quotes or people. Anything below carrying `unverified: true` came across from
 * the website repo unsourced and must be confirmed or replaced before it can be
 * treated as fact. It is flagged rather than deleted so the page still composes
 * while the content owner decides (content/README.md, "Content gaps").
 */

export const site = {
  name: "MALHOT",
  legalName: "Malhot Technologies",
  tagline: "Build · Innovate · Grow",
  promise: "Turning ideas into powerful digital solutions.",
  description:
    "MALHOT is a digital product studio building modern websites, powerful applications and smart digital solutions that help businesses grow.",
  /** Both unconfirmed — the website repo and the previous site disagreed. */
  email: "hello@malhot.com",
  phone: "+250 788 113 456",
  location: "Kigali, Rwanda",
  timezone: "CAT · GMT+2",
  socials: [
    { label: "X", href: "https://x.com", icon: "x" as const },
    { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" as const },
    { label: "Instagram", href: "https://instagram.com", icon: "instagram" as const },
    { label: "GitHub", href: "https://github.com", icon: "github" as const },
  ],
};

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
];

/**
 * Imagery.
 *
 * Stills are served from `public/images/site` rather than hotlinked. The
 * website repo pointed at images.pexels.com and at four local files it never
 * contained, so half the site rendered broken alt boxes; vendoring fixes that
 * and keeps the largest contentful paint on our own origin, which the
 * performance budget in lighthouserc.json depends on.
 *
 * Video stays remote. The three clips are 4K and run to tens of megabytes —
 * far too heavy for the repository — and `VideoBackground` already treats them
 * as a desktop-only enhancement loaded after the poster, so a slow fetch costs
 * nothing that is on the critical path.
 */
export const media = {
  heroVideo: "https://videos.pexels.com/video-files/34645139/14683903_3840_2160_30fps.mp4",
  heroPoster: "/images/site/hero-poster.jpg",
  gridVideo: "https://videos.pexels.com/video-files/28561463/12421439_3840_2160_30fps.mp4",
  gridPoster: "/images/site/grid-poster.jpg",
  flowVideo: "https://videos.pexels.com/video-files/34127955/14471459_3840_2160_30fps.mp4",
  flowPoster: "/images/site/flow-poster.jpg",
  studio: "/images/site/studio.jpg",
  desk: "/images/site/desk.jpg",
  pair: "/images/site/pair.jpg",
  focus: "/images/site/focus.jpg",
  team: "/images/site/team.jpg",
  night: "/images/site/night.jpg",
};

export type IconKey = "code" | "mobile" | "design" | "brand" | "growth" | "consulting";

export type Service = {
  slug: string;
  title: string;
  short: string;
  description: string;
  icon: IconKey;
  bullets: string[];
  image: string;
  metric: string;
  /** The metric is a marketing claim nobody has sourced yet. */
  unverified?: boolean;
};

export const services: Service[] = [
  {
    slug: "web-development",
    title: "Web Development",
    short: "Modern, fast and responsive websites and web applications.",
    description:
      "Production-grade web platforms engineered for speed, scale and search. From marketing sites to complex dashboards, we ship interfaces that load instantly and stay maintainable.",
    icon: "code",
    bullets: [
      "Next.js / React architecture",
      "Headless CMS & API integrations",
      "Core Web Vitals performance budget",
      "Accessible, responsive systems",
    ],
    image: media.desk,
    metric: "0.9s median load",
    unverified: true,
  },
  {
    slug: "mobile-apps",
    title: "Mobile Apps",
    short: "Powerful mobile products for iOS and Android.",
    description:
      "Cross-platform apps with native feel — offline-first data, push notifications, secure auth and analytics baked in from day one.",
    icon: "mobile",
    bullets: [
      "React Native & Flutter builds",
      "Offline-first sync",
      "App Store & Play release support",
      "Crash and usage analytics",
    ],
    image: media.night,
    metric: "4.8★ avg rating",
    unverified: true,
  },
  {
    slug: "ui-ux-design",
    title: "UI/UX Design",
    short: "Beautiful, user-friendly design that converts.",
    description:
      "Research-led product design. We map the journey, prototype the hard parts and hand over a living design system your team can build on.",
    icon: "design",
    bullets: [
      "Discovery & journey mapping",
      "High-fidelity prototypes",
      "Design systems in Figma",
      "Usability testing rounds",
    ],
    image: media.pair,
    metric: "+38% conversion",
    unverified: true,
  },
  {
    slug: "branding",
    title: "Branding",
    short: "Build a strong brand identity that stands out.",
    description:
      "Identity work that survives contact with the real world — logo systems, typography, motion language and guidelines applied everywhere.",
    icon: "brand",
    bullets: [
      "Logo & identity systems",
      "Brand voice and messaging",
      "Motion & sound direction",
      "Brand guideline handbook",
    ],
    image: media.team,
    metric: "Full identity kit",
  },
  {
    slug: "digital-marketing",
    title: "Digital Marketing",
    short: "Grow your reach and boost your business.",
    description:
      "Performance marketing wired directly to your product analytics, so every campaign is measured against real revenue and retention.",
    icon: "growth",
    bullets: ["SEO & content engines", "Paid social & search", "Lifecycle email automation", "Attribution dashboards"],
    image: media.focus,
    metric: "3.2x ROAS",
    unverified: true,
  },
  {
    slug: "it-consulting",
    title: "IT Consulting",
    short: "Expert advice for your technology journey.",
    description:
      "Architecture reviews, cloud strategy and team enablement. We help you choose the boring technology that will still be running in five years.",
    icon: "consulting",
    bullets: [
      "Technical due diligence",
      "Cloud & DevOps strategy",
      "Security & compliance reviews",
      "Team training & enablement",
    ],
    image: media.night,
    metric: "24/7 support",
  },
];

export type Project = {
  slug: string;
  title: string;
  category: "Web" | "Mobile" | "Design" | "Marketing";
  kind: string;
  year: string;
  client: string;
  summary: string;
  overview: string;
  image: string;
  cover: string;
  stack: string[];
  features: string[];
  results: { label: string; value: string }[];
  liveUrl: string;
  repoUrl: string;
  /** Client name and results came across unsourced — confirm before launch. */
  unverified?: boolean;
};

export const projects: Project[] = [
  {
    slug: "nexus-circle-pulse",
    title: "Nexus Circle Pulse",
    category: "Mobile",
    kind: "Full-stack social productivity app",
    year: "2025",
    client: "Nexus Circle",
    summary: "A life-organization and social app with AI-powered productivity, study and timetable management.",
    overview:
      "Nexus Circle Pulse is a comprehensive platform designed to help users organize their life, connect with friends, manage tasks and study schedules, explore places and more — all in one app. We designed the product end to end, then built the mobile client, real-time API and admin console.",
    image: media.night,
    cover: media.night,
    stack: ["React Native", "Node.js", "MongoDB", "Tailwind", "OpenAI"],
    features: [
      "User accounts & secure authentication",
      "AI task & timetable organisation",
      "Social layer: friends, follows, messages",
      "Places to go & map integration",
      "Beautiful UI with smooth animations",
    ],
    results: [
      { label: "Active users", value: "12k+" },
      { label: "Retention (D30)", value: "46%" },
      { label: "Store rating", value: "4.8★" },
    ],
    liveUrl: "https://malhot.com",
    repoUrl: "https://github.com",
    unverified: true,
  },
  {
    slug: "smart-finance-tracker",
    title: "Smart Finance Tracker",
    category: "Web",
    kind: "Personal finance web application",
    year: "2025",
    client: "Umoja Finance",
    summary: "Budgeting, forecasting and spending intelligence in one calm, fast dashboard.",
    overview:
      "A finance workspace that turns messy transaction data into decisions. We built the ingestion pipeline, categorisation engine and a dashboard that stays readable even with years of history loaded.",
    image: media.desk,
    cover: media.desk,
    stack: ["Next.js", "PostgreSQL", "Drizzle", "Recharts", "Stripe"],
    features: [
      "Automatic transaction categorisation",
      "Budget envelopes & alerts",
      "Cashflow forecasting",
      "Multi-currency support",
      "Exportable financial reports",
    ],
    results: [
      { label: "Data processed", value: "9.4M rows" },
      { label: "Dashboard load", value: "0.8s" },
      { label: "Churn drop", value: "-23%" },
    ],
    liveUrl: "https://malhot.com",
    repoUrl: "https://github.com",
    unverified: true,
  },
  {
    slug: "agri-connect",
    title: "AGRI CONNECT",
    category: "Web",
    kind: "Marketplace for farmers & buyers",
    year: "2024",
    client: "AgriConnect Rwanda",
    summary: "Connecting cooperatives directly with buyers, logistics and fair market pricing.",
    overview:
      "A marketplace and logistics platform for agricultural cooperatives. Built offline-tolerant so field agents can register harvests with poor connectivity, then sync when they are back on network.",
    image: media.pair,
    cover: media.pair,
    stack: ["Next.js", "PostgreSQL", "PWA", "Mapbox", "Twilio"],
    features: [
      "Cooperative & farmer registry",
      "Live produce pricing board",
      "Offline-first field data capture",
      "SMS notifications for buyers",
      "Logistics & delivery tracking",
    ],
    results: [
      { label: "Cooperatives", value: "180+" },
      { label: "Farmer income", value: "+31%" },
      { label: "Offline sync", value: "99.6%" },
    ],
    liveUrl: "https://malhot.com",
    repoUrl: "https://github.com",
    unverified: true,
  },
  {
    slug: "commerce-platform",
    title: "E-Commerce Platform",
    category: "Web",
    kind: "Headless commerce build",
    year: "2024",
    client: "Kigali Threads",
    summary: "A headless storefront with instant search, local payments and a merchandising studio.",
    overview:
      "We replatformed a growing retail brand onto a headless stack, cutting page weight by 62% and giving the merchandising team full control of the homepage without touching code.",
    image: media.studio,
    cover: media.studio,
    stack: ["Next.js", "Medusa", "Algolia", "MoMo Pay", "Vercel"],
    features: [
      "Instant search & faceted filtering",
      "Mobile Money + card checkout",
      "Merchandising studio for the team",
      "Inventory sync with warehouse",
      "Abandoned cart automation",
    ],
    results: [
      { label: "Revenue", value: "+54%" },
      { label: "Page weight", value: "-62%" },
      { label: "Checkout time", value: "41s" },
    ],
    liveUrl: "https://malhot.com",
    repoUrl: "https://github.com",
    unverified: true,
  },
  {
    slug: "student-manager",
    title: "Student Manager",
    category: "Design",
    kind: "School operations suite",
    year: "2024",
    client: "Horizon Academy",
    summary: "Attendance, grading, fees and parent communication in one operations suite.",
    overview:
      "A full operations product for schools. The design challenge was density: administrators needed hundreds of data points on screen without the interface becoming hostile.",
    image: media.focus,
    cover: media.focus,
    stack: ["Figma", "React", "Design System", "Supabase"],
    features: [
      "Attendance & grading workflows",
      "Fees and invoicing",
      "Parent portal & messaging",
      "Role-based permissions",
      "Printable report cards",
    ],
    results: [
      { label: "Admin time saved", value: "11h/week" },
      { label: "Components", value: "140+" },
      { label: "Schools live", value: "9" },
    ],
    liveUrl: "https://malhot.com",
    repoUrl: "https://github.com",
    unverified: true,
  },
  {
    slug: "rwanda-tourism",
    title: "Rwanda Tourism",
    category: "Marketing",
    kind: "Destination campaign site",
    year: "2023",
    client: "Visit Rwanda Collective",
    summary: "A cinematic destination experience with scroll-driven storytelling and booking flows.",
    overview:
      "A campaign platform built around full-bleed media and scroll storytelling, with itinerary builders and partner booking handoff.",
    image: media.team,
    cover: media.team,
    stack: ["Next.js", "GSAP", "Sanity", "Cloudinary"],
    features: [
      "Scroll-driven story chapters",
      "Itinerary builder",
      "Partner booking handoff",
      "Multilingual content",
      "Campaign analytics",
    ],
    results: [
      { label: "Session time", value: "4m 12s" },
      { label: "Leads", value: "7.3k" },
      { label: "Bounce rate", value: "-29%" },
    ],
    liveUrl: "https://malhot.com",
    repoUrl: "https://github.com",
    unverified: true,
  },
];

/** Headline numbers. Unsourced — see content/README.md before launch. */
export const stats = [
  { value: 50, suffix: "+", label: "Projects delivered" },
  { value: 30, suffix: "+", label: "Happy clients" },
  { value: 3, suffix: "+", label: "Years of excellence" },
  { value: 98, suffix: "%", label: "Client retention" },
];

export const processSteps = [
  {
    index: "01",
    title: "Discover",
    copy: "We pressure-test the idea, map the users and agree on what success actually looks like before a single pixel moves.",
    image: media.pair,
  },
  {
    index: "02",
    title: "Design",
    copy: "Journeys, prototypes and a design system. You see and click the product long before it is engineered.",
    image: media.studio,
  },
  {
    index: "03",
    title: "Build",
    copy: "Weekly shipping cadence, visible progress, clean architecture and tests where they matter.",
    image: media.desk,
  },
  {
    index: "04",
    title: "Grow",
    copy: "Launch is the start. We measure, iterate and scale the product alongside your business.",
    image: media.focus,
  },
];

export const timeline = [
  {
    year: "2022",
    title: "MALHOT is founded",
    copy: "Three engineers in Kigali with one rule: ship work we would put our name on.",
  },
  {
    year: "2023",
    title: "First enterprise partner",
    copy: "We delivered a nationwide campaign platform and grew into a full product team.",
  },
  {
    year: "2024",
    title: "Product studio",
    copy: "Design, engineering and growth merged into a single delivery model.",
  },
  {
    year: "2025",
    title: "50+ products shipped",
    copy: "Serving clients across East Africa, Europe and North America.",
  },
];

/**
 * Quotes attributed to named people at named companies.
 *
 * These are the highest-risk content on the site: a testimonial nobody said is
 * a statement about a real person. They are carried over unchanged because the
 * design depends on the section, and flagged so they cannot ship as fact by
 * accident. Replace with real, permissioned quotes or remove the section.
 */
export const testimonials = [
  {
    quote:
      "MALHOT rebuilt our platform in eleven weeks. It is faster, calmer and our team finally enjoys using it. The communication was flawless.",
    name: "Aline Uwase",
    role: "COO, Umoja Finance",
    unverified: true,
  },
  {
    quote:
      "They treat design and engineering as one craft. What they shipped looked exactly like the prototype and performed better than we expected.",
    name: "Daniel Mugisha",
    role: "Founder, Nexus Circle",
    unverified: true,
  },
  {
    quote:
      "The most senior team we have worked with. They challenged our assumptions early and saved us two quarters of wasted build.",
    name: "Sarah Kimani",
    role: "Product Lead, AgriConnect",
    unverified: true,
  },
];

export const capabilities = [
  "Product Strategy",
  "Web Platforms",
  "Mobile Apps",
  "Design Systems",
  "AI Integration",
  "Cloud & DevOps",
  "Brand Identity",
  "Growth Engineering",
];

/* ----------------------------- Start a project ---------------------------- */

export const needOptions = [
  {
    value: "new-product",
    label: "Build a new product",
    hint: "From idea to launch with a full product team.",
  },
  {
    value: "redesign",
    label: "Redesign something existing",
    hint: "Modernise the experience, keep the business logic.",
  },
  {
    value: "scale",
    label: "Scale & optimise",
    hint: "Performance, architecture and growth engineering.",
  },
  {
    value: "advisory",
    label: "Advisory & consulting",
    hint: "Strategy, audits and team enablement.",
  },
];

export const typeOptions = [
  { value: "website", label: "Website", hint: "Business, portfolio, e-commerce", icon: "code" as IconKey },
  { value: "mobile-app", label: "Mobile App", hint: "iOS, Android, cross-platform", icon: "mobile" as IconKey },
  { value: "ui-ux", label: "UI/UX Design", hint: "Design system, wireframes", icon: "design" as IconKey },
  { value: "branding", label: "Branding", hint: "Identity, guidelines, motion", icon: "brand" as IconKey },
  { value: "marketing", label: "Digital Marketing", hint: "SEO, paid, lifecycle", icon: "growth" as IconKey },
  { value: "other", label: "Something else", hint: "Tell us what you have in mind", icon: "consulting" as IconKey },
];

/**
 * Budget bands.
 *
 * The values are the OS's `BUDGET_RANGES` (features/inquiries/schemas.ts), not
 * the website repo's, because a brief submitted here becomes an inquiry row and
 * the Zod enum on the action rejects anything else. Change them in one place
 * and both ends move together.
 */
export const budgetOptions = [
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-15k", label: "$5,000 – $15,000" },
  { value: "15k-50k", label: "$15,000 – $50,000" },
  { value: "over-50k", label: "$50,000+" },
  { value: "unsure", label: "Not sure yet" },
];

export const timelineOptions = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3m", label: "1 – 3 months" },
  { value: "3-6m", label: "3 – 6 months" },
  { value: "exploring", label: "Still exploring" },
];
