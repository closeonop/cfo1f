"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setAccessToken, refreshSession } from "@/lib/api";
import type { Company, User } from "@/lib/types";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User; company: Company };

type AuthMethods = {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  completeTour: (key: string) => Promise<void>;
};

type AuthContextValue = AuthState & AuthMethods;

const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  login: async () => {},
  logout: async () => {},
  reload: async () => {},
  completeTour: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const reload = useCallback(async () => {
    try {
      // silent refresh: the httpOnly cookie gets us a fresh access token
      if (!await refreshSession()) throw new Error("Session expired");
      const me = await api<{ user: User; company?: Company }>("/auth/me");
      if (!me.company) throw new Error("no company");
      setState({ status: "authenticated", user: me.user, company: me.company });
    } catch {
      setAccessToken(null);
      setState({ status: "anonymous" });
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    });
    setAccessToken(res.accessToken);
    const me = await api<{ user: User; company?: Company }>("/auth/me");
    setState({ status: "authenticated", user: res.user, company: me.company! });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // clearing local state is what matters
    }
    setAccessToken(null);
    setState({ status: "anonymous" });
  }, []);

  const userId = state.status === "authenticated" ? state.user.id : null;
  const completeTour = useCallback(async (key: string) => {
    const completed = await api<string[]>(`/user/tours/${encodeURIComponent(key)}/complete`, { method:"POST" });
    setState(previous => previous.status === "authenticated" && previous.user.id === userId
      ? {...previous, user:{...previous.user, toursCompleted:[...new Set([...(previous.user.toursCompleted??[]),...completed])]}} : previous);
  }, [userId]);
  return <AuthContext.Provider value={{ ...state, login, logout, reload, completeTour }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Convenience: throws when not authenticated (used inside app pages). */
export function useSession() {
  const ctx = useContext(AuthContext);
  if (ctx.status !== "authenticated") {
    throw new Error("useSession used outside an authenticated context");
  }
  return { status: "authenticated" as const, user: ctx.user, company: ctx.company, login: ctx.login, logout: ctx.logout, reload: ctx.reload, completeTour:ctx.completeTour };
}
