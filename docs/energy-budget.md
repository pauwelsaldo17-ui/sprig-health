# Energy budget: maintenance, activity and daily calorie targets

Phone-only by design: no heart rate, no wearable. Everything numeric is deterministic
(`src/utils/vitaeCalc.js`, section "energy budget"); the AI coach only receives the result.

## Audit of the previous logic (2026-10-24)

| # | Problem | Effect |
|---|---------|--------|
| 1 | `computeTargets` = Mifflin × activity factor (1.2–1.725). The factor already includes the user's usual exercise, yet `calorieAdjustment` added the **full** kcal of every cardio, sport and strength session on top | Exercise counted twice on every training day |
| 2 | Sport/cardio kcal were **gross** MET kcal (MET × kg × h), which includes the resting energy already in BMR | ~1 MET × duration counted twice |
| 3 | Step delta = today's steps − full-day baseline, evaluated live | Every morning the budget dropped by 150–300 kcal ("low movement today") |
| 4 | Walking/running sessions added kcal **and** their steps added kcal | Ambulatory workouts counted twice |
| 5 | Overlapping app logs (strength workout + "gym" sport session) both counted; Health workouts used Apple's active energy *or* gross MET kcal without marking which | Duplicates, inconsistent units |
| 6 | Weight trend only produced a "Try X kcal" suggestion; maintenance never calibrated | Targets stay wrong when the formula is wrong for the person |
| 7 | Macros fixed to the base target; the Today macro card used its own 65/35 split | Carbs/fat didn't follow the day's budget; two different numbers on screen |
| 8 | Fixed −450 / +350 kcal for cut / bulk regardless of body size or experience | Too aggressive for small users, too small for large ones |
| 9 | No way to switch the moving target off (only the strength-workout Off/Conservative/Normal setting) | |

## Model

```
maintenance = BMR × PAL(activity level)                    prior, unchanged from before
            + w_steps × (avg daily NEAT − typical NEAT for that level)
            + w_ex    × (avg daily exercise − typical exercise for that level)
            + calibration offset                             from weight trend + intake
stable target = maintenance + goal adjustment                (never below max(BMR, 1200/1500))
dynamic target = stable + f(goal) × (today's activity credit − average activity)
```

- **BMR**: Mifflin-St Jeor.
- **NEAT from steps**: net walking cost 0.5 kcal per kg per km (ACSM: 0.1 ml O₂·kg⁻¹·m⁻¹).
  Distance comes from Apple Health walking+running distance when available, otherwise
  steps × stride (height × 0.415 / 0.413).
- **Exercise**: always *net* kcal, (MET − 1) × kg × h, with a low/high range.
  - Sport/cardio: MET from `SPORTS_LIBRARY` / cardio intensity, ±25 %.
  - Strength (Sprig workout): MET 3.5–6.0 from set density, effort (RIR ≤ 1 / failure) and
    volume load per minute relative to body weight; duration from the log or ~2.5 min/set;
    ±35 %. Load × reps is *not* converted to joules: external work is a poor predictor of
    lifting energy. `workoutCalorieMode`: off → 0, conservative → low end, normal → central
    (the same value feeds the training average, so the dynamic days still average out).
  - Apple Health workouts: the workout's active energy (`healthKcal`, already net of basal),
    ±25 %, clamped to a plausible maximum.
  - Plausibility cap for any session: MET 16 equivalent.
- **No double counting**
  - Overlapping sessions (≥ 50 % of the shorter one) count once: Sprig strength >
    Sprig sport/cardio > Apple Health; Health workouts overlapping an app log are also not
    imported (existing rule).
  - Steps estimated inside walking/running/hiking sessions are removed from NEAT.
  - Apple Health "active energy" is shown but **never added**: on an iPhone it is itself an
    estimate from the same steps and workouts.
  - The stable target uses averages of *previous complete days*; today's activity changes
    only the dynamic target.
- **Averages**: steps over the last 28 days with data (days < 300 steps or > 60 000 are
  treated as missing, not zero); exercise over the last 28 app days (rest days are real
  zeros). Weights `w = days / 14` (steps) and `days / 28` (exercise) shrink toward the
  activity level's typical values while history is short. Each delta is capped at ±35 % BMR.
- **Dynamic credit during the day**: today's NEAT and exercise are credited as
  `max(actual so far, average × fraction of the waking day elapsed)`, so the budget does not
  drop in the morning; by bedtime the credit equals the real value. Over a typical week the
  dynamic targets average to the stable one.
- **Damping** `f`: cut 0.5, maintain/health 0.75, bulk 0.85. Change capped at +600 / −400 kcal.
- **Goal adjustment**: cut −0.5 % body weight/week (kg × 5.5 kcal/day, 300–750, ≤ 25 % of
  maintenance); bulk +0.5 / 0.35 / 0.25 %/week for beginner / intermediate / advanced
  (kg × 5.5 / 3.85 / 2.75, 150–500); maintain and general health 0.
- **Macros**: protein g/kg (cut 2.0, bulk 1.9, maintain 1.7, general health 1.4) on a
  reference weight capped at BMI 27; fat 27 % of kcal, at least 0.6 g/kg; carbs = rest.
  Dynamic extra or fewer calories go to carbs (then fat), never protein.
- **Calibration**: once per day, from the previous 21 days. Needs ≥ 8 complete intake days
  (≥ max(800, 55 % of target); incomplete days are ignored) and ≥ 4 weigh-ins spanning
  ≥ 9 days. Observed maintenance = average intake − weight slope × 7700 kcal/kg; rejected if
  outside BMR × 1.0–2.6. The offset moves 25 % of the way to the new estimate, at most
  ±60 kcal per day, total within ±max(500, 20 % of maintenance). State in
  `sprig_energy_cal_v1`.

## Storage

| Key | Shape |
|-----|-------|
| `sprig_activity_days_v1` | `[{ date, steps, distanceM?, activeKcal? }]` by wake date, last 120 days; filled by Apple Health sync and manual steps; backfilled once from `sprig_daily_*` |
| `sprig_energy_cal_v1` | `{ offset, date, observed?, target?, days?, weighIns? }` |
| `profile.calorieMode` | `"dynamic"` (default, as before) or `"stable"` |

## Known limits

- Intake under-reporting is absorbed by calibration: the budget is relative to what is logged.
- 7700 kcal/kg is a mixed-tissue average; early weeks of a cut (water/glycogen) are damped
  by the slow update rate.
- Apple Health distance needs a new read permission (`distance`); without it the stride
  estimate is used.
