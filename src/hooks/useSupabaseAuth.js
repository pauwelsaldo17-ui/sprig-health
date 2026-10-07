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
    let appListener = null;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        appListener = await App.addListener("appUrlOpen", async ({ url }) => {
          if (!url || !url.startsWith("com.pauwelsaldo.vitae://")) return;
          // Close SFSafariViewController before exchanging the code
          try { const { Browser } = await import("@capacitor/browser"); await Browser.close(); } catch (_) {}
          try {
            // Extract code directly — Supabase URL parser rejects custom schemes
            const code = new URLSearchParams(url.split("?")[1] || "").get("code");
            if (!code) { console.warn("[vitae] no code in deep link:", url); return; }
            await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            console.warn("[vitae] deep link auth exchange failed:", e?.message || e);
          }
        });
        // Cold-start: app killed then launched via OAuth deep link
        const launchInfo = await App.getLaunchUrl();
        if (launchInfo?.url?.startsWith("com.pauwelsaldo.vitae://")) {
          try {
            const code = new URLSearchParams(launchInfo.url.split("?")[1] || "").get("code");
            if (code) await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            console.warn("[vitae] launch URL auth exchange failed:", e?.message || e);
          }
        }
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
