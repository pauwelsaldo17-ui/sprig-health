// src/hooks/useSupabaseAuth.js
import { useState, useEffect } from "react";
import { getSupabase, supabaseConfigured } from "../supabaseClient.js";

// Keeps the current Supabase session in state.
// Returns { user, loading, supabase }.
// If Supabase isn't configured, returns { user: null, loading: false, supabase: null }.
export function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured());
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data?.session?.user || null);
      setLoading(false);
    }).catch((e) => {
      console.warn("[vitae] getSession failed:", e);
      if (mounted) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user || null);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, [supabase]);

  return { user, loading, supabase };
}
