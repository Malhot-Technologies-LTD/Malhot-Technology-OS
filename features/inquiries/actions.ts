"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer } from "@/lib/auth/context";
import { requireServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createInquiry } from "@/lib/supabase/elevated/inquiries";
import { createClient } from "@/lib/supabase/server";

import { hashClientIp } from "./lib/ip-hash";
import { briefReference, composeBriefMessage, inquirySchema, projectBriefSchema } from "./schemas";

/** W8 step 1: website contact form → inquiries. Anonymous; honeypot + per-IP rate limit. */
export const submitInquiry = withAction("inquiries.submit", async (input: unknown): Promise<ActionResult> => {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  // Bots fill the hidden field; pretend success so they learn nothing.
  if (parsed.data.website) {
    logger.info("inquiry.honeypot");
    return ok(undefined);
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip");
  const ipHash = ip ? await hashClientIp(ip, requireServerEnv("INQUIRY_IP_SALT")) : null;

  const result = await createInquiry({
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company || null,
    message: parsed.data.message,
    budgetRange: parsed.data.budgetRange ?? null,
    sourcePath: parsed.data.sourcePath ?? null,
    ipHash,
  });
  if (!result.ok) {
    if (result.error.code === "rate_limited")
      return fail(
        "rate_limited",
        "Too many messages from this network in the last hour. Try again later or email us directly.",
      );
    return fail("unexpected", "Your message could not be sent. Try again, or email us directly.");
  }

  logger.info("inquiry.received", { inquiryId: result.id });
  return ok(undefined);
});

/**
 * Website /start wizard → inquiries.
 *
 * A brief is an enquiry with more structure, so it takes the same road: the
 * same honeypot, the same per-IP rate limit, the same admin inbox. The ten
 * answers are flattened into the message by `composeBriefMessage`; see the note
 * there for why this is not its own table.
 *
 * Anonymous, like the contact form. A signed-in visitor filling this in is
 * still a prospect writing to the company, and requiring a session would mean
 * the page could not be prerendered.
 */
export const submitProjectBrief = withAction(
  "inquiries.submitBrief",
  async (input: unknown): Promise<ActionResult<{ reference: string }>> => {
    const parsed = projectBriefSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);

    if (parsed.data.website) {
      logger.info("brief.honeypot");
      // A plausible-looking reference, so a bot cannot use the response shape
      // to tell that it was caught.
      return ok({ reference: briefReference(crypto.randomUUID()) });
    }

    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip");
    const ipHash = ip ? await hashClientIp(ip, requireServerEnv("INQUIRY_IP_SALT")) : null;

    const result = await createInquiry({
      name: parsed.data.contactName,
      email: parsed.data.contactEmail,
      company: parsed.data.company || null,
      message: composeBriefMessage(parsed.data),
      budgetRange: parsed.data.budget,
      sourcePath: "/start",
      ipHash,
    });
    if (!result.ok) {
      if (result.error.code === "rate_limited")
        return fail(
          "rate_limited",
          "Too many submissions from this network in the last hour. Try again later or email us directly.",
        );
      return fail("unexpected", "Your brief could not be submitted. Try again, or email us directly.");
    }

    logger.info("brief.received", { inquiryId: result.id });
    return ok({ reference: briefReference(result.id) });
  },
);

/** Settings → Enquiries: admins mark an enquiry handled (RLS restricts the update to admins). */
export const markInquiryHandled = withAction("inquiries.markHandled", async (input: unknown): Promise<ActionResult> => {
  const id = typeof input === "string" && /^[0-9a-f-]{36}$/.test(input) ? input : null;
  if (!id) return fail("validation", "Unknown enquiry.");
  const viewer = await requireViewer();
  if (viewer.orgRole === "member") return fail("forbidden", "Only organisation admins can manage enquiries.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ handled_at: new Date().toISOString(), handled_by: viewer.userId })
    .eq("id", id)
    .is("handled_at", null)
    .select("id");
  if (error) return fail("unexpected", "The enquiry could not be updated. Try again.");
  if (!data || data.length === 0) return fail("not_found", "That enquiry was already handled or does not exist.");

  revalidatePath("/os/settings/inquiries");
  return ok(undefined);
});
