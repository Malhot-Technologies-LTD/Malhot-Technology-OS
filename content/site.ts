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
    "MALHOT is a software company in Kigali, Rwanda. We design, build and ship websites, web and mobile applications and the systems behind them.",
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

/**
 * Primary navigation. `menu` names the dropdown a top-level item opens in the
 * header (components/site/layout/Navbar.tsx). The Services and Projects menus
 * are built from `services` and `projects` below, so they cannot drift from
 * the pages; only the About menu is listed here. The footer uses the top-level
 * items alone.
 */
export type NavMenu = "about" | "services" | "projects";

export const navLinks: { label: string; href: string; menu?: NavMenu }[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about", menu: "about" },
  { label: "Services", href: "/services", menu: "services" },
  { label: "Projects", href: "/projects", menu: "projects" },
  { label: "How we work", href: "/services#process" },
  { label: "Contact", href: "/contact" },
];

export const aboutLinks = [
  { label: "About MALHOT", href: "/about", description: "Who we are and why we started", icon: "users" as const },
  {
    label: "Our values",
    href: "/about#values",
    description: "The principles behind every project",
    icon: "shield" as const,
  },
  { label: "Our journey", href: "/about#journey", description: "How the company has grown", icon: "rocket" as const },
  {
    label: "Our commitments",
    href: "/about#commitments",
    description: "What you can count on when you work with us",
    icon: "clipboard" as const,
  },
  {
    label: "Industries",
    href: "/#industries",
    description: "The sectors our software serves",
    icon: "layers" as const,
  },
];

/**
 * Photography, served from `public/images/site`.
 *
 * Free stock photos from Pexels (Pexels licence: free for commercial use, no
 * attribution required) of African teams at work, two of them in Lagos and
 * Nairobi offices. They are stand-ins: replace them with Malhot's own
 * team and office in Kigali at 1920x1280 or larger (content/README.md).
 *
 * Hero slides are chosen with the subject on the right, because the left half
 * sits under the headline and is darkened for legibility.
 *
 * There is no video. The previous design streamed three 4K clips from Pexels,
 * which set Cloudflare cookies on every visitor and put tens of megabytes
 * behind a background effect.
 */
export const media = {
  heroSlides: [
    { src: "/images/site/team-laptop.jpg", alt: "A team gathered around a laptop in an office" },
    { src: "/images/site/developer-coding.jpg", alt: "A developer writing code on a desktop and a laptop" },
    { src: "/images/site/team-standup.jpg", alt: "Four colleagues talking in a bright office" },
    { src: "/images/site/developer-focus.jpg", alt: "A developer concentrating at a laptop in a shared office" },
  ],
  presentation: {
    src: "/images/site/team-presentation.jpg",
    alt: "A team member presenting a project dashboard to colleagues",
  },
  meeting: { src: "/images/site/team-meeting.jpg", alt: "A team in a planning meeting around a table" },
};

export type IconKey = "code" | "mobile" | "design" | "brand" | "growth" | "consulting";

export type Service = {
  slug: string;
  title: string;
  short: string;
  description: string;
  icon: IconKey;
  bullets: string[];
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
  },
  {
    slug: "digital-marketing",
    title: "Digital Marketing",
    short: "Grow your reach and boost your business.",
    description:
      "Performance marketing wired directly to your product analytics, so every campaign is measured against real revenue and retention.",
    icon: "growth",
    bullets: ["SEO & content engines", "Paid social & search", "Lifecycle email automation", "Attribution dashboards"],
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

export const processSteps = [
  {
    index: "01",
    title: "Discover",
    copy: "We pressure-test the idea, map the users and agree on what success actually looks like before a single pixel moves.",
  },
  {
    index: "02",
    title: "Design",
    copy: "Journeys, prototypes and a design system. You see and click the product long before it is engineered.",
  },
  {
    index: "03",
    title: "Build",
    copy: "Weekly shipping cadence, visible progress, clean architecture and tests where they matter.",
  },
  {
    index: "04",
    title: "Grow",
    copy: "Launch is the start. We measure, iterate and scale the product alongside your business.",
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
 * Sectors. Positioning, not a client list: each one names the kind of problem
 * we build for and matches work in `projects`. It claims no client and no
 * number, so nothing here needs sourcing.
 */
export const sectors = [
  {
    title: "Finance",
    copy: "Dashboards, budgeting and reporting tools that turn transaction data into decisions.",
    icon: "finance" as const,
  },
  {
    title: "Agriculture",
    copy: "Marketplaces and field tools built to keep working on a weak connection.",
    icon: "leaf" as const,
  },
  {
    title: "Commerce",
    copy: "Online stores with local payments, inventory sync and fast checkout.",
    icon: "cart" as const,
  },
  {
    title: "Education",
    copy: "School operations: attendance, grading, fees and parent communication.",
    icon: "school" as const,
  },
];

/**
 * What every engagement leaves behind. This is true of how Malhot runs
 * projects (docs/product/project-lifecycle.md): each stage ends in a document
 * the client receives. It is the site's main proof point, so keep it in step
 * with the lifecycle if that changes.
 */
export const commitments = [
  {
    title: "One accountable team",
    copy: "Design, engineering, testing and project management under one roof. You deal with one team, not a chain of subcontractors.",
  },
  {
    title: "Progress you can see",
    copy: "Work ships in short cycles against milestones you agreed. You review real, working software along the way, not one big reveal at the end.",
  },
  {
    title: "Tested before it ships",
    copy: "Testing is a stage of its own, with test cases, results and tracked fixes. You get the report, not just our word for it.",
  },
  {
    title: "Documented handover",
    copy: "A project brief, MVP specification, delivery plan, test report and deployment report. You own the product and the knowledge behind it.",
  },
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
