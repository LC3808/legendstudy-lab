// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AdminSchoolName } from "./admin-school-name";
vi.mock("@/lib/auth-config", () => ({ getBrowserAuthConfig: () => ({ url: "https://example.supabase.co", publishableKey: "public-test" }) }));
afterEach(() => vi.unstubAllGlobals());
const row = (office: string, school: string, name: string) => ({ ATPT_OFCDC_SC_CODE: office, SD_SCHUL_CODE: school, SCHUL_NM: name });
it("resolves the exact office/school pair without sending a session", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rows: [row("OTHER", "1", "잘못된 학교"), row("B10", "1", "검증고등학교")] }) });
  vi.stubGlobal("fetch", fetcher);
  render(<AdminSchoolName office="B10" school="1" />);
  expect(await screen.findByText("검증고등학교")).toBeInTheDocument();
  const [url, options] = fetcher.mock.calls[0];
  expect(url.searchParams.get("office")).toBe("B10");
  expect(options.headers).toEqual({ apikey: "public-test" });
  expect(options.credentials).toBe("omit");
});
it("does not query an unset school", () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  render(<AdminSchoolName office={null} school={null} />);
  expect(screen.getByText("미설정")).toBeInTheDocument(); expect(fetcher).not.toHaveBeenCalled();
});
it("reports lookup failure without displaying a numeric school name", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  render(<AdminSchoolName office="B10" school="123" />);
  expect(await screen.findByText("학교명 확인 불가")).toBeInTheDocument();
  expect(screen.queryByText("123")).not.toBeInTheDocument();
});
it("discards a late response after member switch", async () => {
  let finish!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ ok: true, json: async () => ({ rows: [row("B10", "2", "두번째학교")] }) }));
  const view = render(<AdminSchoolName office="B10" school="1" />);
  view.rerender(<AdminSchoolName office="B10" school="2" />);
  await screen.findByText("두번째학교");
  finish({ ok: true, json: async () => ({ rows: [row("B10", "1", "이전학교")] }) });
  await waitFor(() => expect(screen.queryByText("이전학교")).not.toBeInTheDocument());
});
