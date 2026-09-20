"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AuthChangeEvent, SupabaseClient } from "@supabase/supabase-js";

import { getBrowserAuthClient } from "@/lib/browser-auth-client";
import { nextAuthSnapshot, type AuthSnapshot, type PublicAuthUser } from "@/lib/auth-state";

type AuthStatus = "loading" | "unconfigured" | "anonymous" | "authenticated";

export type AuthContextValue = {
  client: SupabaseClient | null;
  status: AuthStatus;
  user: PublicAuthUser | null;
  recoveryActive: boolean;
  completeRecovery: () => void;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getBrowserAuthClient(), []);
  const [status, setStatus] = useState<AuthStatus>(() => (client ? "loading" : "unconfigured"));
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({ user: null, recoveryActive: false });
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!client) return;

    let mounted = true;
    const apply = (event: AuthChangeEvent, user: PublicAuthUser | null) => {
      if (!mounted) return;
      const next = nextAuthSnapshot(snapshotRef.current, event, user);
      snapshotRef.current = next;
      setSnapshot(next);
      setStatus(user ? "authenticated" : "anonymous");
    };

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      apply(event, session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    void client.auth.getSession().then(({ data }) => {
      apply("INITIAL_SESSION", data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null);
    }).catch(() => {
      apply("INITIAL_SESSION", null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    client,
    status,
    user: snapshot.user,
    recoveryActive: snapshot.recoveryActive,
    completeRecovery: () => setSnapshot((current) => ({ ...current, recoveryActive: false })),
    signOut: async () => {
      if (!client) return;
      await client.auth.signOut();
    },
  }), [client, snapshot, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
