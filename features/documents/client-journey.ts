import { findTemplate, type DocumentTemplate } from "./templates";

/**
 * The templates used with a client, in the order a client meets them: from the
 * first conversation to support after launch. A view across the categories —
 * each template still lives in its own category too.
 */
const STAGES: readonly { stage: string; summary: string; keys: readonly string[] }[] = [
  {
    stage: "Win the work",
    summary: "First meetings to a priced offer",
    keys: ["company_profile", "discovery_report", "client_requirements", "project_proposal", "quotation"],
  },
  {
    stage: "Agree terms",
    summary: "What we do, for how much, on what terms",
    keys: [
      "nda",
      "master_services_agreement",
      "statement_of_work",
      "software_development_agreement",
      "service_agreement",
      "data_processing_agreement",
      "service_level_agreement",
    ],
  },
  {
    stage: "Kick off and build",
    summary: "Running the project with the client",
    keys: ["client_onboarding", "project_kickoff", "meeting_minutes", "project_status_report", "change_request"],
  },
  {
    stage: "Deliver",
    summary: "Testing, sign-off and handover",
    keys: ["uat_acceptance", "release_notes", "software_acceptance_certificate", "handover_certificate"],
  },
  {
    stage: "Get paid",
    summary: "Billing, reminders and receipts",
    keys: ["proforma_invoice", "invoice", "payment_request", "payment_reminder", "payment_receipt", "credit_note"],
  },
  {
    stage: "Support",
    summary: "After launch",
    keys: ["maintenance_support_agreement", "support_request", "incident_report", "maintenance_report"],
  },
];

export type ClientStage = { stage: string; summary: string; templates: readonly DocumentTemplate[] };

export const CLIENT_JOURNEY: readonly ClientStage[] = STAGES.map(({ stage, summary, keys }) => ({
  stage,
  summary,
  templates: keys.map((key) => {
    const template = findTemplate(key);
    if (!template) throw new Error(`Client journey names an unknown template: ${key}`);
    return template;
  }),
}));
