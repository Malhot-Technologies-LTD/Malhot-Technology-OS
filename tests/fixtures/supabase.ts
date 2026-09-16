import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { OrgRole } from "@/types/domain";

/**
 * Fixtures for integration tests against a LOCAL Supabase stack
 * (docs/engineering/testing-strategy.md#fixtures). Never point these at the
 * hosted project: the tests create and delete users and organisations.
 *
 * Environment: the names printed by `npx supabase status -o env` (API_URL, ANON_KEY /
 * PUBLISHABLE_KEY, SERVICE_ROLE_KEY / SECRET_KEY) or their SUPABASE_-prefixed equivalents.
 */

export type Client = SupabaseClient<Database>;

const env = (...names: string[]) => names.map((n) => process.env[n]).find((v) => v && v.length > 0) ?? "";

const url = env("SUPABASE_URL", "API_URL") || "http://127.0.0.1:54321";
const anonKey = env("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "PUBLISHABLE_KEY", "ANON_KEY");
const serviceKey = env("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SECRET_KEY", "SERVICE_ROLE_KEY");

if (!anonKey || !serviceKey) {
  throw new Error(
    "Integration tests need the local anon and service-role keys (eval \"$(npx supabase status -o env | sed 's/^/export /')\").",
  );
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  throw new Error(`Refusing to run integration tests against a non-local Supabase URL: ${url}`);
}

const noSession = { auth: { autoRefreshToken: false, persistSession: false } } as const;

export const admin: Client = createClient<Database>(url, serviceKey, noSession);

/** Unauthenticated client (the `anon` role). */
export function asAnonymous(): Client {
  return createClient<Database>(url, anonKey, noSession);
}

export type TestUser = { id: string; email: string; password: string };

const PASSWORD = "Integration-Test-Password-123";

export async function createUser(label: string, fullName = label): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID().slice(0, 8)}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`createUser(${label}): ${error.message}`);
  return { id: data.user.id, email, password: PASSWORD };
}

/** A client running as this user, so RLS applies exactly as in the app. */
export async function asUser(user: TestUser): Promise<Client> {
  const client = createClient<Database>(url, anonKey, noSession);
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`asUser(${user.email}): ${error.message}`);
  return client;
}

export async function createOrganization(name: string): Promise<{ id: string; slug: string }> {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await admin.from("organizations").insert({ name, slug }).select("id, slug").single();
  if (error) throw new Error(`createOrganization: ${error.message}`);
  return data;
}

export async function addMember(organizationId: string, user: TestUser, role: OrgRole): Promise<string> {
  const { data, error } = await admin
    .from("organization_members")
    .insert({ organization_id: organizationId, user_id: user.id, role })
    .select("id")
    .single();
  if (error) throw new Error(`addMember: ${error.message}`);
  return data.id;
}

/** Deletes organisations (cascade) and users created by a test file. */
export async function cleanup(params: { organizationIds: string[]; users: TestUser[] }): Promise<void> {
  if (params.organizationIds.length > 0) {
    const { error } = await admin.from("organizations").delete().in("id", params.organizationIds);
    if (error) throw new Error(`cleanup organizations: ${error.message}`);
  }
  for (const user of params.users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`cleanup user ${user.email}: ${error.message}`);
  }
}

/** Standard role set for the identity tables: an org with owner/admin/member, an outsider in another org. */
export async function identityFixture() {
  const [owner, adminUser, member, outsider] = await Promise.all([
    createUser("owner"),
    createUser("admin"),
    createUser("member"),
    createUser("outsider"),
  ]);
  const org = await createOrganization("Acme");
  const otherOrg = await createOrganization("Other");
  await addMember(org.id, owner, "owner");
  await addMember(org.id, adminUser, "admin");
  await addMember(org.id, member, "member");
  await addMember(otherOrg.id, outsider, "owner");

  const [asOwner, asAdmin, asMember, asOutsider] = await Promise.all([
    asUser(owner),
    asUser(adminUser),
    asUser(member),
    asUser(outsider),
  ]);

  return {
    org,
    otherOrg,
    users: { owner, admin: adminUser, member, outsider },
    clients: { owner: asOwner, admin: asAdmin, member: asMember, outsider: asOutsider, anon: asAnonymous() },
    async dispose() {
      await cleanup({ organizationIds: [org.id, otherOrg.id], users: [owner, adminUser, member, outsider] });
    },
  };
}
