// src/context/AuthContext.tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  isVerified: boolean;
  role: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  setTokens: (access: string, refresh: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (emailOrUsername, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login({ emailOrUsername, password });
          const { user, accessToken, refreshToken } = data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          set({ user, accessToken, refreshToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (username, email, password, displayName) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.register({ username, email, password, displayName });
          const { user, accessToken, refreshToken } = data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          set({ user, accessToken, refreshToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await authApi.logout(refreshToken);
        } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null }));
      },

      setTokens: (access, refresh) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        set({ accessToken: access, refreshToken: refresh });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
