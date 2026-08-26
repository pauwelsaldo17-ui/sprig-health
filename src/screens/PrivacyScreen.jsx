// src/screens/PrivacyScreen.jsx
import React from "react";
import { C } from "../theme.js";

const LAST_UPDATED = "23 August 2026";
const CONTACT_EMAIL = "privacy@vitae.app";

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8, fontFamily: "Fraunces, serif" }}>{title}</div>
      <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

export default function PrivacyScreen({ onBack }) {
  return (
    <div style={{
      minHeight: "100dvh", background: C.bg, fontFamily: "DM Sans, system-ui, sans-serif",
      paddingBottom: "env(safe-area-inset-bottom, 24px)",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: C.navBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "env(safe-area-inset-top, 16px) 20px 14px",
        borderBottom: `1px solid ${C.line}`,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.greenSoft, fontSize: 14, fontWeight: 600, fontFamily: "DM Sans, system-ui",
          padding: "4px 0", display: "flex", alignItems: "center", gap: 6,
        }}>
          ← Back
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Fraunces, serif", color: C.ink, marginTop: 8 }}>
          Privacy Policy
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Last updated {LAST_UPDATED}</div>
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 640, margin: "0 auto" }}>
        <Section title="Who we are">
          Vitae is a personal health and fitness tracking application. We are committed to
          protecting your privacy and being transparent about how we handle your data.
          For questions: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.greenSoft }}>{CONTACT_EMAIL}</a>
        </Section>

        <Section title="What data we collect">
          <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
            <li style={{ marginBottom: 6 }}><strong>Account data:</strong> Your email address and Google account ID, provided when you sign in.</li>
            <li style={{ marginBottom: 6 }}><strong>Health data:</strong> Food logs, workout records, sleep logs, weight entries, and other health metrics you choose to enter.</li>
            <li style={{ marginBottom: 6 }}><strong>AI interaction data:</strong> Food photos and coach questions you submit. These are sent to Anthropic for processing and are not stored by us beyond the current request.</li>
            <li style={{ marginBottom: 6 }}><strong>Device data:</strong> Push notification tokens (on native apps), used only to send reminders you configure.</li>
          </ul>
        </Section>

        <Section title="How we use your data">
          <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
            <li style={{ marginBottom: 6 }}>To provide the app's core features (logging, tracking, AI analysis).</li>
            <li style={{ marginBottom: 6 }}>To sync your data across devices via your account.</li>
            <li style={{ marginBottom: 6 }}>To send push notifications you have configured.</li>
            <li style={{ marginBottom: 6 }}>We do <strong>not</strong> sell your data, share it with advertisers, or use it for any purpose beyond operating the app.</li>
          </ul>
        </Section>

        <Section title="Data storage and security">
          Your health data is stored in Supabase (EU region by default), protected by row-level
          security so only your account can access your records. All data in transit is encrypted
          via TLS. We use Supabase Auth for identity — we never see or store your Google password.
        </Section>

        <Section title="AI processing">
          Food photos and coach questions are forwarded to Anthropic's Claude API for analysis.
          Anthropic's <a href="https://www.anthropic.com/privacy" target="_blank" rel="noreferrer" style={{ color: C.greenSoft }}>Privacy Policy</a>{" "}
          applies to that processing. We send only the image or text — no personally identifiable
          information is included in AI requests.
        </Section>

        <Section title="Your rights (GDPR)">
          If you are in the EU or EEA, you have the right to:
          <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
            <li style={{ marginBottom: 6 }}><strong>Access:</strong> Request a copy of all data we hold about you.</li>
            <li style={{ marginBottom: 6 }}><strong>Portability:</strong> Export your data in a machine-readable format (JSON).</li>
            <li style={{ marginBottom: 6 }}><strong>Erasure:</strong> Request deletion of your account and all associated data.</li>
            <li style={{ marginBottom: 6 }}><strong>Correction:</strong> Update inaccurate data directly in the app.</li>
            <li style={{ marginBottom: 6 }}><strong>Object:</strong> Object to processing in cases where we rely on legitimate interests.</li>
          </ul>
          You can export or delete your data directly in the app (More → Account → Data & Privacy).
          For other requests: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.greenSoft }}>{CONTACT_EMAIL}</a>
        </Section>

        <Section title="Data retention">
          We retain your data for as long as your account is active. If you delete your account,
          all your health data is permanently deleted within 30 days. Anonymised aggregate
          statistics (no personal data) may be retained for product analytics.
        </Section>

        <Section title="Third-party services">
          <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
            <li style={{ marginBottom: 6 }}><strong>Supabase</strong> — database and authentication</li>
            <li style={{ marginBottom: 6 }}><strong>Anthropic</strong> — AI food analysis and coaching</li>
            <li style={{ marginBottom: 6 }}><strong>RevenueCat</strong> — subscription management</li>
            <li style={{ marginBottom: 6 }}><strong>Google</strong> — Sign-In authentication</li>
          </ul>
        </Section>

        <Section title="Changes to this policy">
          We will notify you of significant changes via the app or email. Continued use of Vitae
          after changes constitutes acceptance of the updated policy.
        </Section>

        <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 32 }}>
          Questions? <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.greenSoft }}>{CONTACT_EMAIL}</a>
        </div>
      </div>
    </div>
  );
}
