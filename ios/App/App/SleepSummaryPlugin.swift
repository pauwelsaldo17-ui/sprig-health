import Foundation
import Capacitor
import WidgetKit

/// JS → native bridge for phone-only sleep, the widget and the morning notification.
/// - update({ needMin, debtMin, notify, usualMidMin }): the app pushes what it last computed.
/// - motionStatus() / requestMotion(): Motion & Fitness permission ("authorized", "denied", ...).
/// - motionActive({ days }): Core Motion movement intervals [{ s, e }] (ms) for the phone estimate.
/// Used from src/sleepSummary.js. Registered in MainViewController.
@objc(SleepSummaryPlugin)
public class SleepSummaryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SleepSummaryPlugin"
    public let jsName = "SleepSummary"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "motionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestMotion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "motionActive", returnType: CAPPluginReturnPromise)
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
}
