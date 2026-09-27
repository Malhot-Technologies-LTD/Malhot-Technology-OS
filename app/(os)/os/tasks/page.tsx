import { redirect } from "next/navigation";

/** There is no task index of its own; the breadcrumb's "Tasks" lands on the viewer's list. */
export default function TasksIndexPage() {
  redirect("/os/my-tasks");
}
