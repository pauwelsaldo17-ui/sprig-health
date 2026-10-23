import Foundation

// Shared between the app and the SleepWidget extension through the App Group container.
// Holds only what the widget and the morning notification show: last night's totals and
// the sleep need / debt the app last computed. No raw samples.
enum SleepShared {
    static let appGroup = "group.com.pauwelsaldo.vitae"
    static let lastNightKey = "sleep.lastNight"
    static let summaryKey = "sleep.summary"
    static let notifiedWakeKey = "sleep.notifiedWakeTs"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    static func loadLastNight() -> SleepLastNight? {
        guard let data = defaults?.data(forKey: lastNightKey) else { return nil }
        return try? JSONDecoder().decode(SleepLastNight.self, from: data)
    }

    static func saveLastNight(_ value: SleepLastNight) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        defaults?.set(data, forKey: lastNightKey)
    }

    static func loadSummary() -> SleepSummary? {
        guard let data = defaults?.data(forKey: summaryKey) else { return nil }
        return try? JSONDecoder().decode(SleepSummary.self, from: data)
    }

    static func saveSummary(_ value: SleepSummary) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        defaults?.set(data, forKey: summaryKey)
    }

    /// "7h 25m" — same format as durLabel() in vitaeCalc.js
    static func durationLabel(_ minutes: Int) -> String {
        let m = max(0, minutes)
        return "\(m / 60)h \(String(format: "%02d", m % 60))m"
    }
}

/// Last main sleep (naps excluded), computed natively from Apple Health.
struct SleepLastNight: Codable, Equatable {
    var asleepMin: Int
    var bedTs: Double   // seconds since 1970
    var wakeTs: Double
    var updatedAt: Double
}

/// Written by the app (JS → SleepSummary plugin) whenever it recomputes sleep need and debt.
struct SleepSummary: Codable {
    var needMin: Int
    var debtMin: Int?
    var debtAt: Double?        // when debt was computed (seconds since 1970)
    var notify: Bool           // morning "last night" notification on/off
}
