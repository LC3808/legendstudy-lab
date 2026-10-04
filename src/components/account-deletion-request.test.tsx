// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDeletionRequest } from "./account-deletion-request";
const auth = vi.hoisted(() => ({ client: { functions: { invoke: vi.fn() } }, user: { id: "owner-a" }, status: "authenticated", signOut: vi.fn() }));
vi.mock("./auth-context", () => ({ useAuth: () => auth }));
beforeEach(() => { auth.user = { id: "owner-a" }; vi.clearAllMocks(); });
describe("canonical account deletion boundary", () => {
  it("disabled cannot submit", () => { render(<AccountDeletionRequest enabled={false} />); expect(screen.queryByRole("button")).toBeNull(); expect(auth.client.functions.invoke).not.toHaveBeenCalled(); });
  it("sends only operation, requires acknowledgement and server receipt", async () => {
    auth.client.functions.invoke.mockResolvedValue({ data: { state: "DELETION_PENDING", scheduled_deletion_at: "2026-10-20T00:00:00Z" }, error: null });
    render(<AccountDeletionRequest enabled />);
    expect(screen.getByText("계정 삭제 요청")).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByText("계정 삭제 요청"));
    await screen.findByText(/삭제 요청이 접수됐습니다/);
    expect(auth.client.functions.invoke.mock.calls[0][0]).toBe("delete-account");
    expect(auth.client.functions.invoke.mock.calls[0][1].body).toEqual({ operation: "request" });
  });
  it("failure never displays success or raw exception", async () => {
    auth.client.functions.invoke.mockRejectedValue(Error("private sentinel")); render(<AccountDeletionRequest enabled />);
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByText("계정 삭제 요청"));
    await screen.findByRole("alert"); expect(screen.queryByText(/private sentinel|접수됐습니다/)).toBeNull();
  });
  it("late receipt and acknowledgement do not cross owners; double click has one request", async () => {
    let done!: (x: unknown) => void;
    auth.client.functions.invoke.mockImplementation(() => new Promise(r => { done = r; }));
    const view = render(<AccountDeletionRequest enabled />);
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByText("계정 삭제 요청")); fireEvent.click(screen.getByText("계정 삭제 요청"));
    expect(auth.client.functions.invoke).toHaveBeenCalledTimes(1);
    auth.user = { id: "owner-b" }; view.rerender(<AccountDeletionRequest enabled />);
    await act(async () => done({ data: { state: "DELETION_PENDING", scheduled_deletion_at: "2026-10-20T00:00:00Z" } }));
    await waitFor(() => expect(screen.getByRole("checkbox")).not.toBeChecked());
    expect(screen.queryByText(/접수됐습니다/)).toBeNull();
  });
});
