import { create } from "zustand";
import type { User } from "@/types/auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** False until the initial silent-refresh bootstrap has completed. */
  isInitialized: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setInitialized: () => void;
}

/**
 * Deliberately NOT persisted (no localStorage/sessionStorage middleware).
 * The access token lives only in memory for the lifetime of the tab;
 * session continuity across reloads comes from the httpOnly refresh
 * cookie via a silent /auth/refresh call (see AuthProvider).
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  setInitialized: () => set({ isInitialized: true }),
}));
