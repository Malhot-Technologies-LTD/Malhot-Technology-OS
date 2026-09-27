// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The actions are a "use server" module; importing it under jsdom would pull the
 * server runtime in. The component's contract with it is just "call and read
 * ActionResult", which is what these doubles provide.
 */
const connectRepository = vi.fn();
const disconnectRepository = vi.fn();
vi.mock("@/features/github/actions", () => ({
  connectRepository: (...args: unknown[]) => connectRepository(...args),
  disconnectRepository: (...args: unknown[]) => disconnectRepository(...args),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { RepositoryList } from "./repository-list.client";
import type { RepositoryRow } from "../queries";

const repository: RepositoryRow = {
  id: "5c1d8b2a-9f3e-4a7c-8b1d-6e2f0a4c9d13",
  full_name: "Malhot-Technologies-LTD/Malhot-Technology-OS",
  html_url: "https://github.com/Malhot-Technologies-LTD/Malhot-Technology-OS",
  default_branch: null,
  is_private: null,
  last_synced_at: null,
  created_at: "2026-09-27T09:00:00.000Z",
};

const projectId = "8f4a1f6e-1b3c-4d5e-9a7b-2c8d0e1f3a4b";

beforeEach(() => {
  connectRepository.mockReset();
  disconnectRepository.mockReset();
});

/*
 * Explicit, because Testing Library only registers its own afterEach when Vitest
 * runs with `globals: true` and this project does not. Without it every render
 * stacks up in the same document and the second test onwards sees two of
 * everything.
 */
afterEach(cleanup);

describe("RepositoryList", () => {
  it("links the repository out to GitHub", () => {
    render(<RepositoryList projectId={projectId} repositories={[repository]} canManage={false} />);
    const link = screen.getByRole("link", { name: /Malhot-Technology-OS/ });
    expect(link).toHaveAttribute("href", repository.html_url);
    // Opening someone's code in place would lose the OS page they were on.
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("says the sync has not happened rather than guessing a branch", () => {
    render(<RepositoryList projectId={projectId} repositories={[repository]} canManage={false} />);
    expect(screen.getByText("Not synced yet")).toBeInTheDocument();
    expect(screen.queryByText("main")).not.toBeInTheDocument();
  });

  it("gives a reader no way to delete or connect", () => {
    render(<RepositoryList projectId={projectId} repositories={[repository]} canManage={false} />);
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  /*
   * The point of the dialog. "Delete" beside a repository name reads as deleting
   * the repository, so the copy has to correct that before the button is pressed
   * — and nothing may be sent until it is confirmed.
   */
  it("promises the repository survives, and sends nothing until confirmed", async () => {
    const user = userEvent.setup();
    render(<RepositoryList projectId={projectId} repositories={[repository]} canManage />);

    await user.click(screen.getByRole("button", { name: /^Delete Malhot/ }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/nothing is removed from GitHub/i);
    expect(disconnectRepository).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(disconnectRepository).not.toHaveBeenCalled();
  });

  it("disconnects by id once confirmed", async () => {
    const user = userEvent.setup();
    disconnectRepository.mockResolvedValue({ ok: true, data: undefined });
    render(<RepositoryList projectId={projectId} repositories={[repository]} canManage />);

    await user.click(screen.getByRole("button", { name: /^Delete Malhot/ }));
    await user.click(await screen.findByRole("button", { name: "Disconnect" }));

    await waitFor(() => {
      expect(disconnectRepository).toHaveBeenCalledWith({ repositoryId: repository.id });
    });
  });

  it("puts a rejected address against the field, not in a toast", async () => {
    const user = userEvent.setup();
    connectRepository.mockResolvedValue({
      ok: false,
      error: { code: "validation", message: "fallback", fieldErrors: { repository: ["That is a gitlab.com address"] } },
    });
    render(<RepositoryList projectId={projectId} repositories={[]} canManage />);

    await user.type(screen.getByRole("textbox"), "https://gitlab.com/a/b");
    await user.click(screen.getByRole("button", { name: /connect/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That is a gitlab.com address");
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("passes the pasted value through untouched, leaving parsing to the server", async () => {
    const user = userEvent.setup();
    connectRepository.mockResolvedValue({ ok: true, data: undefined });
    render(<RepositoryList projectId={projectId} repositories={[]} canManage />);

    await user.type(screen.getByRole("textbox"), "github.com/malhot/os{Enter}");

    await waitFor(() => {
      expect(connectRepository).toHaveBeenCalledWith({ projectId, repository: "github.com/malhot/os" });
    });
  });

  it("will not send an empty address", async () => {
    const user = userEvent.setup();
    render(<RepositoryList projectId={projectId} repositories={[]} canManage />);
    expect(screen.getByRole("button", { name: /connect/i })).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "   {Enter}");
    expect(connectRepository).not.toHaveBeenCalled();
  });
});
