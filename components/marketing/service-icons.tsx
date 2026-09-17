import { Bot, Cloud, Globe, Layers, PenTool, Server, Workflow, type LucideIcon } from "lucide-react";

/** Icon per service slug (content/services.ts stays plain data). */
const ICONS: Record<string, LucideIcon> = {
  "web-development": Globe,
  "software-systems": Layers,
  "backend-apis": Server,
  "ui-ux-design": PenTool,
  "automation-integrations": Workflow,
  "ai-assisted-systems": Bot,
  "deployment-infrastructure": Cloud,
};

export function ServiceIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] ?? Layers;
  return <Icon aria-hidden="true" className={className} />;
}
