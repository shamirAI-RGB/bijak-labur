// Widget Waktu Solat: waktu seterusnya + 6 waktu hari ini untuk zon JAKIM pilihan pengguna.
// Data daripada api.waktusolat.app (sama seperti tab Solat dalam app), disimpan untuk luar talian.
import WidgetKit
import SwiftUI
import AppIntents

struct PilihZon: WidgetConfigurationIntent {
    static let title: LocalizedStringResource = "Pilih zon"
    static let description = IntentDescription("Zon waktu solat JAKIM yang dipaparkan.")

    @Parameter(title: "Zon", default: .wly01)
    var zon: Zon

    init() {}
    init(zon: Zon) { self.zon = zon }
}

let zonKL = TimeZone(identifier: "Asia/Kuala_Lumpur")!

struct Solat: Hashable {
    let nama: String
    let masa: Date
}

private struct HariAPI: Codable {
    let day: Int
    let fajr, syuruk, dhuhr, asr, maghrib, isha: Double
}
private struct BulanAPI: Codable {
    let prayers: [HariAPI]
}

enum DataSolat {
    private static func kalendar() -> Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = zonKL
        return c
    }

    private static func bulan(_ zon: Zon, tahun: Int, bulan: Int) async -> BulanAPI? {
        let kunci = "solat_\(zon.kod)_\(tahun)_\(bulan)"
        let simpan = UserDefaults.standard
        if let d = simpan.data(forKey: kunci), let b = try? JSONDecoder().decode(BulanAPI.self, from: d), !b.prayers.isEmpty {
            return b
        }
        guard let url = URL(string: "https://api.waktusolat.app/v2/solat/\(zon.kod)?year=\(tahun)&month=\(bulan)") else { return nil }
        do {
            let (d, res) = try await URLSession.shared.data(from: url)
            guard (res as? HTTPURLResponse)?.statusCode == 200 else { return nil }
            let b = try JSONDecoder().decode(BulanAPI.self, from: d)
            guard !b.prayers.isEmpty else { return nil }
            simpan.set(d, forKey: kunci)
            return b
        } catch {
            return nil
        }
    }

    /// Waktu solat bagi hari yang mengandungi `tarikh` (waktu Malaysia).
    static func hari(_ zon: Zon, _ tarikh: Date) async -> [Solat]? {
        let k = kalendar().dateComponents([.year, .month, .day], from: tarikh)
        guard let y = k.year, let m = k.month, let d = k.day,
              let b = await bulan(zon, tahun: y, bulan: m),
              let h = b.prayers.first(where: { $0.day == d }) else { return nil }
        let t = { (s: Double) in Date(timeIntervalSince1970: s) }
        return [
            Solat(nama: "Subuh", masa: t(h.fajr)),
            Solat(nama: "Syuruk", masa: t(h.syuruk)),
            Solat(nama: "Zohor", masa: t(h.dhuhr)),
            Solat(nama: "Asar", masa: t(h.asr)),
            Solat(nama: "Maghrib", masa: t(h.maghrib)),
            Solat(nama: "Isyak", masa: t(h.isha)),
        ]
    }

    static func tengahMalam(_ tarikh: Date) -> Date {
        let c = kalendar()
        return c.date(byAdding: .day, value: 1, to: c.startOfDay(for: tarikh)) ?? tarikh.addingTimeInterval(86400)
    }

    static func esok(_ tarikh: Date) -> Date {
        kalendar().date(byAdding: .day, value: 1, to: tarikh) ?? tarikh.addingTimeInterval(86400)
    }
}

struct SolatEntry: TimelineEntry {
    let date: Date
    let zon: Zon
    let hariIni: [Solat]
    let seterusnya: Solat?
}

struct SolatProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SolatEntry {
        let mula = Calendar.current.startOfDay(for: Date())
        let contoh = [("Subuh", 6.0), ("Syuruk", 7.2), ("Zohor", 13.3), ("Asar", 16.6), ("Maghrib", 19.4), ("Isyak", 20.5)]
            .map { Solat(nama: $0.0, masa: mula.addingTimeInterval($0.1 * 3600)) }
        return SolatEntry(date: Date(), zon: .wly01, hariIni: contoh, seterusnya: contoh[3])
    }

    func snapshot(for configuration: PilihZon, in context: Context) async -> SolatEntry {
        await entri(configuration.zon, Date()).first ?? placeholder(in: context)
    }

    func timeline(for configuration: PilihZon, in context: Context) async -> Timeline<SolatEntry> {
        let senarai = await entri(configuration.zon, Date())
        guard let akhir = senarai.last else {
            // Tiada data (tiada internet): cuba lagi dalam 30 minit
            let kosong = SolatEntry(date: Date(), zon: configuration.zon, hariIni: [], seterusnya: nil)
            return Timeline(entries: [kosong], policy: .after(Date().addingTimeInterval(1800)))
        }
        // Selepas Isyak hanya ada satu entri: muat semula selepas tengah malam, bukan setiap minit
        let semula = senarai.count > 1 ? akhir.date.addingTimeInterval(60) : DataSolat.tengahMalam(Date()).addingTimeInterval(120)
        return Timeline(entries: senarai, policy: .after(semula))
    }

    /// Satu entri sekarang, dan satu lagi pada setiap waktu solat hari ini supaya "seterusnya" bertukar sendiri.
    private func entri(_ zon: Zon, _ kini: Date) async -> [SolatEntry] {
        guard let hari = await DataSolat.hari(zon, kini) else { return [] }
        let esok = await DataSolat.hari(zon, DataSolat.esok(kini)) ?? []
        let semua = (hari + esok).filter { $0.nama != "Syuruk" }
        let titik = [kini] + hari.map(\.masa).filter { $0 > kini }
        return titik.map { t in
            let paparHari = t > (hari.last?.masa ?? t) && !esok.isEmpty ? esok : hari
            return SolatEntry(date: t, zon: zon, hariIni: paparHari, seterusnya: semua.first { $0.masa > t })
        }
    }
}

private func jam(_ d: Date) -> String {
    let f = DateFormatter()
    f.timeZone = zonKL
    f.locale = Locale(identifier: "ms_MY")
    f.dateFormat = "h:mm a"
    return f.string(from: d)
}

private let hijau = Color(red: 0.04, green: 0.36, blue: 0.29)

struct SolatView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SolatEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            if let s = entry.seterusnya { Text("\(s.nama) \(jam(s.masa))") } else { Text("Waktu solat") }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(entry.seterusnya?.nama ?? "Waktu solat").font(.headline)
                if let s = entry.seterusnya {
                    Text(jam(s.masa)).font(.body)
                    Text(s.masa, style: .relative).font(.caption)
                } else {
                    Text("Buka app untuk memuatkan").font(.caption)
                }
            }
        case .systemMedium:
            HStack(alignment: .top, spacing: 14) {
                seterusnya
                Spacer(minLength: 0)
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(entry.hariIni, id: \.self) { s in
                        HStack {
                            Text(s.nama).fontWeight(s == entry.seterusnya ? .bold : .regular)
                            Spacer()
                            Text(jam(s.masa)).monospacedDigit().fontWeight(s == entry.seterusnya ? .bold : .regular)
                        }
                        .font(.caption)
                        .foregroundStyle(s == entry.seterusnya ? hijau : .primary)
                    }
                }
                .frame(maxWidth: 150)
            }
        default:
            seterusnya
        }
    }

    private var seterusnya: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(entry.zon.kod).font(.caption2).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            if let s = entry.seterusnya {
                Text("Seterusnya").font(.caption).foregroundStyle(.secondary)
                Text(s.nama).font(.title2).bold().foregroundStyle(hijau)
                Text(jam(s.masa)).font(.headline).monospacedDigit()
                Text(s.masa, style: .relative).font(.caption2).foregroundStyle(.secondary)
            } else {
                Text("Tiada sambungan").font(.headline)
                Text("Waktu solat akan dimuat apabila dalam talian").font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}

struct SolatWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "BijakSolat", intent: PilihZon.self, provider: SolatProvider()) { entry in
            SolatView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Waktu Solat")
        .description("Waktu solat seterusnya untuk zon JAKIM anda. Tekan dan tahan widget untuk tukar zon.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}
