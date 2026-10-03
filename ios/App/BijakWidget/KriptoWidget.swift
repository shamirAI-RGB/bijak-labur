// Widget Harga Kripto: harga BTC dan ETH (USD, dengan anggaran RM) serta perubahan 24 jam.
// Utama: CoinGecko (USD + MYR sekali gus). Sandaran: Binance (USD sahaja). Harga terakhir disimpan untuk luar talian.
import WidgetKit
import SwiftUI

struct Koin: Codable, Hashable {
    let simbol: String
    let usd: Double
    let myr: Double?
    let ubah: Double
}

struct KriptoEntry: TimelineEntry {
    let date: Date
    let koin: [Koin]
    let dikemas: Date?
}

enum DataKripto {
    private static let kunci = "kripto_terakhir"
    private static let senarai = [("bitcoin", "BTC"), ("ethereum", "ETH")]

    private static func json(_ u: String) async -> Any? {
        guard let url = URL(string: u) else { return nil }
        guard let r = try? await URLSession.shared.data(from: url),
              (r.1 as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return try? JSONSerialization.jsonObject(with: r.0)
    }

    private static func coingecko() async -> [Koin]? {
        let ids = senarai.map(\.0).joined(separator: ",")
        guard let j = await json("https://api.coingecko.com/api/v3/simple/price?ids=\(ids)&vs_currencies=usd,myr&include_24hr_change=true") as? [String: [String: Double]] else { return nil }
        let k = senarai.compactMap { id, sym -> Koin? in
            guard let h = j[id], let usd = h["usd"] else { return nil }
            return Koin(simbol: sym, usd: usd, myr: h["myr"], ubah: h["usd_24h_change"] ?? 0)
        }
        return k.count == senarai.count ? k : nil
    }

    private static func binance() async -> [Koin]? {
        var out: [Koin] = []
        for (_, sym) in senarai {
            guard let j = await json("https://data-api.binance.vision/api/v3/ticker/24hr?symbol=\(sym)USDT") as? [String: Any],
                  let harga = Double(j["lastPrice"] as? String ?? ""),
                  let ubah = Double(j["priceChangePercent"] as? String ?? "") else { return nil }
            out.append(Koin(simbol: sym, usd: harga, myr: nil, ubah: ubah))
        }
        return out
    }

    static func muat() async -> KriptoEntry {
        let simpan = UserDefaults.standard
        if let k = await coingecko(), !k.isEmpty {
            simpan.set(try? JSONEncoder().encode(k), forKey: kunci)
            simpan.set(Date(), forKey: kunci + "_masa")
            return KriptoEntry(date: Date(), koin: k, dikemas: Date())
        }
        if let k = await binance(), !k.isEmpty {
            simpan.set(try? JSONEncoder().encode(k), forKey: kunci)
            simpan.set(Date(), forKey: kunci + "_masa")
            return KriptoEntry(date: Date(), koin: k, dikemas: Date())
        }
        if let d = simpan.data(forKey: kunci), let k = try? JSONDecoder().decode([Koin].self, from: d) {
            return KriptoEntry(date: Date(), koin: k, dikemas: simpan.object(forKey: kunci + "_masa") as? Date)
        }
        return KriptoEntry(date: Date(), koin: [], dikemas: nil)
    }
}

struct KriptoProvider: TimelineProvider {
    func placeholder(in context: Context) -> KriptoEntry {
        KriptoEntry(date: Date(), koin: [Koin(simbol: "BTC", usd: 65000, myr: 280000, ubah: 1.2),
                                         Koin(simbol: "ETH", usd: 3200, myr: 13800, ubah: -0.8)], dikemas: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (KriptoEntry) -> Void) {
        if context.isPreview { return completion(placeholder(in: context)) }
        Task { completion(await DataKripto.muat()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KriptoEntry>) -> Void) {
        Task {
            let e = await DataKripto.muat()
            // iOS menghadkan kekerapan muat semula widget; 20 minit ialah sasaran yang munasabah
            completion(Timeline(entries: [e], policy: .after(Date().addingTimeInterval(20 * 60))))
        }
    }
}

private func usd(_ v: Double) -> String {
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.maximumFractionDigits = v < 100 ? 2 : 0
    return "$" + (f.string(from: NSNumber(value: v)) ?? String(format: "%.0f", v))
}

private func rm(_ v: Double) -> String {
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.maximumFractionDigits = 0
    return "RM" + (f.string(from: NSNumber(value: v)) ?? String(format: "%.0f", v))
}

private func ubah(_ v: Double) -> String { String(format: "%@%.1f%%", v >= 0 ? "+" : "", v) }

struct KriptoView: View {
    @Environment(\.widgetFamily) private var family
    let entry: KriptoEntry

    var body: some View {
        if entry.koin.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text("Harga Kripto").font(.headline)
                Text("Tiada sambungan. Harga akan dimuat apabila dalam talian.").font(.caption2).foregroundStyle(.secondary)
            }
        } else {
            switch family {
            case .accessoryInline:
                Text(entry.koin.map { "\($0.simbol) \(usd($0.usd))" }.joined(separator: " · "))
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 1) {
                    ForEach(entry.koin, id: \.self) { k in
                        Text("\(k.simbol) \(usd(k.usd)) \(ubah(k.ubah))").font(.caption)
                    }
                }
            default:
                VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
                    Text("Harga Kripto").font(.caption2).foregroundStyle(.secondary)
                    ForEach(entry.koin, id: \.self) { k in baris(k) }
                    Spacer(minLength: 0)
                    if let t = entry.dikemas {
                        Text("Dikemas \(t, style: .relative) lalu").font(.system(size: 9)).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder private func baris(_ k: Koin) -> some View {
        let warna: Color = k.ubah >= 0 ? .green : .red
        if family == .systemSmall {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(k.simbol).font(.caption).bold()
                    Spacer()
                    Text(ubah(k.ubah)).font(.caption2).foregroundStyle(warna)
                }
                Text(usd(k.usd)).font(.headline).monospacedDigit().minimumScaleFactor(0.7).lineLimit(1)
            }
        } else {
            HStack {
                Text(k.simbol).font(.headline)
                Spacer()
                VStack(alignment: .trailing, spacing: 0) {
                    Text(usd(k.usd)).font(.headline).monospacedDigit()
                    if let m = k.myr { Text(rm(m)).font(.caption2).foregroundStyle(.secondary).monospacedDigit() }
                }
                Text(ubah(k.ubah)).font(.caption).bold().foregroundStyle(warna).frame(width: 52, alignment: .trailing)
            }
        }
    }
}

struct KriptoWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BijakKripto", provider: KriptoProvider()) { entry in
            KriptoView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Harga Kripto")
        .description("Harga Bitcoin dan Ethereum serta perubahan 24 jam. Bukan nasihat pelaburan.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}
