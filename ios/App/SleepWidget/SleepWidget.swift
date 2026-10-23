import WidgetKit
import SwiftUI

// Home Screen + Lock Screen widget: last night's sleep without opening Vitae.
// Reads only the App Group snapshot written by the app (SleepBackgroundSync / SleepSummaryPlugin);
// it never touches HealthKit, so it also works while the phone is locked.

struct SleepEntry: TimelineEntry {
    let date: Date
    let night: SleepLastNight?
    let summary: SleepSummary?

    /// Last night is only "last night" for ~30 h after waking.
    var freshNight: SleepLastNight? {
        guard let n = night, date.timeIntervalSince1970 - n.wakeTs < 30 * 3600 else { return nil }
        return n
    }
    /// Debt is shown only when the app computed it after this night's wake-up.
    var debtMin: Int? {
        guard let s = summary, let debt = s.debtMin, let at = s.debtAt else { return nil }
        if let n = freshNight, at < n.wakeTs { return nil }
        return date.timeIntervalSince1970 - at < 36 * 3600 ? debt : nil
    }
    var needMin: Int { summary?.needMin ?? 480 }
}

struct SleepProvider: TimelineProvider {
    func placeholder(in context: Context) -> SleepEntry {
        let wake = Date().addingTimeInterval(-2 * 3600).timeIntervalSince1970
        return SleepEntry(
            date: Date(),
            night: SleepLastNight(asleepMin: 445, bedTs: wake - 8 * 3600, wakeTs: wake, updatedAt: wake),
            summary: SleepSummary(needMin: 465, debtMin: 190, debtAt: wake, notify: true)
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (SleepEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : current())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SleepEntry>) -> Void) {
        // The app reloads timelines when new sleep arrives; the hourly refresh only ages the entry.
        let next = Date().addingTimeInterval(3600)
        completion(Timeline(entries: [current()], policy: .after(next)))
    }

    private func current() -> SleepEntry {
        SleepEntry(date: Date(), night: SleepShared.loadLastNight(), summary: SleepShared.loadSummary())
    }
}

private let sleepPurple = Color(red: 0.545, green: 0.361, blue: 0.965)   // #8B5CF6, SleepTab SLEEP_CLR
private let nightTop = Color(red: 0.176, green: 0.106, blue: 0.420)      // #2D1B6B
private let nightBottom = Color(red: 0.102, green: 0.059, blue: 0.247)   // #1A0F3F

private func clock(_ ts: Double) -> String {
    let f = DateFormatter()
    f.timeStyle = .short
    f.dateStyle = .none
    return f.string(from: Date(timeIntervalSince1970: ts))
}

struct SleepWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SleepEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            Group {
                if let n = entry.freshNight {
                    Text("\(Image(systemName: "bed.double.fill")) \(SleepShared.durationLabel(n.asleepMin)) last night")
                } else {
                    Text("\(Image(systemName: "bed.double.fill")) No sleep yet")
                }
            }
            .widgetBackground(Color.clear, padded: false)
        case .accessoryCircular:
            circular.widgetBackground(Color.clear, padded: false)
        case .accessoryRectangular:
            rectangular.widgetBackground(Color.clear, padded: false)
        default:
            small.widgetBackground(LinearGradient(colors: [nightTop, nightBottom], startPoint: .topLeading, endPoint: .bottomTrailing))
        }
    }

    private var circular: some View {
        ZStack {
            AccessoryWidgetBackground()
            if let n = entry.freshNight {
                Gauge(value: Double(min(n.asleepMin, entry.needMin)), in: 0...Double(entry.needMin)) {
                    Image(systemName: "bed.double.fill")
                } currentValueLabel: {
                    Text("\(n.asleepMin / 60):\(String(format: "%02d", n.asleepMin % 60))")
                }
                .gaugeStyle(.accessoryCircular)
            } else {
                Image(systemName: "bed.double.fill")
            }
        }
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("LAST NIGHT").font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary)
            if let n = entry.freshNight {
                Text(SleepShared.durationLabel(n.asleepMin)).font(.system(size: 20, weight: .bold, design: .rounded))
                if let debt = entry.debtMin {
                    Text("Sleep debt \(SleepShared.durationLabel(debt))").font(.system(size: 12))
                } else {
                    Text("\(clock(n.bedTs)) – \(clock(n.wakeTs))").font(.system(size: 12))
                }
            } else {
                Text("No sleep yet").font(.system(size: 17, weight: .bold))
                Text("Syncs from Apple Health").font(.system(size: 12))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 5) {
                Image(systemName: "moon.stars.fill").foregroundColor(sleepPurple)
                Text("LAST NIGHT").font(.system(size: 11, weight: .bold)).foregroundColor(.white.opacity(0.65))
            }
            Spacer(minLength: 0)
            if let n = entry.freshNight {
                Text(SleepShared.durationLabel(n.asleepMin))
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                Text("\(clock(n.bedTs)) – \(clock(n.wakeTs))")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.75))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                let diff = n.asleepMin - entry.needMin
                Text(entry.debtMin.map { "Debt \(SleepShared.durationLabel($0))" }
                     ?? (diff >= 0 ? "Need met" : "\(SleepShared.durationLabel(-diff)) short"))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(sleepPurple)
                    .lineLimit(1)
            } else {
                Text("No sleep yet")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text("Syncs from Apple Health after you wake.")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private extension View {
    /// iOS 17+ requires containerBackground for widgets; older versions use a plain background
    /// (Home Screen widgets get their padding here; Lock Screen ones have none).
    @ViewBuilder
    func widgetBackground<S: ShapeStyle>(_ style: S, padded: Bool = true) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(style, for: .widget)
        } else if padded {
            padding().background(style)
        } else {
            self
        }
    }
}

struct SleepWidget: Widget {
    let kind = "VitaeSleepWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SleepProvider()) { entry in
            SleepWidgetView(entry: entry)
        }
        .configurationDisplayName("Last night's sleep")
        .description("How long you slept, from Apple Health. Updates on its own.")
        .supportedFamilies([.systemSmall, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

@main
struct VitaeWidgets: WidgetBundle {
    var body: some Widget {
        SleepWidget()
    }
}
