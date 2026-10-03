// Widget skrin utama dan skrin kunci untuk app Bijak Labur (iOS 17 ke atas).
import WidgetKit
import SwiftUI

@main
struct BijakWidgetBundle: WidgetBundle {
    var body: some Widget {
        SolatWidget()
        KriptoWidget()
    }
}
