"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { createAdminClient } from "@/lib/admin/client";

/** Only the existing server allowlist can reveal this entry. Errors fail closed. */
export function AdminEntry() {
  const auth = useAuth();
  if (auth.status !== "authenticated" || !auth.user || !auth.client || auth.recoveryActive) return null;
  return <CheckedEntry key={auth.user.id} client={auth.client} ownerId={auth.user.id} />;
}

function CheckedEntry({ client, ownerId }: { client: NonNullable<ReturnType<typeof useAuth>["client"]>; ownerId: string }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const operator = await createAdminClient(client).isOperator();
        const { data } = await client.auth.getSession();
        if (active) setAllowed(operator && data.session?.user.id === ownerId);
      } catch {
        if (active) setAllowed(false);
      }
    })();
    return () => { active = false; };
  }, [client, ownerId]);
  return allowed ? <Link className="text-link text-link--small" href="/admin/">관리자</Link> : null;
}
