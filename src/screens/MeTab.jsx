import React, { useState, useRef, useEffect } from "react";
import {
  Activity, Award, BarChart3, Bell, BookOpen, Calculator, Camera, Check, ChevronLeft, ChevronRight,
  Cloud, CloudDownload, CloudUpload, Coffee, Dumbbell, Droplets, EyeOff, Flame, Gauge, HeartPulse,
  LogIn, LogOut, Mail, Moon, Pill, Play, Plus, RotateCcw, Settings, Sparkles, Sun, Target, Trash2, TrendingUp,
  HeartHandshake, RefreshCw
} from "lucide-react";
import { C } from "../theme.js";
import { computeTargets, ALARM_SOUNDS, SPORTS, EQUIPMENT, minToLabel } from "../utils/vitaeCalc.js";
import { btn, Btn } from "../components/ui.jsx";

const HAPTIC_PATTERNS = { tap: 14, light: 10, select: 8, success: [30, 50, 30], complete: [30, 50, 50], strong: 40, error: [100, 50, 100] };
function buzz(kind = "tap") {
  try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (_) {}
}
import { useSupabaseAuth } from "../hooks/useSupabaseAuth.js";
import { isHealthAvailable, requestHealthPermissions, syncHealthData } from "../healthService.js";
import GDPRScreen from "./GDPRScreen.jsx";
import PrivacyScreen from "./PrivacyScreen.jsx";
import TermsScreen from "./TermsScreen.jsx";
import { ActivitySourcesSection } from "./TodayTab.jsx";

let _audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!_audioCtx) _audioCtx = new AC();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  } catch (_) { return null; }
}
function playAlarmTone(kind = "bells", volume = 0.7) {
  if (kind === "vibrate") {
    try { navigator.vibrate?.([200, 120, 200]); } catch (_) {}
    return 600;
  }
  const ctx = getAudioCtx();
  if (!ctx) return 0;
  const vol = Math.max(0, Math.min(1, volume == null ? 0.7 : volume));
  const now = ctx.currentTime;
  const SEQ = {
    bells: [[880, 0, 0.4], [1108, 0.16, 0.5], [1318, 0.32, 0.6]],
    beep:  [[1000, 0, 0.12], [1000, 0.2, 0.12], [1000, 0.4, 0.12]],
    chime: [[523, 0, 0.5], [659, 0.22, 0.5], [784, 0.44, 0.7]],
    deep:  [[170, 0, 0.7], [130, 0.06, 0.7]],
  }[kind] || [[880, 0, 0.4]];
  const wave = kind === "deep" ? "sawtooth" : (kind === "beep" ? "square" : "sine");
  let end = 0;
  SEQ.forEach(([f, t, d]) => {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.linearRampToValueAtTime(vol, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + t); o.stop(now + t + d + 0.05);
      end = Math.max(end, t + d);
    } catch (_) {}
  });
  return Math.round(end * 1000) + 100;
}

function HealthIntegrationCard({ onSync }) {
  const [available, setAvailable] = useState(null);
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(() => localStorage.getItem("sprig_health_sync_ts") || null);

  useEffect(() => {
    isHealthAvailable().then(setAvailable);
    setConnected(localStorage.getItem("sprig_health_connected") === "1");
  }, []);

  async function connect() {
    try {
      const ok = await requestHealthPermissions();
      if (ok) { setConnected(true); localStorage.setItem("sprig_health_connected", "1"); }
    } catch (e) { console.warn("[health] permission error:", e?.message); }
  }

  async function doSync() {
    setSyncing(true);
    try {
      const data = await syncHealthData();
      onSync?.(data);
      const now = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      setLastSync(now); localStorage.setItem("sprig_health_sync_ts", now);
    } catch (e) { console.warn("[health] sync error:", e?.message); }
    setSyncing(false);
  }

  if (available === false || available === null) return null;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FF3B3022", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <HeartHandshake size={18} color="#FF3B30" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{isIOS ? "Apple Health" : "Google Health Connect"}</div>
          <div style={{ fontSize: 11, color: C.muted }}>Sync steps, weight, sleep &amp; workouts</div>
        </div>
        {connected && (
          <button className="sprig-tap" onClick={doSync} disabled={syncing}
            style={{ marginLeft: "auto", background: C.bg2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", color: C.greenSoft }}>
            <RefreshCw size={15} style={syncing ? { animation: "spin 1s linear infinite" } : {}} />
          </button>
        )}
      </div>
      {connected ? (
        <div style={{ fontSize: 11.5, color: C.muted }}>
          {syncing ? "Syncing…" : lastSync ? `Last synced ${lastSync}` : "Connected — tap refresh to sync"}
        </div>
      ) : (
        <button className="sprig-tap" onClick={connect}
          style={{ ...btn(C.green, "#fff"), width: "100%", padding: "11px 0", fontSize: 13.5, fontWeight: 700 }}>
          Connect {isIOS ? "Apple Health" : "Health Connect"}
        </button>
      )}
    </div>
  );
}

function AccountSection({ onSyncToCloud, onRestoreFromCloud }) {
  const { user, loading, supabase } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [showFirstChoice, setShowFirstChoice] = useState(false);
  const [lastSynced, setLastSynced] = useState(() => {
    try { return window.localStorage.getItem("sprig_last_synced_at"); } catch (_) { return null; }
  });

  // After login/signup, prompt once: upload this device, restore cloud, or decide later.
  useEffect(() => {
    if (!user) return;
    try {
      const seen = window.localStorage.getItem("sprig_first_login_prompted_" + user.id);
      if (!seen) setShowFirstChoice(true);
    } catch (_) {}
  }, [user]);
  const dismissFirstChoice = () => {
    setShowFirstChoice(false);
    if (user) {
      try { window.localStorage.setItem("sprig_first_login_prompted_" + user.id, "1"); } catch (_) {}
    }
  };

  // Don't render anything if Supabase isn't configured — keeps existing builds untouched.
  if (!supabase) return null;

  const note = (ok, text) => setMsg({ ok, text });

  async function handleSignUp() {
    if (!email || !password) return note(false, "Email and password required.");
    if (password.length < 6) return note(false, "Password must be at least 6 characters.");
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) return note(false, error.message);
    // Supabase may or may not require email confirmation depending on project settings.
    note(true, "Account created. Check your email if confirmation is required, then log in.");
    setPassword("");
  }
  async function handleSignIn() {
    if (!email || !password) return note(false, "Email and password required.");
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return note(false, error.message);
    note(true, "Signed in.");
    setEmail(""); setPassword("");
  }
  async function handleGoogleSignIn() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) note(false, error.message);
  }
  async function handleAppleSignIn() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) note(false, error.message);
  }
  async function handleSignOut() {
    // Guard: if the user has never synced, warn before losing local data
    if (!lastSynced && !confirmSignOut) { setConfirmSignOut(true); return; }
    setConfirmSignOut(false);
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) return note(false, error.message);
    note(true, "Signed out.");
  }
  async function handleSync() {
    setBusy(true); setMsg(null);
    const r = await (onSyncToCloud ? onSyncToCloud() : Promise.resolve({ ok: false, error: "Not configured." }));
    setBusy(false);
    if (!r.ok) { buzz("error"); return note(false, r.error); }
    setLastSynced(new Date().toISOString());
    buzz("success");
    note(true, "Synced " + r.count + " keys to your account.");
  }
  async function handleRestore() {
    setConfirmRestore(false);
    setBusy(true); setMsg(null);
    const r = await (onRestoreFromCloud ? onRestoreFromCloud() : Promise.resolve({ ok: false, error: "Not configured." }));
    setBusy(false);
    if (!r.ok) return note(false, r.error);
    note(true, "Restored " + r.count + " keys. Reloading…");
    setTimeout(() => { try { window.location.reload(); } catch (_) {} }, 800);
  }

  return (
    <>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Account</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 12 }}>
          <Cloud size={15} color={C.greenSoft} style={{ flexShrink: 0 }} />
          <span>Data is saved locally on this device. When logged in, you can sync a backup to your account and restore it on a new phone.</span>
        </div>

        {loading && <div style={{ fontSize: 12, color: C.muted }}>Checking session…</div>}

        {!loading && !user && (
          <>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>
              Your data is currently saved on this device. Create an account to sync it.
            </div>
            {/* Google Sign-In */}
            <button className="sprig-tap" onClick={handleGoogleSignIn} disabled={busy}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: C.isDark ? "#1e1e1e" : "#fff", color: C.isDark ? "#e8eaed" : "#3c4043", border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 0", fontSize: 13.5, fontWeight: 600, fontFamily: "DM Sans", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, marginBottom: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            {/* Apple Sign-In */}
            <button className="sprig-tap" onClick={handleAppleSignIn} disabled={busy}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: C.isDark ? "#fff" : "#000", color: C.isDark ? "#000" : "#fff", border: "none", borderRadius: 11, padding: "11px 0", fontSize: 13.5, fontWeight: 600, fontFamily: "DM Sans", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 814 1000" aria-hidden="true" fill={C.isDark ? "#000" : "#fff"}>
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.4-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.9-49.1 192.7-49.1 55.4.4 141.6 23.3 196.2 103.7zm-234.5-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
              </svg>
              Continue with Apple
            </button>
            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: C.line }} />
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>or email</span>
              <div style={{ flex: 1, height: 1, background: C.line }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              <input
                type="email" inputMode="email" autoComplete="email" placeholder="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, outline: "none" }}
              />
              <input
                type="password" autoComplete="new-password" placeholder="password (min 6 chars)"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sprig-tap" onClick={handleSignUp} disabled={busy}
                style={{ flex: 1, background: C.green, color: "#fff", border: "none", cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                <Plus size={14} /> Create account
              </button>
              <button className="sprig-tap" onClick={handleSignIn} disabled={busy}
                style={{ flex: 1, background: C.bg2, color: C.green, border: "none", cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                <LogIn size={14} /> Log in
              </button>
            </div>
          </>
        )}

        {!loading && user && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", background: C.bg, borderRadius: 11, marginBottom: 10 }}>
              <Mail size={14} color={C.muted} />
              <span style={{ flex: 1, fontSize: 12.5, color: C.ink, wordBreak: "break-all" }}>{user.email}</span>
            </div>
            {lastSynced && (
              <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 10 }}>
                Last synced: {new Date(lastSynced).toLocaleString()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="sprig-tap" onClick={handleSync} disabled={busy}
                style={{ background: C.green, color: "#fff", border: "none", cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                <CloudUpload size={14} /> Sync now
              </button>
              {!confirmRestore ? (
                <button className="sprig-tap" onClick={() => setConfirmRestore(true)} disabled={busy}
                  style={{ background: C.bg2, color: C.green, border: "none", cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                  <CloudDownload size={14} /> Restore from cloud
                </button>
              ) : (
                <div style={{ background: "#fdf6e9", border: `1px solid ${C.amber}55`, borderRadius: 11, padding: 11 }}>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8, lineHeight: 1.45 }}>
                    Restore will overwrite this device's local Vitae data.
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="sprig-tap" onClick={() => setConfirmRestore(false)} style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                    <button className="sprig-tap" onClick={handleRestore} style={{ flex: 1, background: C.amber, color: "#fff", border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 700 }}>Yes, restore</button>
                  </div>
                </div>
              )}
              {confirmSignOut ? (
                <div style={{ background: C.isDark ? "#2a200a" : "#fdf6e9", border: `1px solid ${C.amber}55`, borderRadius: 11, padding: 11 }}>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8, lineHeight: 1.45 }}>
                    Your data hasn't been synced. Log out and lose unsynced changes?
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="sprig-tap" onClick={() => setConfirmSignOut(false)} style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                    <button className="sprig-tap" onClick={handleSignOut} style={{ flex: 1, background: C.coral, color: "#fff", border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 700 }}>Log out anyway</button>
                  </div>
                </div>
              ) : (
                <button className="sprig-tap" onClick={handleSignOut} disabled={busy}
                  style={{ background: "transparent", color: C.muted, border: `1px solid ${C.line}`, cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                  <LogOut size={13} /> Log out
                </button>
              )}
            </div>
          </>
        )}

        {msg && (
          <div style={{ marginTop: 11, fontSize: 11.5, color: msg.ok ? C.greenSoft : C.coral, background: (msg.ok ? C.greenSoft : C.coral) + "11", border: `1px solid ${(msg.ok ? C.greenSoft : C.coral)}55`, borderRadius: 9, padding: "8px 10px", lineHeight: 1.45 }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* First-login choice prompt — shown once per account on this device. */}
      {showFirstChoice && user && (
        <div onClick={dismissFirstChoice} className="sprig-dim"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
          <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
            style={{ width: "100%", maxWidth: 440, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "20px 18px 22px", boxShadow: "0 -8px 30px rgba(0,0,0,.18)" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Welcome!</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14, lineHeight: 1.5 }}>
              Do you want to <b>sync this device's data</b> to your account, or <b>restore existing cloud data</b> onto this device?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="sprig-tap" onClick={() => { dismissFirstChoice(); handleSync(); }}
                style={{ background: C.green, color: "#fff", border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>
                <CloudUpload size={14} /> Upload this device
              </button>
              <button className="sprig-tap" onClick={() => { dismissFirstChoice(); setConfirmRestore(true); }}
                style={{ background: C.bg2, color: C.green, border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>
                <CloudDownload size={14} /> Restore cloud data
              </button>
              <button className="sprig-tap" onClick={dismissFirstChoice}
                style={{ background: "transparent", color: C.muted, border: "none", cursor: "pointer", padding: "9px 0", fontSize: 12, fontFamily: "DM Sans" }}>
                Decide later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Me / profile tab -------------- */
// More tab — extra main app pages only (NOT settings). Compact stacked links.
export function MoreTab({ onGoTargets, onGoHealth, onGoMind, onGoProgress, onGoSettings, onGoCoach, trackingPrefs = {}, onToggleTracking }) {
  const CATEGORY_LABELS = {
    nutrition: "Nutrition & Food", training: "Strength Training", sleep: "Sleep",
    habits: "Habits", recovery: "Recovery", health: "Health Markers",
    coach: "AI Coach", progress: "Body Progress", water: "Water Intake",
    supplements: "Supplements", alcohol: "Alcohol Tracking", movement: "Movement & Steps",
    cardio: "Cardio",
  };
  const inactive = Object.entries(CATEGORY_LABELS).filter(([k]) => trackingPrefs[k] === false);
  // Count nav tabs: Today, Food, Train, Sleep, (Coach?), More — cap is 5
  const navTabCount = ["nutrition","training","sleep","coach"].filter((k) => trackingPrefs[k] !== false).length + 2; // +2 for Today + More
  const coachFoldedIntoMore = navTabCount > 5 && trackingPrefs.coach !== false;
  const items = [
    ...(coachFoldedIntoMore && onGoCoach ? [["Coach", <Sparkles size={18} color={C.lime} />, onGoCoach, "AI-powered personalized advice"]] : []),
    ["Your targets", <Target size={18} color={C.lime} />, onGoTargets, "Calories, protein, macro goals"],
    ["Health markers", <HeartPulse size={18} color={C.greenSoft} />, onGoHealth, "Bloodwork, vitals & health score"],
    ["Mind & Habits", <Sparkles size={18} color={C.greenSoft} />, onGoMind, "Daily habits & consistency streak"],
    ["Progress", <TrendingUp size={18} color={C.greenSoft} />, onGoProgress, "Photos, weight & measurements"],
    ["Settings", <Settings size={18} color={C.muted} />, onGoSettings, "Account, tracking, preferences & data"],
  ];
  return (
    <div className="sprig-rise">
      <div style={{ margin: "4px 2px 18px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: -.3 }}>More</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>Targets, health markers, habits, and body progress.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {items.map(([title, icon, onClick, desc]) => (
          <button key={title} className="sprig-tap" onClick={onClick}
            style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 16px", boxShadow: C.shadow, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.bg2, display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{title}</div>
              {desc && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{desc}</div>}
            </div>
            <ChevronRight size={17} color={C.muted} />
          </button>
        ))}
      </div>

      {inactive.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "0 2px 10px", color: C.inkSoft }}>Not tracking right now</div>
          <div style={{ background: C.card, borderRadius: 18, padding: "4px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            {inactive.map(([k, label], i) => {
              const CAT_DESC = {
                nutrition: "Calories, protein, macros & meals",
                training: "Workouts, sets & strength progress",
                sleep: "Duration, debt & smart alarm",
                habits: "Daily habit streaks & consistency",
                recovery: "Readiness score & limiters",
                health: "Bloodwork & vital markers",
                coach: "Personalized AI advice",
                progress: "Progress photos & measurements",
                water: "Daily hydration tracking",
                supplements: "Daily supplement checklist",
                alcohol: "Drink logging & calorie impact",
                movement: "Steps & daily activity",
                cardio: "Runs, rides & cardio sessions",
              };
              const CAT_ICON = {
                nutrition: <Flame size={16} color={C.muted} />,
                training: <Dumbbell size={16} color={C.muted} />,
                sleep: <Moon size={16} color={C.muted} />,
                habits: <BookOpen size={16} color={C.muted} />,
                recovery: <Gauge size={16} color={C.muted} />,
                health: <HeartPulse size={16} color={C.muted} />,
                coach: <Sparkles size={16} color={C.muted} />,
                progress: <Camera size={16} color={C.muted} />,
                water: <Coffee size={16} color={C.muted} />,
                supplements: <Pill size={16} color={C.muted} />,
                alcohol: <span style={{ fontSize: 16, lineHeight: 1 }}>🍷</span>,
                movement: <Activity size={16} color={C.muted} />,
                cardio: <Activity size={16} color={C.muted} />,
              };
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < inactive.length - 1 ? `1px solid ${C.line}` : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: C.bg2, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    {CAT_ICON[k] || <Target size={16} color={C.muted} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.inkSoft }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{CAT_DESC[k] || "Not currently tracked"}</div>
                  </div>
                  {onToggleTracking && (
                    <button className="sprig-tap" onClick={() => { onToggleTracking(k, true); buzz("success"); }}
                      style={{ background: C.green + "18", border: `1px solid ${C.green}44`, borderRadius: 10, padding: "6px 13px", fontSize: 12, fontWeight: 700, color: C.greenSoft, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap" }}>
                      Start tracking
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5, padding: "0 2px" }}>
            Your data is never deleted — enabling a category shows it again instantly.
          </div>
        </div>
      )}
    </div>
  );
}

function MeTab({ view = "settings", onBack, profile, targets, onSave, themeMode = "dark", onSetTheme, onExportJSON, onExportCSV, onImportJSON, onResetData, onLoadDemo, reminders, onSaveReminders, sleepInfo, onResetOnboarding, rirPref, onSaveRirPref, trackingPrefs = {}, onSaveTrackingPrefs, onDevSeedFull, onDevSeedQL, onDevClearToday, user, onHealthSync, onSyncToCloud, onRestoreFromCloud }) {
  const saveRirPref = onSaveRirPref || (() => {});
  const [confirmResetOnb, setConfirmResetOnb] = useState(false);
  const importRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [devTaps, setDevTaps] = useState(0);
  const [showDev, setShowDev] = useState(false);
  const [legalView, setLegalView] = useState(null); // null | "privacy" | "terms" | "gdpr"
  const [p, setP] = useState(profile);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => { setP((x) => ({ ...x, [k]: v })); setSaved(false); };
  const live = computeTargets(p);
  const Row = ({ label, children }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13.5, color: C.inkSoft }}>{label}</span>{children}
    </div>
  );
  const Seg = ({ k, opts }) => (
    <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
      {opts.map(([v, lbl]) => (
        <button key={v} onClick={() => set(k, v)} className="sprig-tap"
          style={{ border: "none", cursor: "pointer", padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
            background: p[k] === v ? C.card : "transparent", color: p[k] === v ? C.green : C.muted, boxShadow: p[k] === v ? C.shadow : "none" }}>{lbl}</button>
      ))}
    </div>
  );
  const Num = ({ k, suffix }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="number" value={p[k]} onChange={(e) => set(k, +e.target.value)}
        style={{ width: 58, textAlign: "right", border: `1px solid ${C.line}`, borderRadius: 9, padding: "6px 8px", fontFamily: "DM Sans", fontSize: 14, color: C.ink, background: C.card, outline: "none" }} />
      <span style={{ fontSize: 12, color: C.muted, width: 22 }}>{suffix}</span>
    </div>
  );
  if (legalView === "gdpr") return <GDPRScreen onBack={() => setLegalView(null)} onExportJSON={onExportJSON} onExportCSV={onExportCSV} user={user} />;
  if (legalView === "privacy") return <PrivacyScreen onBack={() => setLegalView(null)} />;
  if (legalView === "terms") return <TermsScreen onBack={() => setLegalView(null)} />;

  return (
    <div className="sprig-rise">
      {onBack && (
        <button className="sprig-tap" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", cursor: "pointer", color: C.inkSoft, fontSize: 13.5, fontWeight: 600, fontFamily: "DM Sans", padding: "2px 2px 10px", margin: 0 }}>
          <ChevronLeft size={17} /> {view === "settings" ? "Back" : "More"}
        </button>
      )}
      {view === "settings" && (<>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, margin: "0 2px 4px", letterSpacing: -0.4, color: C.ink }}>Settings</div>
        <div style={{ fontSize: 12.5, color: C.muted, margin: "0 2px 16px" }}>Targets, tracking preferences, account, and data.</div>
      </>)}
      {view === "targets" && (<>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: "4px 2px 12px" }}>Your targets</div>

      <div style={{ background: C.green, borderRadius: 18, padding: 16, color: "#fff", display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        {[["Calories", live.calories], ["Protein", live.protein + "g"], ["Carbs", live.carbs + "g"], ["Fat", live.fat + "g"]].map(([l, v]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700 }}>{v}</div>
            <div style={{ fontSize: 10.5, opacity: .8, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 18, padding: "4px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <Row label="Goal"><Seg k="goal" opts={[["lose", "Cut"], ["maintain", "Maintain"], ["gain", "Bulk"]]} /></Row>
        <Row label="Sex"><Seg k="sex" opts={[["male", "M"], ["female", "F"]]} /></Row>
        <Row label="Activity"><Seg k="activity" opts={[["light", "Light"], ["moderate", "Mod"], ["active", "High"]]} /></Row>
        <Row label="Age"><Num k="age" suffix="yr" /></Row>
        <Row label="Weight"><Num k="weight" suffix="kg" /></Row>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 13.5, color: C.inkSoft }}>Height</span><Num k="height" suffix="cm" />
        </div>
        <Row label="Experience"><Seg k="experience" opts={[["beginner", "Beg"], ["intermediate", "Int"], ["advanced", "Adv"]]} /></Row>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
          <span style={{ fontSize: 13.5, color: C.inkSoft }}>Focus</span>
          <Seg k="focus" opts={[["gym", "Gym"], ["cardio", "Cardio"], ["sports", "Sport"], ["health", "Health"]]} />
        </div>
      </div>

      {/* advanced profile (optional, collapsed) */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8, fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, padding: "2px 2px 10px" }}>
          <Calculator size={15} color={C.greenSoft} /> Advanced profile <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 400, fontFamily: "DM Sans", marginLeft: "auto" }}>optional ▾</span>
        </summary>
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
            All optional — fill in what's useful. These refine your coaching but aren't needed to use Vitae.
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Sport</div>
            <select value={p.sport || ""} onChange={(e) => set("sport", e.target.value)}
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink }}>
              <option value="">— None / general —</option>
              {SPORTS.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </select>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Adds sport-specific tracking on Today and tailors training recommendations.</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Food preferences &amp; allergies</div>
            <textarea value={p.foodPrefs || ""} onChange={(e) => set("foodPrefs", e.target.value)} placeholder="e.g. vegetarian, lactose-free, no shellfish…"
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, minHeight: 44, resize: "vertical", lineHeight: 1.45 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Equipment available</div>
            <select value={p.equipment || "full"} onChange={(e) => set("equipment", e.target.value)}
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink }}>
              {EQUIPMENT.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </select>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Exercises that need missing equipment are hidden from the picker.</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Dietary preferences</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["halal", "Halal"], ["kosher", "Kosher"], ["pescatarian", "Pescatarian"], ["lactose_free", "Lactose-free"], ["gluten_free", "Gluten-free"]].map(([k, lbl]) => {
                const on = (p.diet || []).includes(k);
                return (
                  <button key={k} className="sprig-tap" onClick={() => set("diet", on ? (p.diet || []).filter((x) => x !== k) : [...(p.diet || []), k])}
                    style={{ border: "none", cursor: "pointer", padding: "6px 11px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, fontFamily: "DM Sans", background: on ? C.green : C.bg2, color: on ? "#fff" : C.muted }}>{lbl}</button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Allergies &amp; dislikes</div>
            <textarea value={p.allergies || ""} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. peanuts, shellfish, no mushrooms…"
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, minHeight: 44, resize: "vertical", lineHeight: 1.45 }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Weight unit</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[["kg", "kg"], ["lb", "lb"]].map(([k, lbl]) => (
                  <button key={k} className="sprig-tap" onClick={() => set("unit", k)}
                    style={{ flex: 1, border: "none", cursor: "pointer", padding: "8px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", background: (p.unit || "kg") === k ? C.green : C.bg2, color: (p.unit || "kg") === k ? "#fff" : C.muted }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Length unit</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[["cm", "cm"], ["in", "in"]].map(([k, lbl]) => (
                  <button key={k} className="sprig-tap" onClick={() => set("lengthUnit", k)}
                    style={{ flex: 1, border: "none", cursor: "pointer", padding: "8px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", background: (p.lengthUnit || "cm") === k ? C.green : C.bg2, color: (p.lengthUnit || "cm") === k ? "#fff" : C.muted }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Usual bedtime</div>
              <input type="time" value={p.usualBed || ""} onChange={(e) => set("usualBed", e.target.value)}
                style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Usual wake</div>
              <input type="time" value={p.usualWake || ""} onChange={(e) => set("usualWake", e.target.value)}
                style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
            Injuries, supplements, training splits, and blood markers each have their own dedicated section — find them in Health, Today (supplement stack), Train (routines &amp; templates), and Health → Blood work.
          </div>
        </div>
      </details>

      <button className="sprig-tap" onClick={() => { onSave(p); setSaved(true); }}
        style={{ ...btn(saved ? C.greenSoft : C.green, "#fff"), width: "100%", padding: "14px 0", marginTop: 16 }}>
        {saved ? <><Check size={16} /> Saved</> : "Save targets"}
      </button>
      </>)}

      {view === "settings" && (<>
      {/* ── APPEARANCE — always first, what users reach for first ── */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "4px 2px 10px" }}>Appearance</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Moon size={16} color={C.greenSoft} />
            <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Theme</span>
          </div>
          <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
            {[["dark", "Dark", Moon], ["light", "Light", Sun]].map(([v, lbl, Ic]) => {
              const on = themeMode === v;
              return (
                <button key={v} className="sprig-tap" onClick={() => onSetTheme && onSetTheme(v)}
                  style={{ border: "none", cursor: "pointer", padding: "7px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 6,
                    background: on ? C.card : "transparent", color: on ? C.green : C.muted, boxShadow: on ? C.shadow : "none" }}><Ic size={14} /> {lbl}</button>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          {themeMode === "dark" ? "Kiwi dark — deep forest green with glass cards." : "Light — clean white background with dark text. The green accent stays."}
        </div>
        {/* Detail level */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gauge size={16} color={C.greenSoft} />
            <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Detail level</span>
          </div>
          <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
            {[["simple", "Simple"], ["advanced", "Advanced"]].map(([v, lbl]) => {
              const on = (p.mode || "simple") === v;
              return (
                <button key={v} className="sprig-tap" onClick={() => { const np = { ...p, mode: v }; setP(np); onSave(np); }}
                  style={{ border: "none", cursor: "pointer", padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans",
                    background: on ? C.card : "transparent", color: on ? C.green : C.muted, boxShadow: on ? C.shadow : "none" }}>{lbl}</button>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          {(p.mode || "simple") === "simple"
            ? "Clean view: the numbers that matter day to day. Detailed breakdowns — micronutrients, muscle-by-muscle recovery, sleep stages, RIR and charts — stay tucked away."
            : "Full view: every metric is shown — micronutrient percentages, per-muscle recovery hours, sleep stages, RIR, estimated 1RMs and trend charts."}
        </div>
        {/* Haptics on/off */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} color={C.greenSoft} />
            <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Haptics</span>
          </div>
          <button className="sprig-tap" onClick={() => { const on = p.haptics === false; const np = { ...p, haptics: on }; setP(np); onSave(np); if (on) buzz("light"); }}
            style={{ position: "relative", width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: p.haptics === false ? C.bg2 : C.green, transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: p.haptics === false ? 3 : 21, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s" }} />
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Subtle vibration when you log, complete a set, or finish a rest timer. Only on supported devices.
        </div>
        {/* Show wins on/off */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={16} color={C.lime} />
            <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Show wins</span>
          </div>
          <button className="sprig-tap" onClick={() => { const on = p.showWins === false; const np = { ...p, showWins: on }; setP(np); onSave(np); if (on) buzz("light"); }}
            style={{ position: "relative", width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: p.showWins === false ? C.bg2 : C.green, transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: p.showWins === false ? 3 : 21, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s" }} />
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Quiet recognition for real progress — protein hits, PRs, sleep, consistency. Kudos are personal, never social. Workout records stay in history either way.
        </div>
      </div>

      {/* ── NOTIFICATIONS ── */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Notifications</div>
      <div style={{ background: C.card, borderRadius: 18, padding: "4px 0", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {[
          ["notifHydration", Droplets, "Morning hydration", "10:00 AM — daily reminder to drink water"],
          ["notifMeal",      Flame,    "Lunch logging",     "1:00 PM — log your lunch while it's fresh"],
          ["notifWorkout",   Dumbbell, "Training reminder", "6:30 PM — prompt to log a workout or steps"],
        ].map(([key, Ic, label, sub], i, arr) => {
          const on = p[key] !== false;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "18", display: "grid", placeItems: "center", flexShrink: 0, marginRight: 12 }}>
                <Ic size={16} color={C.greenSoft} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.inkSoft }}>{label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{sub}</div>
              </div>
              <button className="sprig-tap" onClick={() => { const np = { ...p, [key]: !on }; setP(np); onSave(np); }}
                style={{ width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: on ? C.green : C.bg2, position: "relative", transition: "background .2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.muted, margin: "6px 4px 0", lineHeight: 1.5 }}>
        Requires the native app. Notifications only work on Android and iOS.
      </div>

      {/* ── TRAINING PREFERENCES ── */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Training</div>
      {/* WORKOUT CALORIE ADJUSTMENT — Off / Conservative / Normal */}
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          How much extra to eat after a strength workout. Conservative is recommended — lifting burns less than fitness apps usually claim. Steps and cardio are tracked separately and don't change with this setting.
        </div>
        {(() => {
          const cur = profile?.workoutCalorieMode || "conservative";
          const OPTS = [
            ["off",          "Off",          "+0 kcal"],
            ["conservative", "Conservative", "+100 / +150 / +200"],
            ["normal",       "Normal",       "+150 / +250 / +350"],
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {OPTS.map(([k, lbl, sub]) => {
                const active = cur === k;
                return (
                  <button key={k} className="sprig-tap"
                    onClick={() => onSave({ ...profile, workoutCalorieMode: k })}
                    style={{ background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${active ? C.green : C.muted}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {active && <div style={{ width: 7, height: 7, borderRadius: 99, background: C.green }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>easy / normal / hard session → {sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* PREFERRED REP RANGE */}
      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: "18px 2px 8px", letterSpacing: .3, textTransform: "uppercase" }}>Rep range</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          Drives progressive-overload suggestions. When you hit the top of your range, Vitae advises adding a little weight.
        </div>
        {(() => {
          const cur = profile?.repRange || null;
          const OPTS = [[[5, 8], "5–8", "Strength"], [[8, 10], "8–10", "Strength + size"], [[10, 12], "10–12", "Hypertrophy"], [[12, 15], "12–15", "Endurance"]];
          return (
            <div style={{ display: "flex", gap: 7 }}>
              {OPTS.map(([range, lbl, sub]) => {
                const active = cur && cur[0] === range[0] && cur[1] === range[1];
                return (
                  <button key={lbl} className="sprig-tap" onClick={() => onSave({ ...profile, repRange: range, repRangeAsked: true })}
                    style={{ flex: 1, background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 4px", cursor: "pointer", textAlign: "center", fontFamily: "DM Sans" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? C.green : C.ink }}>{lbl}</div>
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{sub}</div>
                  </button>
                );
              })}
            </div>
          );
        })()}
        {!profile?.repRange && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 9 }}>Currently using smart per-exercise defaults. Pick a range to standardize it.</div>}
      </div>

      {/* RIR TRACKING */}
      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: "18px 2px 8px", letterSpacing: .3, textTransform: "uppercase" }}>Reps in reserve (RIR)</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          After each set, Vitae can ask how close to failure you were. This sharpens progression suggestions.
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Ask after sets</div>
        {(() => {
          const cur = rirPref?.trackRir || "always";
          const OPTS = [
            ["always",    "Every set",         "Most accurate"],
            ["hard_sets", "Working sets only", "Skip warmups"],
            ["off",       "Never",             "Rep count only"],
          ];
          return (
            <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
              {OPTS.map(([k, lbl, sub]) => {
                const active = cur === k;
                return (
                  <button key={k} className="sprig-tap" onClick={() => { const next = { ...(rirPref || {}), trackRir: k }; saveRirPref(next); }}
                    style={{ flex: 1, background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 4px", cursor: "pointer", textAlign: "center", fontFamily: "DM Sans" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? C.green : C.ink }}>{lbl}</div>
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{sub}</div>
                  </button>
                );
              })}
            </div>
          );
        })()}
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Intensity style</div>
        {(() => {
          const cur = rirPref?.intensityStyle || "balanced";
          const OPTS = [
            ["failure",          "To failure",    "Maximum effort every set"],
            ["close_to_failure", "Near failure",  "0–1 RIR, very hard"],
            ["balanced",         "Balanced",      "1–2 RIR, strong but controlled"],
            ["leave_reps",       "Leave reps",    "2–3 RIR, technique-first"],
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {OPTS.map(([k, lbl, sub]) => {
                const active = cur === k;
                return (
                  <button key={k} className="sprig-tap" onClick={() => { const next = { ...(rirPref || {}), intensityStyle: k }; saveRirPref(next); }}
                    style={{ background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${active ? C.green : C.muted}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {active && <div style={{ width: 7, height: 7, borderRadius: 99, background: C.green }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* DAY RESET MODE */}
      <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: "18px 2px 8px", letterSpacing: .3, textTransform: "uppercase" }}>Day reset</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          When your tracking day rolls over. Late-night food and drinks before the reset count toward the previous day.
        </div>
        {(() => {
          const cur = profile?.dayResetMode || "after-wake";
          const OPTS = [
            ["after-wake", "After wake-up / 04:00 fallback", "Resets when you wake, else 4 AM"],
            ["fixed-4am",  "Fixed 04:00",                    "Always resets at 4 AM"],
            ["midnight",   "Midnight",                       "Classic calendar day"],
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {OPTS.map(([k, lbl, sub]) => {
                const active = cur === k;
                return (
                  <button key={k} className="sprig-tap" onClick={() => onSave({ ...profile, dayResetMode: k })}
                    style={{ background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${active ? C.green : C.muted}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {active && <div style={{ width: 7, height: 7, borderRadius: 99, background: C.green }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* TIMERS & ALARM SOUND */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Timers &amp; alarm</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {/* rest timer toggles */}
        {[["restTimerSound", "Rest timer sound"], ["restTimerVibrate", "Rest timer vibration"]].map(([k, lbl]) => {
          const on = profile?.[k] !== false;
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 2px" }}>
              <span style={{ flex: 1, fontSize: 13, color: C.ink }}>{lbl}</span>
              <button className="sprig-tap" onClick={() => onSave({ ...profile, [k]: !on })}
                style={{ width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: on ? C.green : C.bg2, position: "relative", transition: "background .2s" }}>
                <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
              </button>
            </div>
          );
        })}
        {/* rest timer sound choice */}
        <div style={{ fontSize: 11.5, color: C.muted, margin: "10px 2px 6px" }}>Rest timer sound</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {ALARM_SOUNDS.map((s) => {
            const active = (profile?.restTimerSoundChoice || "beep") === s.id;
            return (
              <button key={s.id} className="sprig-tap"
                onClick={() => { onSave({ ...profile, restTimerSoundChoice: s.id }); playAlarmTone(s.id, profile?.alarmVolume ?? 0.7); }}
                style={{ background: active ? C.green : C.bg, color: active ? "#fff" : C.inkSoft, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 99, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans" }}>
                {s.label}
              </button>
            );
          })}
        </div>

        <div style={{ height: 1, background: C.line, margin: "12px 0" }} />

        {/* alarm sound choice */}
        <div style={{ fontSize: 11.5, color: C.muted, margin: "0 2px 6px" }}>Alarm sound</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {ALARM_SOUNDS.map((s) => {
            const active = (profile?.alarmSound || "bells") === s.id;
            return (
              <button key={s.id} className="sprig-tap"
                onClick={() => { onSave({ ...profile, alarmSound: s.id }); playAlarmTone(s.id, profile?.alarmVolume ?? 0.7); }}
                style={{ background: active ? C.green : C.bg, color: active ? "#fff" : C.inkSoft, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 99, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans" }}>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* alarm volume */}
        <div style={{ fontSize: 11.5, color: C.muted, margin: "0 2px 6px" }}>Alarm volume · {Math.round((profile?.alarmVolume ?? 0.7) * 100)}%</div>
        <input type="range" min="0" max="100" value={Math.round((profile?.alarmVolume ?? 0.7) * 100)}
          onChange={(e) => onSave({ ...profile, alarmVolume: (+e.target.value) / 100 })}
          style={{ width: "100%", accentColor: C.green }} />

        {/* test button */}
        <button className="sprig-tap" onClick={() => playAlarmTone(profile?.alarmSound || "bells", profile?.alarmVolume ?? 0.7)}
          style={{ ...btn(C.bg2, C.green), width: "100%", padding: "11px 0", marginTop: 12, fontSize: 13, fontWeight: 700 }}>
          <Play size={14} /> Test alarm sound
        </button>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.5, textAlign: "center" }}>
          Tap Test sound once to enable alarm audio (browsers require a tap first). Background alarms while the app is closed aren't reliable in a browser — keep Vitae open for the smart alarm.
        </div>
      </div>

      {/* ADVANCED */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Advanced</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 2px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.ink }}>Advanced mode</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Shows extra detail in scores, charts, and coach responses.</div>
          </div>
          <button className="sprig-tap" onClick={() => onSave({ ...profile, devMode: !profile?.devMode })}
            style={{ width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: profile?.devMode ? C.green : C.bg2, position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: profile?.devMode ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
          </button>
        </div>
        {/* Reset onboarding — re-runs the setup flow without deleting any logged data */}
        {onResetOnboarding && (
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}>
            {!confirmResetOnb ? (
              <button className="sprig-tap" onClick={() => setConfirmResetOnb(true)}
                style={{ width: "100%", background: "transparent", border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 12, padding: "11px 0", color: C.inkSoft, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <RotateCcw size={14} /> Reset onboarding
              </button>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>This will show the setup flow again. Your logged data will not be deleted.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="sprig-tap" onClick={() => setConfirmResetOnb(false)} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 13 }}>Cancel</button>
                  <button className="sprig-tap" onClick={() => { setConfirmResetOnb(false); onResetOnboarding(); }} style={{ ...btn(C.green, "#fff"), flex: 1, padding: "10px 0", fontSize: 13 }}>Show setup</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {onSaveTrackingPrefs && view === "settings" && (() => {
        const CATS = [
          ["nutrition",    "Nutrition & Food",     "Calories, protein, meals"],
          ["training",     "Strength Training",    "Workouts & recovery"],
          ["sleep",        "Sleep",                "Duration, debt, quality"],
          ["habits",       "Habits",               "Daily habit streaks"],
          ["recovery",     "Recovery score",       "Overall readiness"],
          ["health",       "Health Markers",       "Bloodwork & vitals"],
          ["coach",        "AI Coach",             "Personalized advice"],
          ["progress",     "Body Progress",        "Photos & measurements"],
          ["water",        "Water Intake",         "Hydration tracking"],
          ["supplements",  "Supplements",          "Daily supplement log"],
          ["alcohol",      "Alcohol Tracking",     "Drink logging"],
          ["movement",     "Movement & Steps",     "Steps & daily activity"],
          ["cardio",       "Cardio",               "Runs, rides, etc."],
        ];
        return (
          <>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Tracking preferences</div>
            <div style={{ background: C.card, borderRadius: 18, padding: "4px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 4 }}>
              <div style={{ fontSize: 11.5, color: C.muted, padding: "10px 0 8px", lineHeight: 1.5 }}>
                Disabling a category hides it everywhere. Your data is never deleted.
              </div>
              {CATS.map(([k, label, sub], i) => {
                const on = trackingPrefs[k] !== false;
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < CATS.length - 1 ? `1px solid ${C.line}` : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{sub}</div>
                    </div>
                    <button className="sprig-tap" onClick={() => onSaveTrackingPrefs({ ...trackingPrefs, [k]: !on })}
                      style={{ position: "relative", width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer",
                        background: on ? C.green : C.bg2, transition: "background .2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff",
                        transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {reminders && onSaveReminders && (
        <>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Reminders</div>
          <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
              Pick which reminders you want — Vitae will know to send them. Notifications fire in the iOS app, not the web preview, so for now this saves your preferences.
            </div>
            {(() => {
              const caffeineCut = sleepInfo?.rec?.caffeineCutoff != null ? minToLabel(sleepInfo.rec.caffeineCutoff) : "~14:30";
              const sleepRoutine = sleepInfo?.rec?.recBed != null ? minToLabel(sleepInfo.rec.recBed - 30) : "~21:30";
              const ROWS = [
                ["weightAM",       "Log weight",          "Daily at 8:00 AM"],
                ["water",          "Drink water",         "Every 2 hours during the day"],
                ["supps",          "Take supplements",    "Daily at 9:00 AM"],
                ["sleepRoutine",   "Sleep routine",       `${sleepRoutine}, 30 min before bed`],
                ["caffeineCutoff", "Stop caffeine",       caffeineCut],
                ["progressPhoto",  "Progress photo",      "Every 2 weeks"],
                ["workout",        "Workout reminder",    "Daily, based on your schedule"],
                ["weeklyReview",   "Weekly review",       "Sundays at 7:00 PM"],
              ];
              return ROWS.map(([k, lbl, when]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 4px", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{when}</div>
                  </div>
                  <button className="sprig-tap" onClick={() => onSaveReminders({ ...reminders, [k]: !reminders[k] })}
                    style={{ border: "none", cursor: "pointer", width: 44, height: 26, borderRadius: 99, background: reminders[k] ? C.green : C.bg2, position: "relative", transition: "background .2s" }}>
                    <span style={{ position: "absolute", top: 3, left: reminders[k] ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.15)", transition: "left .2s" }} />
                  </button>
                </div>
              ));
            })()}
          </div>
        </>
      )}

      {/* ACTIVITY SOURCES */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Activity sources</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <ActivitySourcesSection profile={profile} onSetSource={(id) => onSave({ ...profile, activitySourcePreference: id })} />
      </div>

      {/* HEALTH INTEGRATIONS */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Integrations</div>
      <HealthIntegrationCard onSync={onHealthSync} />

      {/* ACCOUNT (optional cloud sync) */}
      <AccountSection onSyncToCloud={onSyncToCloud} onRestoreFromCloud={onRestoreFromCloud} />

      {/* DATA & PRIVACY */}
      {onExportJSON && (
        <>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Data &amp; privacy</div>
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              <EyeOff size={15} color={C.greenSoft} style={{ flexShrink: 0 }} />
              <span>Your health data is synced to your account and stored securely on our servers. Food and supplement photos are analyzed in the moment and never stored.</span>
            </div>
            {/* GDPR rights button */}
            <button className="sprig-tap" onClick={() => setLegalView("gdpr")} style={{ ...btn(C.bg2, C.green), width: "100%", padding: "12px 16px", marginBottom: 8, justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><EyeOff size={15} /> Your data rights (GDPR)</span>
              <ChevronRight size={15} color={C.muted} />
            </button>
            {/* export */}
            <button className="sprig-tap" onClick={onExportJSON} style={{ ...btn(C.bg2, C.inkSoft), width: "100%", padding: "12px 0", marginBottom: 8 }}>
              <BarChart3 size={15} /> Export full backup (JSON)
            </button>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button className="sprig-tap" onClick={() => onExportCSV("workouts")} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 12 }}>Workouts CSV</button>
              <button className="sprig-tap" onClick={() => onExportCSV("weight")} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 12 }}>Weight CSV</button>
              <button className="sprig-tap" onClick={() => onExportCSV("nutrition")} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 12 }}>Food CSV</button>
            </div>
            {/* import */}
            <input ref={importRef} type="file" accept="application/json" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportJSON(f); }} />
            <button className="sprig-tap" onClick={() => importRef.current?.click()} style={{ ...btn(C.bg2, C.inkSoft), width: "100%", padding: "11px 0", fontSize: 13, marginBottom: 8 }}>
              <Plus size={14} /> Import a backup
            </button>
            {/* demo */}
            {onLoadDemo && (
              <button className="sprig-tap" onClick={onLoadDemo} style={{ width: "100%", background: "none", border: `1px dashed ${C.line}`, cursor: "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 600, color: C.greenSoft, fontFamily: "DM Sans", marginBottom: 6 }}>
                <Sparkles size={13} /> Load demo data (14 days)
              </button>
            )}
            {/* reset */}
            {!confirmReset ? (
              <button className="sprig-tap" onClick={() => setConfirmReset(true)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: C.coral, fontSize: 12.5, fontWeight: 600, padding: "8px 0", fontFamily: "DM Sans" }}>
                <Trash2 size={13} /> Reset all data
              </button>
            ) : (
              <div style={{ background: "#fdeee8", borderRadius: 12, padding: 12, marginTop: 4 }}>
                <div style={{ fontSize: 12, color: "#9a3d22", lineHeight: 1.5, marginBottom: 9 }}>This permanently deletes everything on this device. Export a backup first if you want to keep it. This can't be undone.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="sprig-tap" onClick={() => setConfirmReset(false)} style={{ ...btn(C.card, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 13 }}>Cancel</button>
                  <button className="sprig-tap" onClick={onResetData} style={{ ...btn(C.coral, "#fff"), flex: 1, padding: "10px 0", fontSize: 13 }}>Delete everything</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ABOUT ── */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>About</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px 12px", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Vitae</span>
          <span style={{ fontSize: 12, color: C.muted }}>v1.0 · health tracking</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 10 }}>
          <button onClick={() => setLegalView("privacy")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: C.inkSoft, fontFamily: "DM Sans", textAlign: "left", padding: "9px 2px", borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>
            Privacy Policy
          </button>
          <button onClick={() => setLegalView("terms")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: C.inkSoft, fontFamily: "DM Sans", textAlign: "left", padding: "9px 2px", borderBottom: `1px solid ${C.line}`, fontWeight: 500 }}>
            Terms of Service
          </button>
          <button onClick={() => setLegalView("gdpr")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: C.inkSoft, fontFamily: "DM Sans", textAlign: "left", padding: "9px 2px", fontWeight: 500 }}>
            Your data rights (GDPR)
          </button>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5, padding: "0 2px" }}>
          Targets use the Mifflin–St Jeor formula. Estimates are approximate — great for awareness, not medical precision.
        </div>
      </div>

      {/* Legacy legal links row (hidden — now in About card above) */}
      <div style={{ display: "none" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 18, paddingBottom: 4 }}>
        <button onClick={() => setLegalView("privacy")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: C.muted, fontFamily: "DM Sans", textDecoration: "underline" }}>
          Privacy Policy
        </button>
        <button onClick={() => setLegalView("terms")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: C.muted, fontFamily: "DM Sans", textDecoration: "underline" }}>
          Terms of Service
        </button>
      </div>
      </div>{/* end hidden legacy legal links */}

      {/* Hidden dev-tap easter egg — tap the version string 5× in About card */}
      <div
        style={{ height: 1, marginTop: 4, cursor: "default" }}
        onClick={() => {
          const next = devTaps + 1;
          setDevTaps(next);
          if (next >= 5) { setShowDev(true); setDevTaps(0); }
        }}
      />

      {showDev && (
        <div style={{ background: "#1a1a2e", border: `2px solid ${C.amber}`, borderRadius: 16, padding: 16, marginTop: 14, color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 700, color: C.amber }}>🛠 Dev tools</span>
            <button onClick={() => setShowDev(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="sprig-tap" onClick={onDevSeedFull}
              style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", cursor: "pointer" }}>
              Seed: Full exact day
            </button>
            <button className="sprig-tap" onClick={onDevSeedQL}
              style={{ background: "#3a86ff", color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", cursor: "pointer" }}>
              Seed: Quick Log day
            </button>
            <button className="sprig-tap" onClick={onDevClearToday}
              style={{ background: C.coral, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", cursor: "pointer" }}>
              Clear today
            </button>
            {onLoadDemo && (
              <button className="sprig-tap" onClick={onLoadDemo}
                style={{ background: "#7c5cbf", color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", cursor: "pointer" }}>
                Load demo data (14 days)
              </button>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 10 }}>Hidden dev panel — not visible to normal users</div>
        </div>
      )}
      </>)}
    </div>
  );
}

export default MeTab;
