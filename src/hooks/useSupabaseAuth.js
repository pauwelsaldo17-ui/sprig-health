// src/hooks/useSupabaseAuth.js
import { useState, useEffect } from "react";
import { getSupabase, supabaseConfigured } from "../supabaseClient.js";
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

    // Handle OAuth deep link callbacks on native iOS/Android.
    // When Google OAuth completes it redirects to com.pauwelsaldo.vitae://login-callback
    // Capacitor fires appUrlOpen; we pass the URL to Supabase to exchange the code for a session.
    let appListener = null;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        appListener = await App.addListener("appUrlOpen", async ({ url }) => {
          if (!url || !url.startsWith("com.pauwelsaldo.vitae://")) return;
          try {
            await supabase.auth.exchangeCodeForSession(url);
          } catch (e) {
            console.warn("[vitae] deep link auth exchange failed:", e?.message || e);
          }
        });
      } catch (_) {}
    })();

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
      appListener?.remove?.();
    };
  }, [supabase]);

  return { user, loading, supabase };
}
