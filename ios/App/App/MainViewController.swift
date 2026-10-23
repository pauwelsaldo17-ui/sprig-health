import UIKit
import Capacitor

/// The app's bridge view controller (set in Main.storyboard). Registers plugins that live in
/// the app target itself rather than in an npm package.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SleepSummaryPlugin())
    }
}
