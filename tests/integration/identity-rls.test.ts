import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { admin, identityFixture } from "../fixtures/supabase";

/**
 * Row Level Security for the identity tables, one row per cell of
 * docs/database/rls-policies.md. "Denied" means: selects return nothing,
 * inserts fail with 42501, updates/deletes touch zero rows.
 */

const RLS_VIOLATION = "42501";

type Fixture = Awaited<ReturnType<typeof identityFixture>>;
let fx: Fixture;

beforeAll(async () => {
  fx = await identityFixture();
});

afterAll(async () => {
  await fx.dispose();
});

describe("organizations", () => {
  it("is visible to its members only", async () => {
    for (const role of ["owner", "admin", "member"] as const) {
      const { data } = await fx.clients[role].from("organizations").select("id");
      expect(data?.map((o) => o.id)).toEqual([fx.org.id]);
    }
    const outsider = await fx.clients.outsider.from("organizations").select("id");
    expect(outsider.data?.map((o) => o.id)).toEqual([fx.otherOrg.id]);
    const anon = await fx.clients.anon.from("organizations").select("id");
    expect(anon.data).toEqual([]);
  });

  it("is editable by admins, not members", async () => {
    const byAdmin = await fx.clients.admin
      .from("organizations")
      .update({ name: "Acme Ltd" })
      .eq("id", fx.org.id)
      .select("id");
    expect(byAdmin.data).toHaveLength(1);
    const byMember = await fx.clients.member
      .from("organizations")
      .update({ name: "Nope" })
      .eq("id", fx.org.id)
      .select("id");
    expect(byMember.data).toEqual([]);
  });

  it("cannot be created through the API by anyone (bootstrap only)", async () => {
    const { error } = await fx.clients.owner.from("organizations").insert({ name: "Rogue", slug: "rogue-org" });
    expect(error?.code).toBe(RLS_VIOLATION);
  });
});

describe("profiles", () => {
  it("are created by the auth trigger with the metadata name", async () => {
    const { data } = await admin.from("profiles").select("full_name").eq("id", fx.users.member.id).single();
    expect(data?.full_name).toBe("member");
  });

  it("are visible to people who share an organisation", async () => {
    const { data } = await fx.clients.member.from("profiles").select("id");
    const ids = new Set(data?.map((p) => p.id));
    expect(ids.has(fx.users.owner.id)).toBe(true);
    expect(ids.has(fx.users.outsider.id)).toBe(false);
  });

  it("are editable only by their owner", async () => {
    const self = await fx.clients.member
      .from("profiles")
      .update({ title: "Engineer" })
      .eq("id", fx.users.member.id)
      .select("id");
    expect(self.data).toHaveLength(1);
    const other = await fx.clients.admin
      .from("profiles")
      .update({ title: "Hacked" })
      .eq("id", fx.users.member.id)
      .select("id");
    expect(other.data).toEqual([]);
  });
});

describe("organization_members", () => {
  it("lists members to members, nothing to outsiders", async () => {
    const mine = await fx.clients.member
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", fx.org.id);
    expect(mine.data).toHaveLength(3);
    const theirs = await fx.clients.outsider
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", fx.org.id);
    expect(theirs.data).toEqual([]);
  });

  it("lets admins add and remove others, but not remove themselves", async () => {
    const insertByMember = await fx.clients.member
      .from("organization_members")
      .insert({ organization_id: fx.org.id, user_id: fx.users.outsider.id, role: "member" });
    expect(insertByMember.error?.code).toBe(RLS_VIOLATION);

    const insertByAdmin = await fx.clients.admin
      .from("organization_members")
      .insert({ organization_id: fx.org.id, user_id: fx.users.outsider.id, role: "member" })
      .select("id")
      .single();
    expect(insertByAdmin.error).toBeNull();

    const removeSelf = await fx.clients.admin
      .from("organization_members")
      .delete()
      .eq("user_id", fx.users.admin.id)
      .select("id");
    expect(removeSelf.data).toEqual([]);

    const removeOther = await fx.clients.admin
      .from("organization_members")
      .delete()
      .eq("id", insertByAdmin.data!.id)
      .select("id");
    expect(removeOther.data).toHaveLength(1);
  });

  it("keeps at least one owner (trigger)", async () => {
    const demote = await fx.clients.owner
      .from("organization_members")
      .update({ role: "admin" })
      .eq("organization_id", fx.org.id)
      .eq("user_id", fx.users.owner.id);
    expect(demote.error?.message).toContain("MALHOT:invariant");

    const remove = await admin
      .from("organization_members")
      .delete()
      .eq("organization_id", fx.org.id)
      .eq("user_id", fx.users.owner.id);
    expect(remove.error?.message).toContain("MALHOT:invariant");
  });
});

describe("invitations", () => {
  const invitation = (invitedBy: string) => ({
    email: "new@test.local",
    org_role: "member" as const,
    token_hash: crypto.randomUUID(),
    invited_by: invitedBy,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  });

  it("are managed by admins only", async () => {
    const byMember = await fx.clients.member
      .from("invitations")
      .insert({ organization_id: fx.org.id, ...invitation(fx.users.member.id) });
    expect(byMember.error?.code).toBe(RLS_VIOLATION);

    const forgedInviter = await fx.clients.admin
      .from("invitations")
      .insert({ organization_id: fx.org.id, ...invitation(fx.users.owner.id) });
    expect(forgedInviter.error?.code).toBe(RLS_VIOLATION);

    const byAdmin = await fx.clients.admin
      .from("invitations")
      .insert({ organization_id: fx.org.id, ...invitation(fx.users.admin.id) })
      .select("id")
      .single();
    expect(byAdmin.error).toBeNull();

    const memberView = await fx.clients.member.from("invitations").select("id");
    expect(memberView.data).toEqual([]);
    const adminView = await fx.clients.admin.from("invitations").select("id");
    expect(adminView.data?.map((i) => i.id)).toContain(byAdmin.data!.id);

    const duplicate = await fx.clients.admin
      .from("invitations")
      .insert({ organization_id: fx.org.id, ...invitation(fx.users.admin.id) });
    expect(duplicate.error?.code).toBe("23505");
  });
});

describe("clients", () => {
  it("can be created by members as themselves and deleted by admins only", async () => {
    const forged = await fx.clients.member
      .from("clients")
      .insert({ organization_id: fx.org.id, name: "Forged", created_by: fx.users.owner.id });
    expect(forged.error?.code).toBe(RLS_VIOLATION);

    const created = await fx.clients.member
      .from("clients")
      .insert({ organization_id: fx.org.id, name: "Globex", created_by: fx.users.member.id })
      .select("id")
      .single();
    expect(created.error).toBeNull();

    const outsiderView = await fx.clients.outsider.from("clients").select("id").eq("id", created.data!.id);
    expect(outsiderView.data).toEqual([]);

    const deleteByMember = await fx.clients.member.from("clients").delete().eq("id", created.data!.id).select("id");
    expect(deleteByMember.data).toEqual([]);
    const deleteByAdmin = await fx.clients.admin.from("clients").delete().eq("id", created.data!.id).select("id");
    expect(deleteByAdmin.data).toHaveLength(1);
  });
});

describe("authorisation helpers", () => {
  it("are not callable without signing in", async () => {
    const { error } = await fx.clients.anon.rpc("is_org_member", { org: fx.org.id });
    expect(error?.code).toBe(RLS_VIOLATION);
  });

  it("answer for the signed-in user only", async () => {
    const mine = await fx.clients.member.rpc("is_org_member", { org: fx.org.id });
    expect(mine.data).toBe(true);
    const theirs = await fx.clients.outsider.rpc("is_org_admin", { org: fx.org.id });
    expect(theirs.data).toBe(false);
  });
});
