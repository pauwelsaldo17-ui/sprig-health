import Foundation
import Capacitor
import WidgetKit

/// JS → native bridge for the sleep widget and the morning notification.
/// The app calls `SleepSummary.update({ needMin, debtMin, notify })` whenever it recomputes
/// sleep need and debt (see src/sleepSummary.js). Registered in MainViewController.
@objc(SleepSummaryPlugin)
public class SleepSummaryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SleepSummaryPlugin"
    public let jsName = "SleepSummary"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)
    ]

    @objc func update(_ call: CAPPluginCall) {
        let summary = SleepSummary(
            needMin: call.getInt("needMin") ?? 480,
            debtMin: call.getInt("debtMin"),
            debtAt: Date().timeIntervalSince1970,
            notify: call.getBool("notify") ?? true
        )
        SleepShared.saveSummary(summary)
        // Also refresh last night natively so the widget matches what the app shows.
        SleepBackgroundSync.shared.refresh(notify: false) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
