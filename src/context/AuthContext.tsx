import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

// ==========================================
// CONFIGURATION
// ==========================================
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

export const supabase: SupabaseClient | null = 
  (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ==========================================
// TYPES
// ==========================================
interface UserStats {
  total_audits: number;
  avg_score: number | null;
  best_score: number | null;
  worst_score: number | null;
  audits_this_week: number;
  audits_this_month: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  stats: UserStats | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const defaultStats: UserStats = {
  total_audits: 0,
  avg_score: null,
  best_score: null,
  worst_score: null,
  audits_this_week: 0,
  audits_this_month: 0,
};

// ==========================================
// CONTEXT
// ==========================================
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// ==========================================
// PROVIDER
// ==========================================
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  // Load user session on mount
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load stats when user changes
  useEffect(() => {
    if (user) {
      refreshStats();
    } else {
      setStats(null);
    }
  }, [user]);

  const refreshStats = async () => {
    if (!supabase || !user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_user_stats', { 
        p_user_id: user.id 
      });
      
      if (error) throw error;
      setStats(data || defaultStats);
    } catch (e) {
      console.error("Failed to load stats:", e);
      setStats(defaultStats);
    }
  };

  const login = async (email: string, password: string) => {
    if (!supabase) return { error: { message: "Database not configured" } };
    const result = await supabase.auth.signInWithPassword({ email, password });
    return { error: result.error };
  };

  const signup = async (email: string, password: string) => {
    if (!supabase) return { error: { message: "Database not configured" } };
    const result = await supabase.auth.signUp({ email, password });
    return { error: result.error };
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setStats(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, stats, login, signup, logout, refreshStats }}>
      {children}
    </AuthContext.Provider>
  );
};
