export { cn } from "cn";

/**
 * Good-enough email shape, for telling someone they have mistyped their address
 * before a round trip rather than after one.
 *
 * Deliberately permissive. The authority on whether an address is acceptable is
 * the Zod schema on the Server Action, and the authority on whether it is real
 * is whether the reply arrives — no regex settles either. This one only catches
 * the obvious: no @, nothing before it, nothing after it, no dot in the domain.
 */
export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
