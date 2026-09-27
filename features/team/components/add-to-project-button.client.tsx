"use client";

import { FolderPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AssignToProjectDialog,
  type AssignableProject,
  type AssignTarget,
} from "@/features/organization/components/assign-to-project-dialog.client";

/** The Team directory's "Add to project", on a person's own page. */
export function AddToProjectButton({
  person,
  projects,
}: {
  person: AssignTarget;
  projects: readonly AssignableProject[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FolderPlus aria-hidden="true" /> Add to project
      </Button>
      <AssignToProjectDialog person={open ? person : null} projects={projects} onClose={() => setOpen(false)} />
    </>
  );
}
