# Sleep intelligence (wearable-free)

Goal: know each night's sleep with almost no effort, from an iPhone alone. No watch, ring or
sleep wearable is ever required. Deterministic logic lives in `src/utils/vitaeCalc.js`
("sleep intelligence"); the background path is mirrored in Swift where noted.

## What already existed (audit, 2026-10-24)

| Area | Status |
|------|--------|
| Apple Health sleep import (`healthSleepSessions`, `mergeHealthSleep`) incl. the iPhone's own "time in bed" from Sleep Schedule / Bedtime | Works; background delivery via `SleepBackgroundSync.swift` |
| Phone-only estimate from Core Motion + step history (`phoneSleepNights`, `PhoneSleepEstimator.swift`) | Works in background; saved as `phone_estimate`, never asked to confirm |
| Widget + one morning notification | Works (TestFlight-verified) |
| Rise-style debt, energy schedule, habits, suggested bedtime (`recommend`) | Works; bedtime uses the plain 7-night wake mean (ignores weekday vs weekend) |
| Sleep timer ("sleep mode") with mic movement sensing + smart alarm | **Only works while Vitae stays open in the foreground**: JS timers and Web Audio stop when the phone locks or the app backgrounds. The UI did not say so |
| "Sleep estimate from alarm" card | Assumed you woke at your alarm time and went to bed at your average |
| Day boundary (`getSprigDate`) | Uses the wake time only for wakes 03:00–11:00 on the same calendar day; otherwise 04:00. **Night-shift workers (sleep 08:00–15:00) get a reset at 04:00 in the middle of their shift** |
| Consistency, regularity, trends, goal progress | Only a consistency term inside the nightly score |

## iOS reality (what third-party apps can actually use)

- **Apple Health**: sleep samples incl. iPhone "in bed" from Sleep Schedule; step samples; background delivery (`HKObserverQuery`), at most hourly for steps.
- **Core Motion activity history** (`CMMotionActivityManager.queryActivityStarting`): ~7 days of stationary / walking / driving, queryable later without running at night. Privacy-preserving: on-device, no audio, no location.
- **Not available**: screen lock/unlock events, charging history, other apps' usage, continuous background microphone or accelerometer sampling. We don't pretend to use them.
- **Alarms**: since iOS 26, **AlarmKit** lets an app schedule real system alarms (ring through Silent and Focus, appear on the Lock Screen) with user permission. Before iOS 26 the only option is a local notification, which plays its sound once — not an alarm. Background JS never runs reliably.

## What this change adds

1. **Learned schedule** (`sleepPattern`): circular mean bed/wake for work days and free days separately (from the last 28 days of main sleeps), variability, chronotype midpoint, social jet lag, and day-sleeper detection (main-sleep midpoint between 08:00 and 18:00 → overnight-shift pattern).
2. **Regularity** (`sleepRegularity`): Sleep Regularity Index (Phillips et al. 2017) — the % of 5-minute epochs in the same state (asleep/awake) 24 h apart, over consecutive day pairs with data in the last 14 days; plus bed/wake time spread. 0–100.
3. **Trends + goal progress** (`sleepTrends`, `sleepGoalProgress`): 7- vs 28- vs 90-day averages of duration, bedtime and wake time; nights meeting your need this week; streak.
4. **Morning check-in** (`likelySleepPeriod`): when last night isn't from Apple Health or your own log, the Today and Sleep tabs show one card: *"Slept ~23:40 → 07:05?"* with **Looks right** / **Adjust**. Evidence order: phone motion estimate > your usual schedule for that weekday > nothing (no card — never invented from the alarm alone). Confirming marks the log `userConfirmed`; adjusting makes it your own (`edited`), which Health never overwrites.
5. **Suggested bedtime** uses tomorrow's learned wake time (work vs free day) and the sleep need + debt pay-down.
6. **Day boundary** (`sprigDateFor`, moved from `App.jsx` into `vitaeCalc.js` with tests): the Sprig day starts at the wake time of your latest main sleep (≥ 3 h, not a nap) **at any hour**, for up to 20 h after that wake; otherwise the 04:00 fallback. Same result as before for normal schedules; night-shift workers no longer reset mid-shift.
7. **Honest alarms**
   - iOS 26+: Vitae schedules a real **system alarm** (AlarmKit) at your latest wake time on the selected days. It rings even if Vitae is closed or the phone is locked.
   - Older iOS: a **backup notification** at that time (one sound, not a loud alarm), labeled as such.
   - The **smart window** (light-phase wake via mic movement or 90-min cycles) works only while Vitae stays open on the nightstand; the UI says so. Ending sleep mode in the app skips today's system alarm.
8. **Integration**: pattern, regularity, trend and goal progress go into `sleepInfo` (available to every screen and score), tonight's bedtime and the energy schedule (via the learned wake time), the habit timings that hang off them, and the AI coach context (schedule, regularity, trend, last night's source). Recovery and nutrition keep using last night + debt as before.

## Uncertainty

- Every inferred night carries `source` (`health_sync` / `phone_estimate` / `estimate`) and confidence; estimated nights show "~".
- Missing nights never create debt (unchanged) and never count against regularity (only consecutive day pairs with data are compared).
- With < 5 main sleeps in 28 days the pattern reports `confidence: "low"` and the UI hides schedule-based suggestions.

## Native verification required (TestFlight)

See `docs/testing.md` → Native checklist: AlarmKit permission + ring with Vitae closed and phone locked; backup notification on iOS < 26; morning check-in after a phone-only night; night-shift day boundary.
