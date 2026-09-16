"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { markInquiryHandled } from "@/features/inquiries/actions";

export function MarkHandledButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await markInquiryHandled(id);
      if (result.ok) toast.success("Marked as handled");
      else toast.error(result.error.message);
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handle} disabled={pending} aria-busy={pending}>
      <Check aria-hidden="true" /> Mark handled
    </Button>
  );
}
