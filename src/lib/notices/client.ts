import type { SupabaseClient } from "@supabase/supabase-js";
export const categories = {
  general: "일반 공지",
  update: "서비스 업데이트",
  beta: "베타 테스트",
  maintenance: "서비스 점검",
  policy: "이용 정책",
  event: "이벤트",
} as const;
export type Notice = {
  notice_id: string;
  title: string;
  content: string;
  category: keyof typeof categories;
  status: "draft" | "published" | "archived";
  is_pinned: boolean;
  is_public: boolean;
  show_app: boolean;
  show_web: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
};
export type NoticeInput = Omit<
  Notice,
  "notice_id" | "created_at" | "updated_at"
> & { notice_id?: string; updated_at?: string };
export type NoticeFeed = { items: Notice[]; total: number; unread: number };
export function noticesClient(client: SupabaseClient) {
  async function call<T>(
    name: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await client.rpc(name, params);
    if (error) throw error;
    return data as T;
  }
  return {
    list: (offset = 0) =>
      call<NoticeFeed>("notice_list", {
        p_channel: "web",
        p_offset: offset,
        p_limit: 20,
      }),
    detail: (id: string) =>
      call<Notice | null>("notice_detail", {
        p_notice_id: id,
        p_channel: "web",
      }),
    markRead: (notice: Notice) =>
      call<boolean>("notice_mark_read", {
        p_notice_id: notice.notice_id,
        p_channel: "web",
        p_updated_at: notice.updated_at,
      }),
    adminList: (offset = 0) =>
      call<NoticeFeed>("notice_admin_list", { p_offset: offset }),
    save: (p: NoticeInput) => call<Notice>("notice_admin_save", { p }),
  };
}
