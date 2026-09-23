import { UserAvatar } from "@/components/os/user-menu.client";
import { cn } from "@/lib/utils";

export type AvatarPerson = { userId: string; fullName: string; avatarUrl: string | null };

/**
 * Who is on this, at a glance.
 *
 * Overlapped avatars rather than a list of names: the question a card answers
 * is "is my team on this", which a face answers faster than reading. Names stay
 * reachable through `title` and the screen-reader list, so nothing is only
 * available to people who can tell avatars apart.
 *
 * Past `max`, the remainder collapses into a +N chip. Showing eleven avatars in
 * a card is not more informative than showing four and a number — it is just
 * narrower avatars.
 */
export function AvatarGroup({
  people,
  max = 4,
  className,
}: {
  people: readonly AvatarPerson[];
  max?: number;
  className?: string;
}) {
  if (people.length === 0) {
    return <span className={cn("text-[13px] text-fg-subtle", className)}>Nobody assigned</span>;
  }

  const shown = people.slice(0, max);
  const extra = people.length - shown.length;

  return (
    <div className={cn("flex items-center", className)}>
      <ul className="flex items-center -space-x-2">
        {shown.map((person) => (
          <li key={person.userId} title={person.fullName}>
            <UserAvatar name={person.fullName} avatarUrl={person.avatarUrl} className="size-7 ring-2 ring-surface" />
          </li>
        ))}
        {extra > 0 ? (
          <li
            title={people
              .slice(max)
              .map((person) => person.fullName)
              .join(", ")}
            className="flex size-7 items-center justify-center rounded-full bg-bg-subtle text-[11px] font-medium text-fg-muted ring-2 ring-surface"
          >
            +{extra}
          </li>
        ) : null}
      </ul>
      <span className="sr-only">
        {people.length === 1 ? "1 person: " : `${people.length} people: `}
        {people.map((person) => person.fullName).join(", ")}
      </span>
    </div>
  );
}
