// src/screens/AuthScreen.jsx
// Mandatory auth gate — shown when no user session exists.
// Google Sign-In only for now; Apple added when iOS provisioning is ready.
import React, { useState } from "react";
import { C } from "../theme.js";
import { getSupabase } from "../supabaseClient.js";

const FEATURES = [
  { emoji: "🥗", text: "AI food scanning — snap a photo, get macros" },
  { emoji: "💪", text: "Smart training tracker with PR detection" },
  { emoji: "🌙", text: "Sleep quality tracking and recovery scoring" },
  { emoji: "🤖", text: "Elite AI coach that knows your full picture" },
];

export default function AuthScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const supabase = getSupabase();

  async function handleGoogle() {
    if (!supabase) { setError("Auth not configured — add Supabase env vars."); return; }
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) setError(err.message);
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: C.isDark
        ? "radial-gradient(120% 60% at 50% -10%, #123524 0%, rgba(18,53,36,0) 55%), linear-gradient(180deg, #0B1A13 0%, #07140F 100%)"
        : "radial-gradient(120% 60% at 50% -10%, #E8F1E9 0%, rgba(232,241,233,0) 55%), linear-gradient(180deg, #F7F8F5 0%, #F1F4EF 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "env(safe-area-inset-top, 24px) 24px env(safe-area-inset-bottom, 32px)",
      fontFamily: "DM Sans, system-ui, sans-serif",
    }}>

      {/* Top: logo + tagline */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 48, flex: 1, justifyContent: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "linear-gradient(135deg,#3E9D63,#1C5237)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
          boxShadow: "0 8px 32px rgba(62,157,99,0.35)",
        }}>
          <span style={{ fontSize: 38, lineHeight: 1 }}>🌿</span>
        </div>
        <div style={{
          fontFamily: "Fraunces, Georgia, serif",
          fontSize: 38, fontWeight: 700,
          color: C.ink, letterSpacing: -1,
          marginBottom: 8,
        }}>
          Vitae
        </div>
        <div style={{
          fontSize: 15, color: C.inkSoft, fontWeight: 400,
          textAlign: "center", lineHeight: 1.5, maxWidth: 260,
          marginBottom: 44,
        }}>
          Your health, all in one place
        </div>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320, marginBottom: 52 }}>
          {FEATURES.map(({ emoji, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20, width: 28, textAlign: "center", flexShrink: 0 }}>{emoji}</span>
              <span style={{ fontSize: 14, color: C.inkSoft, fontWeight: 500, lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: sign-in */}
      <div style={{ width: "100%", maxWidth: 360 }}>
        <button
          onClick={handleGoogle}
          disabled={busy}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            background: "#fff",
            color: "#3c4043",
            border: "none",
            borderRadius: 14,
            padding: "15px 20px",
            fontSize: 15, fontWeight: 700,
            fontFamily: "DM Sans, system-ui, sans-serif",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            transition: "opacity 0.15s",
            marginBottom: 16,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>

        {error && (
          <div style={{
            fontSize: 13, color: C.coral, textAlign: "center",
            marginBottom: 12, lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}

        <p style={{
          fontSize: 11.5, color: C.muted, textAlign: "center",
          lineHeight: 1.5, margin: 0,
        }}>
          By continuing you agree to our{" "}
          <span style={{ color: C.greenSoft, cursor: "pointer", textDecoration: "underline" }}
            onClick={() => window.open("/terms", "_blank")}>Terms</span>
          {" "}and{" "}
          <span style={{ color: C.greenSoft, cursor: "pointer", textDecoration: "underline" }}
            onClick={() => window.open("/privacy", "_blank")}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
