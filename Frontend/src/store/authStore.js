import { create } from 'zustand';
import { getCurrentUser } from '../lib/api/auth';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('algotrack_token') || null,
  isAuthenticated: !!localStorage.getItem('algotrack_token'),
  isLoading: false,
  authModalOpen: false,
  authModalTab: 'login', // 'login' | 'register'

  openAuthModal: (tab = 'login') => {
    set({ authModalOpen: true, authModalTab: tab });
  },

  closeAuthModal: () => {
    set({ authModalOpen: false });
  },

  setAuthModalTab: (tab) => {
    set({ authModalTab: tab });
  },

  login: (token, user) => {
    localStorage.setItem('algotrack_token', token);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('algotrack_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    set({ user });
  },

  // Hydrate user session from token
  fetchMe: async () => {
    const token = localStorage.getItem('algotrack_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const user = await getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      localStorage.removeItem('algotrack_token');
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
