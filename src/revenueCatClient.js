// src/revenueCatClient.js
//
// RevenueCat web SDK wrapper. Lazy-initialised so the SDK is never loaded
// until the user actually reaches a paywalled feature.
//
// Setup (one-time):
//   1. Create a RevenueCat account at https://www.revenuecat.com
//   2. Add a Web Billing project and copy the Public SDK Key (starts with "rcb_")
//   3. In Vercel → Settings → Environment Variables add:
//        VITE_REVENUECAT_WEB_KEY = rcb_...
//   4. In RevenueCat, create a Product (e.g. "vitae_premium_monthly") and an
//      Entitlement named "premium" that includes that product.
//   5. Redeploy.
//
// On iOS/Android use @revenuecat/purchases-capacitor instead (loaded natively
// by the Xcode/Android Studio build — this file is web-only).

import { Purchases } from "@revenuecat/purchases-js";

const WEB_KEY = import.meta.env.VITE_REVENUECAT_WEB_KEY;
const ENTITLEMENT_ID = "premium";

let _purchases = null;

export function rcConfigured() {
  return !!WEB_KEY;
}

export async function getRCPurchases(userId) {
  if (!WEB_KEY) return null;
  if (_purchases) return _purchases;
  try {
    _purchases = Purchases.configure(WEB_KEY, userId || "anonymous");
    return _purchases;
  } catch (e) {
    console.error("[rc] configure failed:", e?.message || e);
    return null;
  }
}

// Returns true if the user currently has an active "premium" entitlement.
export async function hasPremium(userId) {
  try {
    const rc = await getRCPurchases(userId);
    if (!rc) return false;
    const { customerInfo } = await rc.getCustomerInfo();
    return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  } catch (e) {
    console.warn("[rc] hasPremium check failed:", e?.message || e);
    return false;
  }
}

// Returns the available offerings (packages) from RevenueCat.
export async function getOfferings(userId) {
  try {
    const rc = await getRCPurchases(userId);
    if (!rc) return null;
    return await rc.getOfferings();
  } catch (e) {
    console.warn("[rc] getOfferings failed:", e?.message || e);
    return null;
  }
}

// Purchase a package. Returns { ok: true } or { ok: false, error }.
export async function purchasePackage(pkg, userId) {
  try {
    const rc = await getRCPurchases(userId);
    if (!rc) return { ok: false, error: "RevenueCat not configured." };
    await rc.purchase({ rcPackage: pkg });
    return { ok: true };
  } catch (e) {
    if (e?.userCancelled) return { ok: false, error: "cancelled" };
    return { ok: false, error: e?.message || "Purchase failed." };
  }
}
