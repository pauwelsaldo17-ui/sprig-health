import Foundation
import Capacitor
import WidgetKit
#if canImport(AlarmKit)
import AlarmKit
import SwiftUI
#endif

/// JS → native bridge for phone-only sleep, the widget and the morning notification.
/// - update({ needMin, debtMin, notify, usualMidMin }): the app pushes what it last computed.
/// - motionStatus() / requestMotion(): Motion & Fitness permission ("authorized", "denied", ...).
/// - motionActive({ days }): Core Motion movement intervals [{ s, e }] (ms) for the phone estimate.
/// - alarmStatus() / requestAlarm(): AlarmKit permission ("authorized", "denied", "notDetermined",
///   or "unsupported" before iOS 26).
/// - setWakeAlarms({ hour, minute, weekdays, skipToday }) / cancelWakeAlarms(): real system alarms
///   (iOS 26+) that ring with Vitae closed and the phone locked. weekdays: 0 = Sunday … 6.
/// Used from src/sleepSummary.js. Registered in MainViewController.
@objc(SleepSummaryPlugin)
public class SleepSummaryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SleepSummaryPlugin"
    public let jsName = "SleepSummary"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "motionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestMotion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "motionActive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "alarmStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAlarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWakeAlarms", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelWakeAlarms", returnType: CAPPluginReturnPromise)
    ]

    @objc func update(_ call: CAPPluginCall) {
        let summary = SleepSummary(
            needMin: call.getInt("needMin") ?? 480,
            debtMin: call.getInt("debtMin"),
            debtAt: Date().timeIntervalSince1970,
            notify: call.getBool("notify") ?? true,
            usualMidMin: call.getInt("usualMidMin")
        )
        SleepShared.saveSummary(summary)
        // Also refresh last night natively so the widget matches what the app shows.
        SleepBackgroundSync.shared.refresh(notify: false) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc func motionStatus(_ call: CAPPluginCall) {
        call.resolve(["status": PhoneSleepEstimator.motionStatus()])
    }

    /// Shows the Motion & Fitness prompt (a tiny history query triggers it) and returns the result.
    @objc func requestMotion(_ call: CAPPluginCall) {
        let now = Date()
        PhoneSleepEstimator.shared.motionActive(from: now.addingTimeInterval(-3600), to: now) { _ in
            call.resolve(["status": PhoneSleepEstimator.motionStatus()])
        }
    }

    @objc func motionActive(_ call: CAPPluginCall) {
        let days = min(7, max(1, call.getInt("days") ?? 7))   // iOS keeps about a week of history
        let now = Date()
        PhoneSleepEstimator.shared.motionActive(from: now.addingTimeInterval(Double(-days) * 86400), to: now) { list in
            let out: [[String: Double]] = list.map {
                ["s": ($0.s.timeIntervalSince1970 * 1000).rounded(), "e": ($0.e.timeIntervalSince1970 * 1000).rounded()]
            }
            call.resolve(["status": PhoneSleepEstimator.motionStatus(), "active": out])
        }
    }

    @objc func alarmStatus(_ call: CAPPluginCall) {
        call.resolve(["status": WakeAlarms.status()])
    }

    @objc func requestAlarm(_ call: CAPPluginCall) {
        WakeAlarms.request { status in call.resolve(["status": status]) }
    }

    @objc func setWakeAlarms(_ call: CAPPluginCall) {
        let hour = min(23, max(0, call.getInt("hour") ?? 7))
        let minute = min(59, max(0, call.getInt("minute") ?? 0))
        let weekdays = call.getArray("weekdays", Int.self) ?? [1, 2, 3, 4, 5]
        let skipToday = call.getBool("skipToday") ?? false
        WakeAlarms.set(hour: hour, minute: minute, weekdays: weekdays, skipToday: skipToday) { count, status in
            call.resolve(["scheduled": count, "status": status])
        }
    }

    @objc func cancelWakeAlarms(_ call: CAPPluginCall) {
        WakeAlarms.cancelAll { call.resolve() }
    }
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct VitaeAlarmMetadata: AlarmMetadata {}
#endif

/// Wake-up alarms through AlarmKit (iOS 26+): one weekly alarm per selected weekday at the latest
/// wake time. They are system alarms: they ring even if Vitae is closed, the phone is locked or on
/// Silent. "skipToday" (sleep mode already ended in the app) moves today's alarm to next week; the
/// next sync from the app restores the weekly repeat. Before iOS 26 everything reports "unsupported"
/// and the app falls back to a notification (see src/sleepSummary.js).
enum WakeAlarms {
    private static let idsKey = "vitae.wakeAlarmIds"

    static func status() -> String {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            switch AlarmManager.shared.authorizationState {
            case .authorized: return "authorized"
            case .denied: return "denied"
            case .notDetermined: return "notDetermined"
            @unknown default: return "unknown"
            }
        }
        #endif
        return "unsupported"
    }

    static func request(_ done: @escaping (String) -> Void) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                _ = try? await AlarmManager.shared.requestAuthorization()
                done(status())
            }
            return
        }
        #endif
        done("unsupported")
    }

    static func set(hour: Int, minute: Int, weekdays: [Int], skipToday: Bool, _ done: @escaping (Int, String) -> Void) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                cancelStored()
                guard AlarmManager.shared.authorizationState == .authorized else { done(0, status()); return }
                let names: [Locale.Weekday] = [.sunday, .monday, .tuesday, .wednesday, .thursday, .friday, .saturday]
                let cal = Calendar.current
                let now = Date()
                let today = cal.component(.weekday, from: now) - 1 // 0 = Sunday
                var ids: [String] = []
                for day in Set(weekdays).sorted() where day >= 0 && day <= 6 {
                    let schedule: Alarm.Schedule
                    if skipToday && day == today {
                        // today's wake-up already happened in the app: ring next week at the same time
                        guard let todayAt = cal.date(bySettingHour: hour, minute: minute, second: 0, of: now),
                              let nextWeek = cal.date(byAdding: .day, value: 7, to: todayAt) else { continue }
                        schedule = .fixed(nextWeek)
                    } else {
                        schedule = .relative(.init(time: .init(hour: hour, minute: minute), repeats: .weekly([names[day]])))
                    }
                    let alert = AlarmPresentation.Alert(
                        title: "Good morning",
                        stopButton: AlarmButton(text: "Stop", textColor: .white, systemImageName: "sun.max.fill"))
                    let attributes = AlarmAttributes<VitaeAlarmMetadata>(presentation: AlarmPresentation(alert: alert), metadata: nil, tintColor: Color.green)
                    let configuration = AlarmManager.AlarmConfiguration<VitaeAlarmMetadata>.alarm(schedule: schedule, attributes: attributes)
                    let id = UUID()
                    do {
                        _ = try await AlarmManager.shared.schedule(id: id, configuration: configuration)
                        ids.append(id.uuidString)
                    } catch {
                        print("[vitae] alarm schedule failed: \(error.localizedDescription)")
                    }
                }
                UserDefaults.standard.set(ids, forKey: idsKey)
                done(ids.count, status())
            }
            return
        }
        #endif
        done(0, "unsupported")
    }

    static func cancelAll(_ done: @escaping () -> Void) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) { cancelStored() }
        #endif
        done()
    }

    #if canImport(AlarmKit)
    @available(iOS 26.0, *)
    private static func cancelStored() {
        for raw in UserDefaults.standard.stringArray(forKey: idsKey) ?? [] {
            if let id = UUID(uuidString: raw) { try? AlarmManager.shared.cancel(id: id) }
        }
        UserDefaults.standard.removeObject(forKey: idsKey)
    }
    #endif
}
