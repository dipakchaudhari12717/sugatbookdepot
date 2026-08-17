"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import { ensureUserProfile, isAdminUid, subscribeUserProfile } from "./repo";
import type { UserProfile } from "./types";
import { authErrorMessage } from "./utils";

interface AuthValue {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), async (next) => {
      setUser(next);
      if (!next) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        await ensureUserProfile(next.uid, {
          email: next.email ?? "",
          displayName: next.displayName ?? undefined,
        });
      } catch (err) {
        // A profile write can fail on a locked-down project; that must not
        // block sign-in, so log and carry on.
        console.error("[auth] could not ensure user profile", err);
      }
      setIsAdmin(await isAdminUid(next.uid));
      setLoading(false);
    });
  }, []);

  // Keep the profile (addresses, wishlist) live once we know who is signed in.
  useEffect(() => {
    if (!user) return;
    return subscribeUserProfile(user.uid, (next) => {
      setProfile(next);
      if (next?.role === "admin") setIsAdmin(true);
    });
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    } catch (err) {
      throw new Error(authErrorMessage((err as { code?: string }).code ?? ""));
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      await ensureUserProfile(cred.user.uid, { email: email.trim(), displayName: name.trim() });
    } catch (err) {
      throw new Error(authErrorMessage((err as { code?: string }).code ?? ""));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
    } catch (err) {
      throw new Error(authErrorMessage((err as { code?: string }).code ?? ""));
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      profile,
      isAdmin,
      loading,
      configured: isFirebaseConfigured,
      signIn,
      signUp,
      logout,
      resetPassword,
    }),
    [user, profile, isAdmin, loading, signIn, signUp, logout, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
