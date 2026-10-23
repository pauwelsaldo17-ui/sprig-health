import Foundation
import HealthKit
import UserNotifications
import WidgetKit

/// Keeps "last night" current even when Vitae is never opened.
///
/// Phone-only, no wearable needed. iOS wakes the app in the background when new sleep (e.g. the
/// iPhone's own "time in bed") or new steps reach Apple Health (HKObserverQuery + background
/// delivery). We take last night from Apple Health, or estimate it from the phone's motion +
/// steps (PhoneSleepEstimator), store it in the App Group for the widget, and post one
/// "Last night: 7h 25m" notification per morning. The web layer is suspended in the background.
final class SleepBackgroundSync {
    static let shared = SleepBackgroundSync()

    private let store = HKHealthStore()
    private var started = false

    // HKCategoryValueSleepAnalysis raw values: 0 inBed, 1 asleep(Unspecified), 2 awake,
    // 3 asleepCore, 4 asleepDeep, 5 asleepREM. Raw values avoid iOS 16-only symbols (target is 15).
    private static let asleepValues: Set<Int> = [1, 3, 4, 5]
    private static let inBedValue = 0
    private static let sessionGap: TimeInterval = 45 * 60      // same as healthSleepSessions() in vitaeCalc.js
    private static let mainSleepMin = 180                      // shorter sessions are naps
    private static let freshWakeWindow: TimeInterval = 6 * 3600 // only notify for this morning, never backfills

    /// Call from application(_:didFinishLaunchingWithOptions:) so background launches re-register.
    func start() {
        guard !started, HKHealthStore.isHealthDataAvailable(),
              let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis),
              let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else { return }
        started = true
        // Sleep: immediate (e.g. the iPhone's own "time in bed"). Steps: iOS delivers at most
        // hourly — the first steps of the morning close the night for the phone-only estimate.
        let watched: [(HKSampleType, HKUpdateFrequency)] = [(sleepType, .immediate), (stepType, .hourly)]
        for (type, frequency) in watched {
            let observer = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, completion, error in
                // Always call completion, or HealthKit backs off and eventually stops waking us.
                guard let self = self, error == nil else { completion(); return }
                self.refresh(notify: true) { completion() }
            }
            store.execute(observer)
            store.enableBackgroundDelivery(for: type, frequency: frequency) { _, _ in }
        }
    }

    /// Re-reads the last 36 h of sleep, updates the widget and (optionally) notifies.
    func refresh(notify: Bool, completion: (() -> Void)? = nil) {
        guard HKHealthStore.isHealthDataAvailable(),
              let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { completion?(); return }
        let now = Date()
        let predicate = HKQuery.predicateForSamples(withStart: now.addingTimeInterval(-36 * 3600), end: now, options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { [weak self] _, samples, _ in
            guard let self = self else { completion?(); return }
            if let night = Self.lastMainSleep(samples as? [HKCategorySample] ?? [], now: now) {
                self.publish(night, notify: notify, now: now, completion: completion)
                return
            }
            // No night in Apple Health → estimate it from the phone's own motion + steps.
            PhoneSleepEstimator.shared.estimateLastNight(now: now, usualMidMin: SleepShared.loadSummary()?.usualMidMin) { estimate in
                guard let night = estimate else { completion?(); return }
                self.publish(night, notify: notify, now: now, completion: completion)
            }
        }
        store.execute(query)
    }

    private func publish(_ night: SleepLastNight, notify: Bool, now: Date, completion: (() -> Void)?) {
        let previous = SleepShared.loadLastNight()
        if previous?.bedTs != night.bedTs || previous?.wakeTs != night.wakeTs || previous?.asleepMin != night.asleepMin {
            SleepShared.saveLastNight(night)
            WidgetCenter.shared.reloadAllTimelines()
        }
        if notify {
            notifyIfNew(night, now: now) { completion?() }
        } else {
            completion?()
        }
    }

    // MARK: - Sleep totals (mirrors healthSleepSessions() in src/utils/vitaeCalc.js)

    private struct Interval { var start: Date; var end: Date }

    static func lastMainSleep(_ samples: [HKCategorySample], now: Date) -> SleepLastNight? {
        let asleep = samples.filter { asleepValues.contains($0.value) }
        // Only "in bed" data (iPhone Sleep Schedule without a watch) → use it as the sleep window.
        let base = asleep.isEmpty ? samples.filter { $0.value == inBedValue } : asleep
        // Union overlapping sources (iPhone + Watch) so minutes are never double-counted.
        var union: [Interval] = []
        for s in base.sorted(by: { $0.startDate < $1.startDate }) {
            if let last = union.last, s.startDate <= last.end {
                union[union.count - 1].end = max(last.end, s.endDate)
            } else {
                union.append(Interval(start: s.startDate, end: s.endDate))
            }
        }
        // Group into sessions: wake-ups shorter than 45 min stay in the same night.
        var sessions: [(span: Interval, asleep: TimeInterval)] = []
        for iv in union {
            let dur = iv.end.timeIntervalSince(iv.start)
            if let last = sessions.last, iv.start.timeIntervalSince(last.span.end) < sessionGap {
                sessions[sessions.count - 1].span.end = max(last.span.end, iv.end)
                sessions[sessions.count - 1].asleep += dur
            } else {
                sessions.append((Interval(start: iv.start, end: iv.end), dur))
            }
        }
        guard let main = sessions.last(where: { Int($0.asleep / 60) >= mainSleepMin && $0.span.end <= now }) else { return nil }
        return SleepLastNight(
            asleepMin: Int((main.asleep / 60).rounded()),
            bedTs: main.span.start.timeIntervalSince1970,
            wakeTs: main.span.end.timeIntervalSince1970,
            updatedAt: now.timeIntervalSince1970
        )
    }

    // MARK: - Morning notification

    private func notifyIfNew(_ night: SleepLastNight, now: Date, completion: @escaping () -> Void) {
        let summary = SleepShared.loadSummary()
        let wakeAgo = now.timeIntervalSince1970 - night.wakeTs
        guard summary?.notify ?? true, wakeAgo >= 0, wakeAgo < Self.freshWakeWindow else { completion(); return }
        // One per morning: a later, more complete write for the same wake-up doesn't notify again.
        let notifiedWake = SleepShared.defaults?.double(forKey: SleepShared.notifiedWakeKey) ?? 0
        guard abs(notifiedWake - night.wakeTs) > 3 * 3600 else { completion(); return }

        let need = summary?.needMin ?? 480
        let diff = night.asleepMin - need
        let time = DateFormatter()
        time.timeStyle = .short
        time.dateStyle = .none
        let bed = time.string(from: Date(timeIntervalSince1970: night.bedTs))
        let wake = time.string(from: Date(timeIntervalSince1970: night.wakeTs))

        let content = UNMutableNotificationContent()
        let estimated = night.estimated == true
        let vsNeed = diff >= 0
            ? "your \(SleepShared.durationLabel(need)) need is covered."
            : "\(SleepShared.durationLabel(-diff)) short of your \(SleepShared.durationLabel(need)) need."
        content.title = "Last night: \(estimated ? "~" : "")\(SleepShared.durationLabel(night.asleepMin))"
        content.body = estimated
            ? "Estimated from your phone · \(bed) → \(wake) · \(vsNeed)"
            : "\(bed) → \(wake) · \(vsNeed)"
        content.sound = nil
        content.threadIdentifier = "vitae.sleep"
        let request = UNNotificationRequest(identifier: "vitae.sleep.lastNight", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request) { error in
            if error == nil { SleepShared.defaults?.set(night.wakeTs, forKey: SleepShared.notifiedWakeKey) }
            completion()
        }
    }
}
