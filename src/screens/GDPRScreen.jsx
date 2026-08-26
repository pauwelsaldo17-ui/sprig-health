// src/screens/GDPRScreen.jsx
// GDPR data rights: export (JSON + CSV) and account deletion.
import React, { useState } from "react";
import { C } from "../theme.js";
import { getSupabase } from "../supabaseClient.js";

export default function GDPRScreen({ onBack, onExportJSON, onExportCSV, user }) {
  const [deleteStep, setDeleteStep] = useState("idle"); // idle | confirm | deleting | done | error
  const [deleteError, setDeleteError] = useState(null);
  const [exporting, setExporting] = useState(null); // null | "json" | csv kind

  async function handleExport(kind) {
    setExporting(kind);
    try {
      if (kind === "json") await onExportJSON();
      else await onExportCSV(kind);
    } finally { setExporting(null); }
  }

  async function handleDeleteAccount() {
    setDeleteStep("deleting");
    setDeleteError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) throw new Error("Not authenticated");

      const resp = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${resp.status}`);
      }

      // Clear local data and sign out.
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith("sprig_") || k.startsWith("vitae_"));
        keys.forEach((k) => localStorage.removeItem(k));
      } catch (_) {}
      await supabase.auth.signOut();
      setDeleteStep("done");
    } catch (e) {
      console.error("[gdpr] delete account failed:", e);
      setDeleteError(e?.message || "Something went wrong");
      setDeleteStep("error");
    }
  }

  if (deleteStep === "done") {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, system-ui" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Account deleted</div>
          <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.5 }}>Your data has been permanently erased. Thank you for using Vitae.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: "DM Sans, system-ui, sans-serif", paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: C.navBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "env(safe-area-inset-top, 16px) 20px 14px",
        borderBottom: `1px solid ${C.line}`,
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.greenSoft, fontSize: 14, fontWeight: 600, padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
          ← Back
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Fraunces, serif", color: C.ink, marginTop: 8 }}>Data & Privacy</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Your GDPR rights — export or delete your data</div>
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>

        {/* Export section */}
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, fontFamily: "Fraunces, serif", marginBottom: 12 }}>Export your data</div>
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, overflow: "hidden", marginBottom: 28 }}>
          {[
            { kind: "json", label: "Full backup (JSON)", sub: "All your health data — food, workouts, sleep, weight" },
            { kind: "nutrition", label: "Nutrition history (CSV)", sub: "Daily calorie and protein totals" },
            { kind: "workouts", label: "Workout log (CSV)", sub: "Every set, rep, and weight logged" },
            { kind: "weight", label: "Weight history (CSV)", sub: "All your weigh-in records" },
          ].map(({ kind, label, sub }, i, arr) => (
            <div key={kind} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <button
                onClick={() => handleExport(kind)}
                disabled={!!exporting}
                style={{
                  width: "100%", background: "none", border: "none", cursor: exporting ? "default" : "pointer",
                  padding: "14px 16px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                  opacity: exporting && exporting !== kind ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>
                </div>
                <div style={{ fontSize: 13, color: exporting === kind ? C.amber : C.greenSoft, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>
                  {exporting === kind ? "Preparing…" : "Download"}
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Delete section */}
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, fontFamily: "Fraunces, serif", marginBottom: 12 }}>Delete account</div>
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>
            Permanently deletes your account and all health data from our servers. This cannot be undone.
            We recommend exporting a backup first.
          </div>
          {deleteStep === "idle" && (
            <button
              onClick={() => setDeleteStep("confirm")}
              style={{ background: "transparent", border: `1.5px solid ${C.coral}`, color: C.coral, borderRadius: 10, padding: "11px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans", width: "100%" }}
            >
              Delete my account
            </button>
          )}
          {deleteStep === "confirm" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.coral, marginBottom: 10, textAlign: "center" }}>
                Are you sure? This is permanent.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setDeleteStep("idle")} style={{ flex: 1, background: C.bg2, border: `1px solid ${C.line}`, color: C.inkSoft, borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleDeleteAccount} style={{ flex: 1, background: C.coral, border: "none", color: "#fff", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Yes, delete everything
                </button>
              </div>
            </div>
          )}
          {deleteStep === "deleting" && (
            <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "8px 0" }}>Deleting account…</div>
          )}
          {deleteStep === "error" && (
            <div>
              <div style={{ fontSize: 12.5, color: C.coral, marginBottom: 10, lineHeight: 1.4 }}>{deleteError}</div>
              <button onClick={() => setDeleteStep("idle")} style={{ background: C.bg2, border: `1px solid ${C.line}`, color: C.inkSoft, borderRadius: 10, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>
                Try again
              </button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
          Account deletion removes your data from our servers within 30 days per our Privacy Policy.
        </div>
      </div>
    </div>
  );
}
