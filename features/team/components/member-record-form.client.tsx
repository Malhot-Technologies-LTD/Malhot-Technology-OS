"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { formatDate } from "@/components/os/data-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveMemberRecord } from "@/features/team/actions";

import type { MemberRecord } from "../queries";
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABEL, type EmploymentType } from "../schemas";

const NONE = "__none";

/**
 * Employment details. Admins edit; the person sees their own, read-only.
 * Pay is deliberately not a field here: it belongs in the signed contract.
 */
export function MemberRecordPanel({
  userId,
  record,
  canEdit,
  colleagues,
}: {
  userId: string;
  record: MemberRecord | null;
  canEdit: boolean;
  /** For "Reports to": everyone else in the organisation. */
  colleagues: readonly { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const managerName = colleagues.find((person) => person.id === record?.reports_to)?.name ?? null;

  if (!editing) {
    const rows: [string, string | null][] = [
      ["Position", record?.position ?? null],
      ["Department", record?.department ?? null],
      ["Employment", record?.employment_type ? EMPLOYMENT_TYPE_LABEL[record.employment_type] : null],
      ["Started", record?.start_date ? formatDate(record.start_date) : null],
      ["Contract ends", record?.end_date ? formatDate(record.end_date) : null],
      ["Reports to", managerName],
      ["Work phone", record?.work_phone ?? null],
      ["Location", record?.work_location ?? null],
      ["Emergency contact", record?.emergency_contact ?? null],
    ];
    return (
      <div className="flex flex-col gap-4">
        {record ? (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs text-fg-subtle">{label}</dt>
                <dd className={value ? "text-sm break-words" : "text-sm text-fg-subtle"}>{value ?? "—"}</dd>
              </div>
            ))}
            {record.notes ? (
              <div className="flex flex-col gap-0.5 sm:col-span-2 xl:col-span-3">
                <dt className="text-xs text-fg-subtle">Notes</dt>
                <dd className="text-sm whitespace-pre-line">{record.notes}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-fg-muted">
            {canEdit ? "No employment details yet." : "Your employment details have not been filled in yet."}
          </p>
        )}
        {canEdit ? (
          <Button variant="outline" className="w-fit" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> {record ? "Edit details" : "Add details"}
          </Button>
        ) : null}
      </div>
    );
  }

  return <RecordForm userId={userId} record={record} colleagues={colleagues} onDone={() => setEditing(false)} />;
}

function RecordForm({
  userId,
  record,
  colleagues,
  onDone,
}: {
  userId: string;
  record: MemberRecord | null;
  colleagues: readonly { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [values, setValues] = useState({
    position: record?.position ?? "",
    department: record?.department ?? "",
    employmentType: (record?.employment_type ?? "") as EmploymentType | "",
    startDate: record?.start_date ?? "",
    endDate: record?.end_date ?? "",
    reportsTo: record?.reports_to ?? "",
    workPhone: record?.work_phone ?? "",
    workLocation: record?.work_location ?? "",
    emergencyContact: record?.emergency_contact ?? "",
    notes: record?.notes ?? "",
  });
  const set = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveMemberRecord({ userId, ...values });
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        toast.error(result.error.message);
        return;
      }
      toast.success("Employment details saved");
      onDone();
      router.refresh();
    });
  }

  const text = (key: keyof typeof values, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <Input
        value={values[key]}
        aria-invalid={Boolean(errors[key])}
        onChange={(event) => set(key)(event.target.value)}
        {...props}
      />
      {errors[key]?.[0] ? <span className="text-xs text-status-danger-fg">{errors[key][0]}</span> : null}
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {text("position", "Position", { maxLength: 120, placeholder: "e.g. Frontend Developer" })}
        {text("department", "Department", { maxLength: 80, placeholder: "e.g. Engineering" })}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="employment-type" className="text-sm font-medium">
            Employment
          </label>
          <Select
            value={values.employmentType || NONE}
            onValueChange={(value) => set("employmentType")(value === NONE ? "" : value)}
          >
            <SelectTrigger id="employment-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not set</SelectItem>
              {EMPLOYMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {EMPLOYMENT_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {text("startDate", "Started", { type: "date" })}
        {text("endDate", "Contract ends", { type: "date" })}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reports-to" className="text-sm font-medium">
            Reports to
          </label>
          <Select
            value={values.reportsTo || NONE}
            onValueChange={(value) => set("reportsTo")(value === NONE ? "" : value)}
          >
            <SelectTrigger id="reports-to" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Nobody</SelectItem>
              {colleagues.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.reportsTo?.[0] ? <span className="text-xs text-status-danger-fg">{errors.reportsTo[0]}</span> : null}
        </div>
        {text("workPhone", "Work phone", { maxLength: 40, inputMode: "tel" })}
        {text("workLocation", "Location", { maxLength: 120, placeholder: "e.g. Kigali office, remote" })}
        {text("emergencyContact", "Emergency contact", { maxLength: 200, placeholder: "Name, relation, phone" })}
        <label className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-3">
          <span className="text-sm font-medium">Notes</span>
          <Textarea
            rows={3}
            maxLength={4000}
            value={values.notes}
            placeholder="Visible to admins and to this person."
            onChange={(event) => set("notes")(event.target.value)}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
      </div>
    </form>
  );
}
