import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Turns a typed client name into a client row, creating one if the name is new.
 *
 * Picking a client used to require the client to exist already, which puts the
 * setup in the wrong order: the job is the thing you know about, the client
 * record is bookkeeping that follows. Here, typing a new name and choosing an
 * existing one are the same gesture.
 *
 * Matching is case-insensitive and whitespace-trimmed so "Kivu Freight",
 * "kivu freight" and "Kivu Freight " are one client rather than three. The
 * stored spelling is whatever the first person typed; a later caller matching
 * it does not overwrite their capitalisation.
 */
export type ClientResolution = { ok: true; clientId: string | null } | { ok: false; message: string };

export async function resolveClientByName(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  rawName: string | null,
): Promise<ClientResolution> {
  const name = rawName?.trim() ?? "";
  if (name.length === 0) return { ok: true, clientId: null };

  const existing = await findByName(supabase, organizationId, name);
  if (existing.error) return { ok: false, message: "Could not look up that client." };
  if (existing.id) return { ok: true, clientId: existing.id };

  const inserted = await supabase
    .from("clients")
    .insert({ organization_id: organizationId, name, created_by: userId })
    .select("id")
    .single();

  if (!inserted.error) return { ok: true, clientId: inserted.data.id };

  /*
   * 23505 on (organization_id, name): someone created the same client between
   * the lookup and the insert. That is the outcome we wanted, so read theirs
   * rather than failing a job creation over a race the person cannot see.
   */
  if (inserted.error.code === "23505") {
    const raced = await findByName(supabase, organizationId, name);
    if (raced.id) return { ok: true, clientId: raced.id };
  }

  return { ok: false, message: "Could not add that client." };
}

async function findByName(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  name: string,
): Promise<{ id: string | null; error: boolean }> {
  // ilike with the name escaped: a client called "100% Cotton" must not turn
  // its % into a wildcard and match something else.
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", escapeLike(name))
    .limit(1);

  if (error) return { id: null, error: true };
  return { id: data[0]?.id ?? null, error: false };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
