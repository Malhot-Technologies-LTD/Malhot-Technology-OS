import { redirect } from "next/navigation";

/** Settings index: profile is the first and only section until Phase 3. */
export default function SettingsPage() {
  redirect("/os/settings/profile");
}
