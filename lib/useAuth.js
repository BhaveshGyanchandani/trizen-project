"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authAPI } from "./api";

const AuthContext = createContext(null);

/**
 * Provides the app-wide authentication context: the current session
 * user (or null), a "loading"/"ready" status flag, and the login,
 * register, logout, refresh, and setProfile actions. Wrap the app once
 * near the root; consume with `useAuth()`.
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, email, role } | null
  const [status, setStatus] = useState("loading"); // loading | ready

  const refresh = useCallback(async () => {
    try {
      const me = await authAPI.me();
      setUser(me || null);
    } catch {
      setUser(null);
    } finally {
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    refresh();
  }, [refresh]);

  const login = useCallback(async (payload) => {
    await authAPI.login(payload);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (payload) => {
    await authAPI.register(payload);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
    }
  }, []);

  // Lets the profile page update the cached user (name/avatar/etc shown in
  // the sidebar) immediately after a save, without waiting on a full
  // /auth/me round trip.
  const setProfile = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout, refresh, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Reads the current auth context. Throws if used outside `<AuthProvider>`. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
