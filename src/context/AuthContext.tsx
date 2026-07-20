import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../services/supabase";

export interface CurrentUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "serwis";
  is_active: boolean;
  is_online?: boolean;
  session_status?: string;
  last_seen?: string;
  structures?: string[];
  nodes?: string[];
  location_consent?: boolean;
}

type AuthContextType = {
  currentUser: CurrentUser | null;
  loading: boolean;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  reloadUser: async () => {},
});

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  async function reloadUser() {
    setLoading(true);

    const { data: sessionData } =
      await supabase.auth.getSession();

    const authUser =
      sessionData.session?.user;

    if (!authUser) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("users_status")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (error || !data) {
      console.error("PROFILE ERROR:", error);
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    if (data.is_active === false) {
      await supabase.auth.signOut();

      setCurrentUser(null);
      setLoading(false);
      return;
    }

    setCurrentUser(data);
    setLoading(false);
  }

  useEffect(() => {
    reloadUser();

    const { data } =
      supabase.auth.onAuthStateChange(
        async () => {
          await reloadUser();
        }
      );

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}