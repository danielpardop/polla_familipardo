import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api, type AppRole, type AppUser, type AuthPayload, type Profile } from "@/lib/api";

type AppSession = { user: AppUser } | null;

type AuthContextValue = {
  session: AppSession;
  user: AppUser | null;
  profile: Profile | null;
  role: AppRole;
  isAdmin: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toState(payload: AuthPayload) {
  return {
    session: payload.session,
    profile: payload.profile,
    role: payload.role,
    isAdmin: payload.isAdmin,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>("user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((payload: AuthPayload) => {
    const next = toState(payload);
    setSession(next.session);
    setProfile(next.profile);
    setRole(next.role);
    setIsAdmin(next.isAdmin);
  }, []);

  const refreshProfile = useCallback(async () => {
    const payload = await api.getSession();
    applyAuth(payload);
  }, [applyAuth]);

  useEffect(() => {
    let mounted = true;

    api
      .getSession()
      .then((payload) => {
        if (mounted) applyAuth(payload);
      })
      .catch((error) => {
        console.error(error);
        toast.error("No se pudo cargar tu sesion.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [applyAuth]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      applyAuth(await api.login(email, password));
    },
    [applyAuth],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string, fullName: string) => {
      applyAuth(await api.signUp(email, password, fullName));
    },
    [applyAuth],
  );

  const signOut = useCallback(async () => {
    await api.logout();
    setSession(null);
    setProfile(null);
    setRole("user");
    setIsAdmin(false);
  }, []);

  const updateProfile = useCallback(
    async (fullName: string) => {
      applyAuth(await api.updateProfile(fullName));
    },
    [applyAuth],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      isAdmin,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      updateProfile,
      refreshProfile,
    }),
    [isAdmin, loading, profile, refreshProfile, role, session, signInWithPassword, signOut, signUpWithPassword, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
