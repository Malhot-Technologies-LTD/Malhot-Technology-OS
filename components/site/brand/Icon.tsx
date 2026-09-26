import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export type IconName =
  | "code"
  | "mobile"
  | "design"
  | "brand"
  | "growth"
  | "consulting"
  | "arrow"
  | "arrowUpRight"
  | "arrowLeft"
  | "check"
  | "close"
  | "menu"
  | "eye"
  | "eyeOff"
  | "mail"
  | "phone"
  | "pin"
  | "spark"
  | "play"
  | "chevronDown"
  | "google"
  | "x"
  | "linkedin"
  | "instagram"
  | "github"
  | "grid"
  | "layers"
  | "message"
  | "logout"
  | "user"
  | "alert"
  | "finance"
  | "leaf"
  | "cart"
  | "school"
  | "users"
  | "clipboard"
  | "shield"
  | "rocket";

const paths: Record<IconName, React.ReactNode> = {
  code: (
    <>
      <path d="m8 7-5 5 5 5" />
      <path d="m16 7 5 5-5 5" />
      <path d="M13.5 4 10.5 20" />
    </>
  ),
  mobile: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  design: (
    <>
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <path d="M12 12v9" />
      <path d="m4 7.5 8 4.5 8-4.5" />
    </>
  ),
  brand: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M3.5 12h17" />
    </>
  ),
  growth: (
    <>
      <path d="M3 17.5 9.5 11l4 4L21 7" />
      <path d="M15.5 7H21v5.5" />
    </>
  ),
  consulting: (
    <>
      <path d="M12 3.5a5 5 0 0 1 3 9v2.5H9V12.5a5 5 0 0 1 3-9Z" />
      <path d="M9.5 18.5h5" />
      <path d="M10.5 21h3" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M20 12H4" />
      <path d="m10 6-6 6 6 6" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  menu: (
    <>
      <path d="M3.5 8h17" />
      <path d="M3.5 16h11" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 6A8.7 8.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4" />
      <path d="M6.2 8.3A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3.6-.75" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  mail: (
    <>
      <rect x="2.75" y="4.75" width="18.5" height="14.5" rx="3" />
      <path d="m4 8 8 5 8-5" />
    </>
  ),
  phone: (
    <path d="M7 3.5 9.5 8 7.8 10a12 12 0 0 0 5.9 5.9L16 14.2 20.5 17v2.5a2 2 0 0 1-2.2 2C10 20.7 3.3 14 2.5 5.7A2 2 0 0 1 4.5 3.5H7Z" />
  ),
  pin: (
    <>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  spark: <path d="M12 3.2 14 9.4l6.2 2-6.2 2-2 6.2-2-6.2-6.2-2 6.2-2 2-6.2Z" />,
  play: <path d="M8 5.5 18.5 12 8 18.5v-13Z" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  google: (
    <path
      fill="currentColor"
      stroke="none"
      d="M21.35 11.1H12v3.28h5.35a4.6 4.6 0 0 1-1.99 3.01l3.21 2.49c1.88-1.73 2.96-4.29 2.96-7.33 0-.51-.05-1.01-.18-1.45ZM12 22c2.7 0 4.96-.89 6.61-2.42l-3.21-2.49c-.89.6-2.03.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13l-3.32 2.56A9.99 9.99 0 0 0 12 22Zm-5.61-9.08a6 6 0 0 1 0-3.84L3.07 6.52a10 10 0 0 0 0 8.96l3.32-2.56ZM12 5.96c1.47 0 2.79.51 3.83 1.5l2.85-2.85C16.95 2.98 14.69 2 12 2A9.99 9.99 0 0 0 3.07 6.52l3.32 2.56C7.18 6.71 9.39 5.96 12 5.96Z"
    />
  ),
  x: (
    <path
      fill="currentColor"
      stroke="none"
      d="M17.2 3h3.1l-6.8 7.8L21.5 21h-6.2l-4.4-5.7L5.8 21H2.7l7.2-8.3L2.5 3h6.3l4 5.3L17.2 3Zm-1.1 16.1h1.7L7.9 4.8H6.1l10 14.3Z"
    />
  ),
  linkedin: (
    <path
      fill="currentColor"
      stroke="none"
      d="M6.9 21H3.6V9.2h3.3V21ZM5.2 7.7a1.95 1.95 0 1 1 0-3.9 1.95 1.95 0 0 1 0 3.9ZM21 21h-3.3v-6c0-1.6-.6-2.4-1.8-2.4-1 0-1.6.7-1.9 1.3-.1.2-.1.6-.1.9V21H10.6s.05-10.3 0-11.8h3.3v1.7c.4-.7 1.2-1.8 3.1-1.8 2.3 0 4 1.5 4 4.8V21Z"
    />
  ),
  instagram: (
    <>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.1" cy="6.9" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
    />
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m3.5 12 8.5 4.5L20.5 12" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </>
  ),
  message: <path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.2-3.6A8 8 0 1 1 21 12Z" />,
  logout: (
    <>
      <path d="M15 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15" />
      <path d="M10 8 6 12l4 4" />
      <path d="M6 12h9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.4v.2" />
    </>
  ),
  finance: (
    <>
      <path d="M3 21h18" />
      <path d="M4 10h16L12 4 4 10Z" />
      <path d="M6.5 10v8M10 10v8M14 10v8M17.5 10v8" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-12 14" />
      <path d="M5 19c3-4 6-6.5 9-8" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2.2l2.3 11h10.8l2-8H6.4" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </>
  ),
  school: (
    <>
      <path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z" />
      <path d="M6.5 11.2V16c1.5 1.6 3.4 2.4 5.5 2.4s4-.8 5.5-2.4v-4.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2" />
      <path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.6c2 .6 3.2 2.3 3.5 4.9" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M8.5 11h7M8.5 15h5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  rocket: (
    <>
      <path d="M14.5 4.5c2.5-1 4.5-1 5-.5s.5 2.5-.5 5l-6 6-4-4 5.5-6.5Z" />
      <path d="m9 11-3.5.5L3.5 14l4 .5M13 15l-.5 3.5-2.5 2-.5-4" />
      <circle cx="15.5" cy="8.5" r="1.3" />
    </>
  ),
};

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  className?: string;
};

export function Icon({ name, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
