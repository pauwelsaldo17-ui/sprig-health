import Foundation
import CoreMotion
import HealthKit

/// Phone-only sleep (no wearable): the iPhone keeps Core Motion activity history (walking,
/// running, driving, cycling) and step samples even while Vitae is closed. Sleep is the long
/// overnight stretch with no movement, bounded by the last movement before bed and the first
/// movement after waking.
///
/// The estimate itself mirrors phoneSleepNights() in src/utils/vitaeCalc.js (unit-tested there);
/// keep the constants and rules in sync.
final class PhoneSleepEstimator {
    static let shared = PhoneSleepEstimator()

    private let motion = CMMotionActivityManager()
    private let healthStore = HKHealthStore()
    private let queue = OperationQueue()

    // Same as PHONE_SLEEP in vitaeCalc.js
    static let minSleepMin = 180.0
    static let maxSleepMin = 840.0
    static let latencyMin = 15.0
    static let blipMin = 8.0
    static let nightReachMin = 240.0
    static let blipReachMin = 180.0
    static let minSteps = 8.0

    struct Interval { var s: Date; var e: Date }

    // MARK: - Motion permission + history

    /// "authorized" | "denied" | "restricted" | "notDetermined" | "unavailable"
    static func motionStatus() -> String {
        guard CMMotionActivityManager.isActivityAvailable() else { return "unavailable" }
        switch CMMotionActivityManager.authorizationStatus() {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default: return "notDetermined"
        }
    }

    /// Movement intervals from Core Motion history (iOS keeps about a week).
    /// The first call shows the Motion & Fitness permission prompt.
    func motionActive(from: Date, to: Date, completion: @escaping ([Interval]) -> Void) {
        guard CMMotionActivityManager.isActivityAvailable() else { completion([]); return }
        motion.queryActivityStarting(from: from, to: to, to: queue) { activities, _ in
            let list = activities ?? []
            var out: [Interval] = []
            for (i, a) in list.enumerated() {
                let moving = a.walking || a.running || a.cycling || a.automotive
                guard moving, a.confidence != .low else { continue }
                let end = i + 1 < list.count ? list[i + 1].startDate : to
                if end > a.startDate { out.append(Interval(s: a.startDate, e: end)) }
            }
            completion(out)
        }
    }

    /// Step samples from Apple Health (the iPhone counts steps on its own) as movement intervals.
    func stepActive(from: Date, to: Date, completion: @escaping ([Interval]) -> Void) {
        guard HKHealthStore.isHealthDataAvailable(),
              let type = HKObjectType.quantityType(forIdentifier: .stepCount) else { completion([]); return }
        let predicate = HKQuery.predicateForSamples(withStart: from, end: to, options: [])
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
            let out = (samples as? [HKQuantitySample] ?? []).compactMap { s -> Interval? in
                guard s.quantity.doubleValue(for: .count()) >= Self.minSteps else { return nil }
                let end = s.endDate > s.startDate ? s.endDate : s.startDate.addingTimeInterval(60)
                return Interval(s: s.startDate, e: end)
            }
            completion(out)
        }
        healthStore.execute(query)
    }

    /// Last night estimated from motion + steps over the last 36 h (nil if none yet).
    func estimateLastNight(now: Date = Date(), usualMidMin: Int?, completion: @escaping (SleepLastNight?) -> Void) {
        let from = now.addingTimeInterval(-36 * 3600)
        motionActive(from: from, to: now) { motion in
            self.stepActive(from: from, to: now) { steps in
                let nights = Self.nights(active: motion + steps, usualMidMin: usualMidMin, now: now)
                guard let last = nights.last, now.timeIntervalSince(last.e) < 24 * 3600 else { completion(nil); return }
                let span = last.e.timeIntervalSince(last.s) / 60
                completion(SleepLastNight(
                    asleepMin: Int(max(0, span - Self.latencyMin).rounded()),
                    bedTs: last.s.timeIntervalSince1970,
                    wakeTs: last.e.timeIntervalSince1970,
                    updatedAt: now.timeIntervalSince1970,
                    estimated: true
                ))
            }
        }
    }

    // MARK: - Estimate (port of phoneSleepNights)

    private static func clockMin(_ d: Date) -> Double {
        let c = Calendar.current.dateComponents([.hour, .minute], from: d)
        return Double((c.hour ?? 0) * 60 + (c.minute ?? 0))
    }
    private static func circDiff(_ a: Double, _ b: Double) -> Double {
        let d = abs(a - b).truncatingRemainder(dividingBy: 1440)
        return min(d, 1440 - d)
    }
    private static func midOf(_ x: Interval) -> Double {
        clockMin(Date(timeIntervalSince1970: (x.s.timeIntervalSince1970 + x.e.timeIntervalSince1970) / 2))
    }

    static func nights(active: [Interval], usualMidMin: Int?, now: Date) -> [Interval] {
        let sorted = active
            .filter { $0.e > $0.s && $0.s <= now }
            .map { Interval(s: $0.s, e: min($0.e, now)) }
            .sorted { $0.s < $1.s }
        var merged: [Interval] = []
        for x in sorted {
            if let last = merged.last, x.s.timeIntervalSince(last.e) < 120 {
                merged[merged.count - 1].e = max(last.e, x.e)
            } else {
                merged.append(x)
            }
        }
        var mid: Double? = usualMidMin.map(Double.init)
        if mid == nil {
            var best: Interval?
            for i in 1..<max(1, merged.count) {
                let g = Interval(s: merged[i - 1].e, e: merged[i].s)
                let len = g.e.timeIntervalSince(g.s)
                if len <= maxSleepMin * 60, best == nil || len > best!.e.timeIntervalSince(best!.s) { best = g }
            }
            if let b = best, b.e.timeIntervalSince(b.s) >= minSleepMin * 60 { mid = midOf(b) }
        }
        let kept = merged.filter { x in
            let short = x.e.timeIntervalSince(x.s) < blipMin * 60
            guard short, let m = mid else { return true }
            return circDiff(midOf(x), m) > blipReachMin
        }
        var byDate: [String: Interval] = [:]
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        for i in 1..<max(1, kept.count) {
            let g = Interval(s: kept[i - 1].e, e: kept[i].s)
            let len = g.e.timeIntervalSince(g.s) / 60
            if len < minSleepMin || len > maxSleepMin { continue }
            if let m = mid, circDiff(midOf(g), m) > nightReachMin { continue }
            let key = fmt.string(from: g.e)
            if let cur = byDate[key], cur.e.timeIntervalSince(cur.s) / 60 >= len { continue }
            byDate[key] = g
        }
        return byDate.values.sorted { $0.s < $1.s }
    }
}
