// src/screens/TermsScreen.jsx
import React from "react";
import { C } from "../theme.js";

const LAST_UPDATED = "23 August 2026";
const CONTACT_EMAIL = "legal@vitae.app";

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8, fontFamily: "Fraunces, serif" }}>{title}</div>
      <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

export default function TermsScreen({ onBack }) {
  return (
    <div style={{
      minHeight: "100dvh", background: C.bg, fontFamily: "DM Sans, system-ui, sans-serif",
      paddingBottom: "env(safe-area-inset-bottom, 24px)",
    }}>
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
          Terms of Service
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Last updated {LAST_UPDATED}</div>
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 640, margin: "0 auto" }}>
        <Section title="Acceptance">
          By creating an account and using Vitae, you agree to these Terms of Service.
          If you do not agree, do not use the app.
        </Section>

        <Section title="What Vitae is">
          Vitae is a personal health and fitness tracking tool. It is designed to help you
          log food, workouts, and sleep — and to provide AI-assisted coaching based on your data.
          It is <strong>not a medical device</strong> and does not provide medical advice,
          diagnosis, or treatment.
        </Section>

        <Section title="Not medical advice">
          <strong style={{ color: C.coral }}>Important:</strong> Vitae's AI coaching, nutrition
          estimates, and recovery recommendations are for informational purposes only. They are
          not a substitute for professional medical, nutritional, or fitness advice. Always
          consult a qualified professional before making significant changes to your diet,
          exercise, or treatment plan. If you experience pain, injury, or unusual symptoms,
          stop activity and seek medical advice.
        </Section>

        <Section title="Your account">
          You are responsible for maintaining the security of your account and for all activity
          that occurs under it. You must be at least 16 years old to use Vitae.
          Provide accurate information; do not impersonate others or create accounts for others.
        </Section>

        <Section title="Acceptable use">
          You may not:
          <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
            <li style={{ marginBottom: 6 }}>Use Vitae for any unlawful purpose.</li>
            <li style={{ marginBottom: 6 }}>Attempt to reverse-engineer, scrape, or abuse the service.</li>
            <li style={{ marginBottom: 6 }}>Share API keys, credentials, or subscription access with others.</li>
            <li style={{ marginBottom: 6 }}>Submit content that is harmful, misleading, or violates others' rights.</li>
          </ul>
        </Section>

        <Section title="Subscriptions and billing">
          Premium features require a paid subscription. Subscriptions renew automatically unless
          cancelled before the renewal date. Refunds are subject to App Store / Play Store /
          payment provider policies. We reserve the right to change prices with 30 days' notice.
        </Section>

        <Section title="AI accuracy">
          AI-generated nutrition estimates are approximations. They may not be accurate for every
          food, brand, or serving size. Always verify calorie and nutrient data for medical or
          clinical purposes. We are not liable for decisions made based on AI-generated data.
        </Section>

        <Section title="Data and privacy">
          Our Privacy Policy governs how we collect and use your data and is incorporated into
          these Terms by reference.
        </Section>

        <Section title="Service availability">
          We aim for high availability but do not guarantee uninterrupted access. We may modify,
          suspend, or discontinue features with reasonable notice. We will make reasonable efforts
          to preserve your data during transitions.
        </Section>

        <Section title="Limitation of liability">
          To the maximum extent permitted by law, Vitae and its operators are not liable for
          indirect, incidental, or consequential damages arising from your use of the service.
          Our total liability is limited to the amount you paid us in the 12 months preceding
          the claim.
        </Section>

        <Section title="Governing law">
          These Terms are governed by the laws of Belgium (EU). Disputes will be resolved in
          the courts of Belgium, except where mandatory consumer protection laws in your
          jurisdiction apply.
        </Section>

        <Section title="Changes">
          We may update these Terms. We will notify you of material changes via the app or email.
          Continued use after changes constitutes acceptance.
        </Section>

        <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 32 }}>
          Questions? <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.greenSoft }}>{CONTACT_EMAIL}</a>
        </div>
      </div>
    </div>
  );
}
