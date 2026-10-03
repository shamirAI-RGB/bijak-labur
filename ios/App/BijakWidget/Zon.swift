// Dijana daripada senarai zon JAKIM dalam js/solat.js (FALLBACK_ZONES). Jangan sunting dengan tangan.
import AppIntents

enum Zon: String, AppEnum {
    case jhr01, jhr02, jhr03, jhr04, kdh01, kdh02, kdh03, kdh04, kdh05, kdh06, kdh07, ktn01, ktn02, mlk01, ngs01, ngs02, ngs03, phg01, phg02, phg03, phg04, phg05, phg06, phg07, pls01, png01, prk01, prk02, prk03, prk04, prk05, prk06, prk07, sbh01, sbh02, sbh03, sbh04, sbh05, sbh06, sbh07, sbh08, sbh09, sgr01, sgr02, sgr03, swk01, swk02, swk03, swk04, swk05, swk06, swk07, swk08, swk09, trg01, trg02, trg03, trg04, wly01, wly02

    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Zon waktu solat"
    static let caseDisplayRepresentations: [Zon: DisplayRepresentation] = [
        .jhr01: "JHR01 Johor: Pulau Aur dan Pulau Pemanggil",
        .jhr02: "JHR02 Johor: Johor Bahru, Kota Tinggi, Mersing, Kulai",
        .jhr03: "JHR03 Johor: Kluang, Pontian",
        .jhr04: "JHR04 Johor: Batu Pahat, Muar, Segamat, Gemas, Tangkak",
        .kdh01: "KDH01 Kedah: Kota Setar, Kubang Pasu, Pokok Sena",
        .kdh02: "KDH02 Kedah: Kuala Muda, Yan, Pendang",
        .kdh03: "KDH03 Kedah: Padang Terap, Sik",
        .kdh04: "KDH04 Kedah: Baling",
        .kdh05: "KDH05 Kedah: Bandar Baharu, Kulim",
        .kdh06: "KDH06 Kedah: Langkawi",
        .kdh07: "KDH07 Kedah: Puncak Gunung Jerai",
        .ktn01: "KTN01 Kelantan: Kota Bharu, Bachok, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat, Kuala Krai",
        .ktn02: "KTN02 Kelantan: Gua Musang, Jeli, Lojing",
        .mlk01: "MLK01 Melaka: Seluruh Negeri Melaka",
        .ngs01: "NGS01 Negeri Sembilan: Tampin, Jempol",
        .ngs02: "NGS02 Negeri Sembilan: Jelebu, Kuala Pilah, Rembau",
        .ngs03: "NGS03 Negeri Sembilan: Port Dickson, Seremban",
        .phg01: "PHG01 Pahang: Pulau Tioman",
        .phg02: "PHG02 Pahang: Kuantan, Pekan, Muadzam Shah",
        .phg03: "PHG03 Pahang: Jerantut, Temerloh, Maran, Bera, Chenor, Jengka",
        .phg04: "PHG04 Pahang: Bentong, Lipis, Raub",
        .phg05: "PHG05 Pahang: Genting Sempah, Janda Baik, Bukit Tinggi",
        .phg06: "PHG06 Pahang: Cameron Highlands, Genting Highlands, Bukit Fraser",
        .phg07: "PHG07 Pahang: Rompin",
        .pls01: "PLS01 Perlis: Kangar, Padang Besar, Arau",
        .png01: "PNG01 Pulau Pinang: Seluruh Negeri Pulau Pinang",
        .prk01: "PRK01 Perak: Tapah, Slim River, Tanjung Malim",
        .prk02: "PRK02 Perak: Ipoh, Kuala Kangsar, Sg. Siput, Batu Gajah, Kampar",
        .prk03: "PRK03 Perak: Lenggong, Pengkalan Hulu, Grik",
        .prk04: "PRK04 Perak: Temengor, Belum",
        .prk05: "PRK05 Perak: Teluk Intan, Bagan Datuk, Seri Iskandar, Lumut, Sitiawan, Pulau Pangkor",
        .prk06: "PRK06 Perak: Taiping, Selama, Bagan Serai, Parit Buntar",
        .prk07: "PRK07 Perak: Bukit Larut",
        .sbh01: "SBH01 Sabah: Sandakan (Timur), Bukit Garam, Sukau",
        .sbh02: "SBH02 Sabah: Beluran, Telupid, Pinangah, Sandakan (Barat)",
        .sbh03: "SBH03 Sabah: Lahad Datu, Kunak, Semporna, Tawau (Timur)",
        .sbh04: "SBH04 Sabah: Bandar Tawau, Kalabakan, Tawau (Barat)",
        .sbh05: "SBH05 Sabah: Kudat, Kota Marudu, Pitas, Pulau Banggi",
        .sbh06: "SBH06 Sabah: Gunung Kinabalu",
        .sbh07: "SBH07 Sabah: Kota Kinabalu, Ranau, Kota Belud, Tuaran, Penampang, Papar, Putatan",
        .sbh08: "SBH08 Sabah: Keningau, Tambunan, Nabawan, Pensiangan",
        .sbh09: "SBH09 Sabah: Beaufort, Kuala Penyu, Sipitang, Tenom, Membakut",
        .sgr01: "SGR01 Selangor: Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam",
        .sgr02: "SGR02 Selangor: Kuala Selangor, Sabak Bernam",
        .sgr03: "SGR03 Selangor: Klang, Kuala Langat",
        .swk01: "SWK01 Sarawak: Limbang, Lawas, Sundar, Trusan",
        .swk02: "SWK02 Sarawak: Miri, Niah, Bekenu, Sibuti, Marudi",
        .swk03: "SWK03 Sarawak: Bintulu, Belaga, Tatau, Sebauh",
        .swk04: "SWK04 Sarawak: Sibu, Mukah, Dalat, Kanowit, Kapit",
        .swk05: "SWK05 Sarawak: Sarikei, Matu, Julau, Daro, Bintangor",
        .swk06: "SWK06 Sarawak: Sri Aman, Lubok Antu, Betong, Saratok",
        .swk07: "SWK07 Sarawak: Serian, Simunjan, Samarahan, Sebuyau",
        .swk08: "SWK08 Sarawak: Kuching, Bau, Lundu, Sematan",
        .swk09: "SWK09 Sarawak: Zon Khas (Kampung Patarikan)",
        .trg01: "TRG01 Terengganu: Kuala Terengganu, Marang, Kuala Nerus",
        .trg02: "TRG02 Terengganu: Besut, Setiu",
        .trg03: "TRG03 Terengganu: Hulu Terengganu",
        .trg04: "TRG04 Terengganu: Dungun, Kemaman",
        .wly01: "WLY01 Wilayah Persekutuan: Kuala Lumpur, Putrajaya",
        .wly02: "WLY02 Wilayah Persekutuan: Labuan"
    ]

    /// Kod JAKIM, cth. WLY01
    var kod: String { rawValue.uppercased() }
}
