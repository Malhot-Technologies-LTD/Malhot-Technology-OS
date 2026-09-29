// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setAvatar = vi.fn();
const removeAvatar = vi.fn();
const upload = vi.fn();
const getUser = vi.fn();
const success = vi.fn();
const error = vi.fn();

vi.mock("@/features/auth/actions", () => ({
  setAvatar: (...args: unknown[]) => setAvatar(...args),
  removeAvatar: (...args: unknown[]) => removeAvatar(...args),
}));
vi.mock("sonner", () => ({ toast: { success: (m: string) => success(m), error: (m: string) => error(m) } }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => getUser() },
    storage: { from: () => ({ upload: (...args: unknown[]) => upload(...args) }) },
  }),
}));

import { AvatarUpload } from "./avatar-upload.client";
import { AVATAR_MAX_BYTES } from "../avatar";

const USER = "8f4a1f6e-1b3c-4d5e-9a7b-2c8d0e1f3a4b";

/** A File of a given type and apparent size, without allocating the bytes. */
function fakeFile(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

beforeEach(() => {
  setAvatar.mockReset().mockResolvedValue({ ok: true, data: undefined });
  removeAvatar.mockReset().mockResolvedValue({ ok: true, data: undefined });
  upload.mockReset().mockResolvedValue({ error: null });
  getUser.mockReset().mockResolvedValue({ data: { user: { id: USER } } });
  success.mockReset();
  error.mockReset();
  // jsdom has no object-URL implementation.
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(cleanup);

const file = () => screen.getByLabelText("Choose a profile photo") as HTMLInputElement;

describe("AvatarUpload", () => {
  it("offers to upload when there is no photo, and nothing to remove", () => {
    render(<AvatarUpload fullName="Alpha Mugisha" avatarUrl={null} />);
    expect(screen.getByRole("button", { name: /upload photo/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("offers to change and remove once there is one", () => {
    render(<AvatarUpload fullName="Alpha Mugisha" avatarUrl="https://example.test/a.jpg" />);
    expect(screen.getByRole("button", { name: /change photo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("uploads under the signed-in person's own id and records the path", async () => {
    const user = userEvent.setup();
    render(<AvatarUpload fullName="Alpha Mugisha" avatarUrl={null} />);

    await user.upload(file(), fakeFile("me.png", "image/png", 1024));

    await waitFor(() => expect(setAvatar).toHaveBeenCalled());
    const path = upload.mock.calls[0]?.[0] as string;
    expect(path).toMatch(new RegExp(`^${USER}/[0-9a-f-]{36}\\.png$`));
    expect(setAvatar).toHaveBeenCalledWith({ path });
    expect(success).toHaveBeenCalledWith("Photo updated");
  });

  /*
   * The two guards that matter. Storage would refuse both, but only after the
   * whole file had gone over the wire — and a phone photo is several megabytes.
   */
  it("refuses a file the bucket would not take, without uploading it", async () => {
    render(<AvatarUpload fullName="Alpha Mugisha" avatarUrl={null} />);

    /*
     * The file is put on the input directly rather than through userEvent,
     * which honours the accept attribute and would drop a PDF before the
     * component ever saw it — testing the browser instead of this code. accept
     * is a filter, not a guarantee: "All files" in the picker and drag-and-drop
     * both walk straight past it, which is the case this guard exists for.
     */
    const input = file();
    Object.defineProperty(input, "files", { value: [fakeFile("scan.pdf", "application/pdf", 1024)] });
    fireEvent.change(input);

    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining("JPEG")));
    expect(upload).not.toHaveBeenCalled();
    expect(setAvatar).not.toHaveBeenCalled();
  });

  it("refuses an image past the size limit, without uploading it", async () => {
    const user = userEvent.setup();
    render(<AvatarUpload fullName="Alpha Mugisha" avatarUrl={null} />);

    await user.upload(file(), fakeFile("huge.jpg", "image/jpeg", AVATAR_MAX_BYTES + 1));

    expect(upload).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("2MB"));
  });

  it("does not record a photo that failed to upload", async () => {
    const user = userEvent.setup();
    upload.mockResolvedValue({ error: { message: "network unreachable" } });
    render(<AvatarUpload fullName="Alpha Mugisha" avatarUrl={null} />);

    await user.upload(file(), fakeFile("me.jpg", "image/jpeg", 1024));

    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining("network unreachable")));
    expect(setAvatar).not.toHaveBeenCalled();
  });

  it("does not upload for a session that has gone", async () => {
    const user = userEvent.setup();
    getUser.mockResolvedValue({ data: { user: null } });
    render(<AvatarUpload fullName="Alpha Mugisha" avatarUrl={null} />);

    await user.upload(file(), fakeFile("me.jpg", "image/jpeg", 1024));

    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining("expired")));
    expect(upload).not.toHaveBeenCalled();
  });

  it("removes the photo when asked", async () => {
    const user = userEvent.setup();
    render(<AvatarUpload fullName="Alpha Mugisha" avatarUrl="https://example.test/a.jpg" />);

    await user.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => expect(removeAvatar).toHaveBeenCalled());
    expect(success).toHaveBeenCalledWith("Photo removed");
  });
});
