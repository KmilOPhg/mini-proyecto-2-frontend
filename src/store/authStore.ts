import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createSession, type StudentUser } from '../services/api';

const JWT_KEY = 'cf_jwt';
const USER_KEY = 'cf_user';

type AuthState = {
  user: StudentUser | null;
  jwtToken: string | null;
  needsUsername: boolean;
  isLoading: boolean;
  setSession: (token: string, user: StudentUser) => void;
  markNeedsUsername: (user: StudentUser) => void;
  logout: () => Promise<void>;
  init: () => () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  jwtToken: null,
  needsUsername: false,
  isLoading: true,

  setSession(token, userData) {
    localStorage.setItem(JWT_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    set({ jwtToken: token, user: userData, needsUsername: false });
  },

  markNeedsUsername(userData) {
    set({ user: userData, needsUsername: true, jwtToken: null });
  },

  async logout() {
    await auth.signOut();
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, jwtToken: null, needsUsername: false });
  },

  init() {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const storedJwt = localStorage.getItem(JWT_KEY);
        const storedUserRaw = localStorage.getItem(USER_KEY);

        if (storedJwt && storedUserRaw) {
          set({ jwtToken: storedJwt, user: JSON.parse(storedUserRaw) as StudentUser, isLoading: false });
          return;
        }

        try {
          const idToken = await firebaseUser.getIdToken();
          const result = await createSession(idToken);
          if (result.needsUsername) {
            set({ needsUsername: true, user: result.user, isLoading: false });
          } else {
            localStorage.setItem(JWT_KEY, result.token);
            localStorage.setItem(USER_KEY, JSON.stringify(result.user));
            set({ jwtToken: result.token, user: result.user, isLoading: false });
          }
        } catch {
          await auth.signOut();
          set({ isLoading: false });
        }
      } else {
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(USER_KEY);
        set({ user: null, jwtToken: null, needsUsername: false, isLoading: false });
      }
    });

    return unsub;
  },
}));
