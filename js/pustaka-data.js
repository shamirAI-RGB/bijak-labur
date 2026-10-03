/* Bijak Labur: Pustaka Kanak-kanak. 20 subjek (KSPK dan KSSR Semakan 2017), 4 bahasa: [Melayu, English, 中文, தமிழ்]
   Setiap bab: y = tahun (P = prasekolah), b = bidang/tema, t = tajuk, p = halaman [emoji, paparan besar, tajuk, isi], q = kuiz [paparan, soalan, pilihan (pilihan pertama betul)] */
const PustakaData = (function () {
  const S = [];
  const sub = (o) => S.push(o);

  /* ================= BIJAK WANG (celik kewangan dan asas melabur) ================= */
  sub({ id: 'wang', age: [4, 12], c: ['#2fbf71', '#0b7a4b'], e: '🌱',
    n: ['Bijak Wang', 'Money Smart', '理财小达人', 'பணப் புத்திசாலி'],
    dskp: 'Elemen Merentas Kurikulum KSSR (Semakan 2017): Pendidikan Kewangan. Topik melabur ialah tambahan Bijak Labur, bukan topik DSKP',
    ch: [
      { y: 'P', b: ['Keperluan dan kehendak', 'Needs and wants', '需要与想要', 'தேவையும் விருப்பமும்'],
        t: ['Perlu atau mahu?', 'Need or want?', '需要还是想要？', 'தேவையா விருப்பமா?'],
        p: [
          ['🍚', '🍚 💧 🏠 ✓', ['Keperluan', 'Needs', '需要', 'தேவைகள்'],
            ['Keperluan ialah benda yang kita mesti ada untuk hidup: makanan, air, pakaian dan rumah.', 'Needs are things we must have to live: food, water, clothes and a home.', '需要是生活必须有的东西：食物、水、衣服和房子。', 'தேவைகள் வாழ அவசியமானவை: உணவு, நீர், உடை, வீடு.']],
          ['🧸', '🧸 🎮 🍭 ?', ['Kehendak', 'Wants', '想要', 'விருப்பங்கள்'],
            ['Kehendak ialah benda yang seronok untuk dimiliki tetapi tidak wajib, seperti mainan dan gula-gula. Beli keperluan dahulu.', 'Wants are nice to have but not a must, like toys and sweets. Buy needs first.', '想要的东西有了会开心，但不是必须的，比如玩具和糖果。先买需要的东西。', 'விருப்பங்கள் இருந்தால் மகிழ்ச்சி, ஆனால் அவசியமில்லை, எ.கா. பொம்மை, மிட்டாய். முதலில் தேவையை வாங்கு.']]
        ],
        q: ['', ['Yang mana keperluan?', 'Which one is a need?', '哪一个是需要？', 'எது தேவை?'], [['air minuman', 'drinking water', '饮用水', 'குடிநீர்'], ['robot mainan', 'a toy robot', '玩具机器人', 'பொம்மை ரோபோ'], ['gula-gula', 'sweets', '糖果', 'மிட்டாய்']]] },
      { y: '1', b: ['Menabung', 'Saving', '储蓄', 'சேமிப்பு'],
        t: ['Tabung ajaib', 'The magic money box', '神奇的储蓄罐', 'மாயச் சேமிப்புப் பெட்டி'],
        p: [
          ['🐷', 'RM1 × 30 = RM30', ['Simpan sedikit setiap hari', 'Save a little every day', '每天存一点', 'தினமும் கொஞ்சம் சேமி'],
            ['Simpan RM1 setiap hari dalam tabung. Selepas 30 hari, kamu ada RM30.', 'Put RM1 in your money box every day. After 30 days you have RM30.', '每天往储蓄罐里存RM1，30天后就有RM30。', 'தினமும் RM1 சேமிப்புப் பெட்டியில் போடு. 30 நாளில் RM30 சேரும்.']],
          ['🎯', '🚲 = RM150', ['Ada matlamat', 'Have a goal', '定一个目标', 'இலக்கு வை'],
            ['Pilih benda yang kamu mahu, contohnya basikal. Tulis harganya dan simpan sedikit demi sedikit sehingga cukup.', 'Choose something you want, like a bicycle. Write down its price and save bit by bit until you have enough.', '选一样你想要的东西，比如脚踏车。写下价钱，一点一点存，直到存够为止。', 'உனக்கு வேண்டியதைத் தேர்ந்தெடு, எ.கா. மிதிவண்டி. விலையை எழுதி, போதுமானது வரை கொஞ்சம் கொஞ்சமாகச் சேமி.']]
        ],
        q: ['RM2 × 10 = ?', ['Simpan RM2 sehari selama 10 hari. Berapa jumlahnya?', 'Save RM2 a day for 10 days. How much?', '每天存RM2，存10天，一共多少？', 'தினமும் RM2, 10 நாள். மொத்தம் எவ்வளவு?'], ['RM20', 'RM12', 'RM10']] },
      { y: '3', b: ['Wang bertumbuh', 'Money that grows', '会长大的钱', 'வளரும் பணம்'],
        t: ['Pokok duit', 'The money tree', '摇钱树', 'பண மரம்'],
        p: [
          ['🌳', 'RM100 → RM110 → RM121', ['Untung atas untung', 'Profit on profit', '利上加利', 'லாபத்தின் மேல் லாபம்'],
            ['Jika RM100 bertambah 10% setahun, ia menjadi RM110. Tahun kedua, 10% daripada RM110 menjadikannya RM121.', 'If RM100 grows 10% a year, it becomes RM110. In year two, 10% of RM110 makes it RM121.', '如果RM100每年增长10%，一年后变成RM110；第二年再增长10%，就是RM121。', 'RM100 ஆண்டுக்கு 10% வளர்ந்தால் RM110 ஆகும். இரண்டாம் ஆண்டில் RM110-இன் 10% சேர்ந்து RM121 ஆகும்.']],
          ['⏳', '🌱 → 🌿 → 🌳', ['Mula awal', 'Start early', '越早开始越好', 'சீக்கிரம் தொடங்கு'],
            ['Seperti pokok, wang perlukan masa untuk tumbuh. Lebih awal kamu mula, lebih lama ia sempat bertumbuh.', 'Like a tree, money needs time to grow. The earlier you start, the longer it has to grow.', '钱就像树，需要时间长大。越早开始，它成长的时间就越长。', 'மரம் போல பணமும் வளர நேரம் தேவை. சீக்கிரம் தொடங்கினால் அதிக காலம் வளரும்.']]
        ],
        q: ['🌳', ['Apa yang membantu wang bertumbuh?', 'What helps money grow?', '什么能帮助钱长大？', 'பணம் வளர எது உதவும்?'], [['masa dan kesabaran', 'time and patience', '时间和耐心', 'நேரமும் பொறுமையும்'], ['membelanjakan semuanya', 'spending it all', '全部花掉', 'எல்லாவற்றையும் செலவழித்தல்'], ['menyorok di bawah bantal', 'hiding it under a pillow', '藏在枕头下', 'தலையணைக்கடியில் ஒளித்தல்']]] },
      { y: '5', b: ['Asas melabur', 'Investing basics', '投资基础', 'முதலீட்டு அடிப்படை'],
        t: ['Apa itu saham?', 'What is a share?', '什么是股票？', 'பங்கு என்றால் என்ன?'],
        p: [
          ['🍰', '🍰 ÷ 8 = 1 🍰', ['Sepotong kek syarikat', 'A slice of a company', '公司的一小块蛋糕', 'நிறுவனத்தின் ஒரு துண்டு'],
            ['Saham ialah sebahagian kecil pemilikan sebuah syarikat. Jika syarikat untung, pemegang saham boleh menerima dividen.', 'A share is a small piece of ownership in a company. If the company makes a profit, shareholders may receive dividends.', '股票就是公司的一小部分。公司赚钱时，股东可能会得到股息。', 'பங்கு என்பது ஒரு நிறுவனத்தின் சிறிய உரிமைப் பகுதி. நிறுவனம் லாபம் ஈட்டினால் பங்குதாரர்களுக்கு ஈவுத்தொகை கிடைக்கலாம்.']],
          ['✅', 'SC ✓ Syariah', ['Saham patuh Syariah', 'Shariah-compliant shares', '符合伊斯兰教义的股票', 'ஷரியா இணக்கப் பங்குகள்'],
            ['Suruhanjaya Sekuriti menyenaraikan saham patuh Syariah dua kali setahun. Syarikat itu tidak menjalankan perniagaan riba, judi atau arak.', 'The Securities Commission lists Shariah-compliant shares twice a year. These companies do not run interest-based, gambling or alcohol businesses.', '马来西亚证券监督委员会每年两次公布符合伊斯兰教义的股票名单，这些公司不经营利息、赌博或酒类生意。', 'பங்குப் பரிவர்த்தனை ஆணையம் ஆண்டுக்கு இருமுறை ஷரியா இணக்கப் பங்குகளைப் பட்டியலிடுகிறது. அந்நிறுவனங்கள் வட்டி, சூதாட்டம், மது வணிகம் செய்வதில்லை.']]
        ],
        q: ['🍰', ['Saham ialah…', 'A share is…', '股票是…', 'பங்கு என்பது…'], [['sebahagian pemilikan syarikat', 'part ownership of a company', '公司的一部分所有权', 'நிறுவனத்தின் உரிமைப் பகுதி'], ['hadiah percuma', 'a free gift', '免费礼物', 'இலவசப் பரிசு'], ['sejenis kek', 'a kind of cake', '一种蛋糕', 'ஒரு வகைக் கேக்']]] },
      { y: '6', b: ['Risiko dan keselamatan', 'Risk and safety', '风险与安全', 'இடரும் பாதுகாப்பும்'],
        t: ['Melabur dengan selamat', 'Investing safely', '安全投资', 'பாதுகாப்பான முதலீடு'],
        p: [
          ['🧺', '🥚🥚🥚 → 🧺🧺🧺', ['Jangan satu bakul', 'Not all in one basket', '别把鸡蛋放在同一个篮子里', 'ஒரே கூடையில் வேண்டாம்'],
            ['Harga saham boleh naik dan turun. Bahagikan wang kepada beberapa pelaburan supaya risiko lebih kecil.', 'Share prices can go up and down. Spread your money across several investments so the risk is smaller.', '股价会涨也会跌。把钱分散在几种投资里，风险就比较小。', 'பங்கு விலை ஏறலாம், இறங்கலாம். பணத்தைப் பல முதலீடுகளில் பிரித்தால் இடர் குறையும்.']],
          ['🚩', '"Untung 50% seminggu!" 🚩', ['Awas penipuan', 'Watch out for scams', '小心诈骗', 'மோசடியில் கவனம்'],
            ['Janji untung besar dengan cepat tanpa risiko ialah tanda penipuan. Semak Senarai Amaran Pengguna Kewangan BNM dan tanya ibu bapa. Akaun pelaburan seperti Moomoo hanya untuk umur 18 tahun ke atas.', 'A promise of big, fast, risk-free profit is a sign of a scam. Check the BNM Financial Consumer Alert List and ask your parents. Investment accounts like Moomoo are for ages 18 and above only.', '承诺快速高回报又没有风险，就是诈骗的迹象。请查看国家银行的金融消费者警示名单，并问问父母。像Moomoo这样的投资户口只限18岁以上开设。', 'விரைவான பெரும் லாபம், இடர் இல்லை என்ற வாக்குறுதி மோசடியின் அடையாளம். BNM நிதி நுகர்வோர் எச்சரிக்கைப் பட்டியலைச் சரிபார், பெற்றோரிடம் கேள். Moomoo போன்ற முதலீட்டுக் கணக்கு 18 வயதுக்கு மேற்பட்டவர்களுக்கு மட்டுமே.']]
        ],
        q: ['🚩', ['"Untung besar, cepat, tiada risiko" ialah…', '"Big, fast, risk-free profit" is…', '“快速、高回报、没风险”是…', '"விரைவான பெரும் லாபம், இடர் இல்லை" என்பது…'], [['tanda penipuan', 'a sign of a scam', '诈骗的迹象', 'மோசடியின் அடையாளம்'], ['pelaburan terbaik', 'the best investment', '最好的投资', 'சிறந்த முதலீடு'], ['hadiah kerajaan', 'a government gift', '政府礼物', 'அரசுப் பரிசு']]] }
    ] });

  /* ================= PRASEKOLAH (4 hingga 6 tahun) ================= */
  sub({ id: 'matawal', age: [4, 6], c: ['#ffb547', '#f08a1c'], e: '🔢',
    n: ['Matematik Awal', 'Early Mathematics', '早期数学', 'ஆரம்பக் கணிதம்'],
    dskp: 'DSKP KSPK (Semakan 2017), Tunjang Sains dan Teknologi: Matematik Awal',
    ch: [
      { y: 'P', b: ['Konsep Nombor', 'Number Concepts', '数的概念', 'எண் கருத்து'],
        t: ['Jom kira 1 hingga 10', "Let's count 1 to 10", '一起数1到10', '1 முதல் 10 வரை எண்ணுவோம்'],
        p: [
          ['🍎', '1 2 3 4 5', ['Kira epal', 'Count the apples', '数苹果', 'ஆப்பிள்களை எண்ணு'],
            ['Kira satu demi satu: satu, dua, tiga, empat, lima.', 'Count one by one: one, two, three, four, five.', '一个一个数：一、二、三、四、五。', 'ஒவ்வொன்றாக எண்ணு: ஒன்று, இரண்டு, மூன்று, நான்கு, ஐந்து.']],
          ['🖐️', '5 + 5 = 10', ['Jari kita', 'Our fingers', '我们的手指', 'நம் விரல்கள்'],
            ['Satu tangan ada 5 jari. Dua tangan ada 10 jari.', 'One hand has 5 fingers. Two hands have 10 fingers.', '一只手有5根手指，两只手有10根手指。', 'ஒரு கையில் 5 விரல்கள் உள்ளன. இரண்டு கைகளில் 10 விரல்கள் உள்ளன.']]
        ],
        q: ['🦆🦆🦆', ['Berapa ekor itik?', 'How many ducks?', '有几只鸭子？', 'எத்தனை வாத்துகள்?'], ['3', '2', '4']] },
      { y: 'P', b: ['Bentuk dan Ruang', 'Shape and Space', '形状与空间', 'வடிவமும் இடமும்'],
        t: ['Bentuk di sekeliling kita', 'Shapes around us', '身边的形状', 'நம்மைச் சுற்றியுள்ள வடிவங்கள்'],
        p: [
          ['🔺', '● ▲ ■', ['Bulat, segi tiga, segi empat', 'Circle, triangle, square', '圆形、三角形、正方形', 'வட்டம், முக்கோணம், சதுரம்'],
            ['Bulatan bulat seperti roda. Segi tiga ada 3 sisi. Segi empat sama ada 4 sisi yang sama panjang.', 'A circle is round like a wheel. A triangle has 3 sides. A square has 4 equal sides.', '圆形像车轮一样圆。三角形有3条边。正方形有4条一样长的边。', 'வட்டம் சக்கரம் போல உருண்டையானது. முக்கோணத்திற்கு 3 பக்கங்கள். சதுரத்திற்கு சம நீளமுள்ள 4 பக்கங்கள்.']],
          ['🍕', '🍕 ▲  🕒 ●', ['Cari bentuk', 'Find the shapes', '找一找形状', 'வடிவங்களைத் தேடு'],
            ['Sepotong piza berbentuk segi tiga. Jam dinding berbentuk bulatan.', 'A slice of pizza is a triangle. A wall clock is a circle.', '一片披萨是三角形，挂钟是圆形。', 'ஒரு துண்டு பீட்சா முக்கோண வடிவம். சுவர்க் கடிகாரம் வட்ட வடிவம்.']]
        ],
        q: ['', ['Bentuk mana ada 3 sisi?', 'Which shape has 3 sides?', '哪个形状有3条边？', 'எந்த வடிவத்திற்கு 3 பக்கங்கள்?'], ['▲', '●', '■']] },
      { y: 'P', b: ['Pra Nombor', 'Pre-Number', '数前概念', 'எண்ணுக்கு முன்'],
        t: ['Pola dan saiz', 'Patterns and sizes', '规律与大小', 'அமைப்பும் அளவும்'],
        p: [
          ['🔴', '🔴🔵🔴🔵🔴🔵', ['Pola warna', 'Colour patterns', '颜色规律', 'வண்ண அமைப்பு'],
            ['Pola ialah susunan yang berulang: merah, biru, merah, biru.', 'A pattern is something that repeats: red, blue, red, blue.', '规律就是不断重复：红、蓝、红、蓝。', 'அமைப்பு என்பது திரும்பத் திரும்ப வருவது: சிவப்பு, நீலம், சிவப்பு, நீலம்.']],
          ['🐘', '🐘 > 🐈 > 🐜', ['Besar dan kecil', 'Big and small', '大和小', 'பெரியதும் சிறியதும்'],
            ['Gajah lebih besar daripada kucing. Semut lebih kecil daripada kucing.', 'An elephant is bigger than a cat. An ant is smaller than a cat.', '大象比猫大，蚂蚁比猫小。', 'யானை பூனையை விடப் பெரியது. எறும்பு பூனையை விடச் சிறியது.']]
        ],
        q: ['🔴🔵🔴🔵🔴 …', ['Apa seterusnya?', 'What comes next?', '下一个是什么？', 'அடுத்து வருவது எது?'], ['🔵', '🔴', '🟢']] }
    ] });

  sub({ id: 'sainsawal', age: [4, 6], c: ['#5fd38d', '#22a35a'], e: '🔍',
    n: ['Sains Awal', 'Early Science', '早期科学', 'ஆரம்ப அறிவியல்'],
    dskp: 'DSKP KSPK (Semakan 2017), Tunjang Sains dan Teknologi: Sains Awal',
    ch: [
      { y: 'P', b: ['Kemahiran Saintifik', 'Science Skills', '科学技能', 'அறிவியல் திறன்கள்'],
        t: ['Lima deria', 'Five senses', '五种感官', 'ஐம்புலன்கள்'],
        p: [
          ['👀', '👀 👂 👃 👅 ✋', ['Deria kita', 'Our senses', '我们的感官', 'நம் புலன்கள்'],
            ['Kita melihat dengan mata, mendengar dengan telinga, menghidu dengan hidung, merasa dengan lidah dan menyentuh dengan kulit.', 'We see with our eyes, hear with our ears, smell with our nose, taste with our tongue and touch with our skin.', '我们用眼睛看，用耳朵听，用鼻子闻，用舌头尝，用皮肤摸。', 'கண்ணால் பார்க்கிறோம், காதால் கேட்கிறோம், மூக்கால் முகர்கிறோம், நாக்கால் சுவைக்கிறோம், தோலால் தொடுகிறோம்.']],
          ['🍋', '🍋 😖  🍬 😋', ['Masam dan manis', 'Sour and sweet', '酸和甜', 'புளிப்பும் இனிப்பும்'],
            ['Limau rasanya masam. Gula rasanya manis. Lidah membantu kita merasa.', 'Lemons taste sour. Sugar tastes sweet. Our tongue helps us taste.', '柠檬是酸的，糖是甜的。舌头帮助我们尝味道。', 'எலுமிச்சை புளிக்கும். சர்க்கரை இனிக்கும். நாக்கு சுவையை அறிய உதவுகிறது.']]
        ],
        q: ['🔔', ['Kita mendengar dengan…', 'We hear with our…', '我们用什么听？', 'நாம் எதனால் கேட்கிறோம்?'], [['telinga', 'ears', '耳朵', 'காது'], ['mata', 'eyes', '眼睛', 'கண்'], ['hidung', 'nose', '鼻子', 'மூக்கு']]] },
      { y: 'P', b: ['Sains Hayat', 'Life Science', '生命科学', 'உயிர் அறிவியல்'],
        t: ['Benda hidup', 'Living things', '有生命的东西', 'உயிருள்ளவை'],
        p: [
          ['🌱', '🌱 → 🌳', ['Benda hidup membesar', 'Living things grow', '生物会长大', 'உயிருள்ளவை வளரும்'],
            ['Pokok, kucing dan kita ialah benda hidup. Benda hidup perlukan makanan, air dan udara.', 'Trees, cats and people are living things. Living things need food, water and air.', '树、猫和人都是生物。生物需要食物、水和空气。', 'மரம், பூனை, மனிதர்கள் உயிருள்ளவை. அவற்றுக்கு உணவு, நீர், காற்று தேவை.']],
          ['🪨', '🪨 🪑 ⚽', ['Benda bukan hidup', 'Non-living things', '非生物', 'உயிரற்றவை'],
            ['Batu, kerusi dan bola tidak makan dan tidak membesar. Ia benda bukan hidup.', 'Rocks, chairs and balls do not eat or grow. They are non-living things.', '石头、椅子和球不吃东西，也不会长大。它们是非生物。', 'கல், நாற்காலி, பந்து சாப்பிடுவதில்லை, வளர்வதில்லை. அவை உயிரற்றவை.']]
        ],
        q: ['', ['Yang mana benda hidup?', 'Which one is living?', '哪一个是生物？', 'எது உயிருள்ளது?'], ['🐱', '🪨', '⚽']] },
      { y: 'P', b: ['Sains Fizikal', 'Physical Science', '物理科学', 'இயற்பியல் அறிவியல்'],
        t: ['Timbul atau tenggelam', 'Float or sink', '浮还是沉', 'மிதக்குமா மூழ்குமா'],
        p: [
          ['🦆', '🍃 ⬆️  🪨 ⬇️', ['Cuba di dalam air', 'Try it in water', '在水里试一试', 'நீரில் சோதித்துப் பார்'],
            ['Daun dan bola getah timbul. Batu dan syiling tenggelam ke dasar.', 'Leaves and rubber balls float. Rocks and coins sink to the bottom.', '树叶和橡皮球会浮起来，石头和硬币会沉下去。', 'இலையும் ரப்பர் பந்தும் மிதக்கும். கல்லும் நாணயமும் அடியில் மூழ்கும்.']],
          ['🌧️', '☀️ 🌧️ 🌈', ['Cuaca hari ini', "Today's weather", '今天的天气', 'இன்றைய வானிலை'],
            ['Hari hujan, kita guna payung. Hari panas, kita minum banyak air.', 'On rainy days we use an umbrella. On hot days we drink lots of water.', '下雨天我们撑伞，炎热天我们多喝水。', 'மழை நாளில் குடை பிடிப்போம். வெயில் நாளில் நிறைய நீர் குடிப்போம்.']]
        ],
        q: ['💧', ['Yang mana tenggelam?', 'Which one sinks?', '哪一个会沉？', 'எது மூழ்கும்?'], ['🪨', '🍃', '🏐']] }
    ] });

  sub({ id: 'kemanusiaan', age: [4, 6], c: ['#ff8a8a', '#e05252'], e: '🏡',
    n: ['Kemanusiaan', 'Humanities', '人文', 'மனிதவியல்'],
    dskp: 'DSKP KSPK (Semakan 2017), Tunjang Kemanusiaan',
    ch: [
      { y: 'P', b: ['Diri dan keluarga', 'Self and family', '自己与家庭', 'நானும் குடும்பமும்'],
        t: ['Keluarga saya', 'My family', '我的家庭', 'என் குடும்பம்'],
        p: [
          ['👨‍👩‍👧', '👨 👩 👧 👦', ['Ahli keluarga', 'Family members', '家庭成员', 'குடும்ப உறுப்பினர்கள்'],
            ['Keluarga ada ayah, ibu, abang, kakak dan adik. Kita sayang keluarga kita.', 'A family has a father, a mother, brothers and sisters. We love our family.', '家里有爸爸、妈妈、哥哥、姐姐和弟弟妹妹。我们爱我们的家人。', 'குடும்பத்தில் அப்பா, அம்மா, அண்ணன், அக்கா, தம்பி தங்கை உள்ளனர். நாம் குடும்பத்தை நேசிக்கிறோம்.']],
          ['🏠', '🏠 📍', ['Alamat rumah', 'Home address', '家庭地址', 'வீட்டு முகவரி'],
            ['Hafal nama penuh dan alamat rumah. Ia membantu jika kita tersesat.', 'Learn your full name and home address. It helps if you get lost.', '记住自己的全名和家庭地址，迷路时会有帮助。', 'உன் முழுப் பெயரையும் வீட்டு முகவரியையும் மனப்பாடம் செய். வழி தவறினால் உதவும்.']]
        ],
        q: ['🏠', ['Siapa menjaga kita di rumah?', 'Who looks after us at home?', '在家里谁照顾我们？', 'வீட்டில் நம்மைக் கவனிப்பவர் யார்?'], [['ibu bapa', 'parents', '父母', 'பெற்றோர்'], ['pokok', 'a tree', '树', 'மரம்'], ['kereta', 'a car', '汽车', 'கார்']]] },
      { y: 'P', b: ['Komuniti', 'Community', '社区', 'சமூகம்'],
        t: ['Orang yang membantu', 'People who help us', '帮助我们的人', 'நமக்கு உதவுபவர்கள்'],
        p: [
          ['👮', '👮 🧑‍🚒 🧑‍⚕️', ['Pekerjaan', 'Jobs', '职业', 'தொழில்கள்'],
            ['Polis menjaga keselamatan. Bomba memadam api. Doktor merawat orang sakit.', 'Police keep us safe. Firefighters put out fires. Doctors treat sick people.', '警察保护我们的安全，消防员扑灭火灾，医生治疗病人。', 'காவலர் பாதுகாக்கிறார். தீயணைப்பு வீரர் தீயை அணைக்கிறார். மருத்துவர் நோயாளிகளுக்கு சிகிச்சை அளிக்கிறார்.']],
          ['☎️', '999', ['Nombor kecemasan', 'Emergency number', '紧急电话', 'அவசர எண்'],
            ['Di Malaysia, dail 999 untuk kecemasan: polis, ambulans dan bomba.', 'In Malaysia, dial 999 in an emergency for police, ambulance and fire.', '在马来西亚，遇到紧急情况拨打999，可以找警察、救护车和消防。', 'மலேசியாவில் அவசரத்திற்கு 999 அழை: காவல், ஆம்புலன்ஸ், தீயணைப்பு.']]
        ],
        q: ['🔥', ['Siapa memadam api?', 'Who puts out fires?', '谁扑灭火灾？', 'தீயை அணைப்பவர் யார்?'], [['bomba', 'firefighter', '消防员', 'தீயணைப்பு வீரர்'], ['doktor', 'doctor', '医生', 'மருத்துவர்'], ['posmen', 'postman', '邮差', 'தபால்காரர்']]] },
      { y: 'P', b: ['Negara', 'My country', '国家', 'நாடு'],
        t: ['Malaysia negaraku', 'Malaysia, my country', '马来西亚我的国家', 'மலேசியா என் நாடு'],
        p: [
          ['🇲🇾', '13 + 3', ['Negeri di Malaysia', 'States of Malaysia', '马来西亚的州属', 'மலேசிய மாநிலங்கள்'],
            ['Malaysia ada 13 negeri dan 3 Wilayah Persekutuan. Ibu negara kita ialah Kuala Lumpur.', 'Malaysia has 13 states and 3 Federal Territories. Our capital city is Kuala Lumpur.', '马来西亚有13个州和3个联邦直辖区，首都是吉隆坡。', 'மலேசியாவில் 13 மாநிலங்களும் 3 கூட்டரசுப் பிரதேசங்களும் உள்ளன. தலைநகரம் கோலாலம்பூர்.']],
          ['🎉', '31.8', ['Hari Kebangsaan', 'National Day', '国庆日', 'தேசிய தினம்'],
            ['Kita sambut Hari Kebangsaan pada 31 Ogos setiap tahun.', 'We celebrate National Day on 31 August every year.', '我们每年8月31日庆祝国庆日。', 'ஒவ்வோர் ஆண்டும் ஆகஸ்ட் 31 அன்று தேசிய தினத்தைக் கொண்டாடுகிறோம்.']]
        ],
        q: ['🇲🇾', ['Ibu negara Malaysia?', "Malaysia's capital city?", '马来西亚的首都是？', 'மலேசியாவின் தலைநகரம்?'], ['Kuala Lumpur', 'Ipoh', 'Melaka']] }
    ] });

  sub({ id: 'ketrampilan', age: [4, 6], c: ['#7ec8ff', '#3a8fe0'], e: '🧼',
    n: ['Ketrampilan Diri', 'Personal Skills', '个人技能', 'சுய திறன்கள்'],
    dskp: 'DSKP KSPK (Semakan 2017), Tunjang Ketrampilan Diri',
    ch: [
      { y: 'P', b: ['Kebersihan diri', 'Personal hygiene', '个人卫生', 'தன் சுத்தம்'],
        t: ['Bersih dan sihat', 'Clean and healthy', '干净又健康', 'சுத்தமும் ஆரோக்கியமும்'],
        p: [
          ['🧼', '20s', ['Cuci tangan', 'Wash your hands', '洗手', 'கை கழுவு'],
            ['Cuci tangan dengan sabun sebelum makan dan selepas ke tandas. Gosok selama 20 saat.', 'Wash your hands with soap before eating and after using the toilet. Scrub for 20 seconds.', '吃饭前和上厕所后用肥皂洗手，搓洗20秒。', 'சாப்பிடும் முன்னும் கழிப்பறை சென்ற பின்னும் சோப்பால் கை கழுவு. 20 விநாடிகள் தேய்.']],
          ['🪥', '☀️ 🪥  🌙 🪥', ['Gosok gigi', 'Brush your teeth', '刷牙', 'பல் துலக்கு'],
            ['Gosok gigi dua kali sehari: pagi dan sebelum tidur.', 'Brush your teeth twice a day: in the morning and before bed.', '每天刷牙两次：早上和睡觉前。', 'தினமும் இருமுறை பல் துலக்கு: காலையிலும் தூங்கும் முன்னும்.']]
        ],
        q: ['🧼', ['Bila kita cuci tangan?', 'When do we wash our hands?', '我们什么时候洗手？', 'எப்போது கை கழுவ வேண்டும்?'], [['sebelum makan', 'before eating', '吃饭前', 'சாப்பிடும் முன்'], ['semasa menonton TV', 'while watching TV', '看电视时', 'டிவி பார்க்கும்போது'], ['semasa berlari', 'while running', '跑步时', 'ஓடும்போது']]] },
      { y: 'P', b: ['Emosi', 'Feelings', '情绪', 'உணர்வுகள்'],
        t: ['Perasaan saya', 'My feelings', '我的感受', 'என் உணர்வுகள்'],
        p: [
          ['😊', '😊 😢 😠 😨', ['Pelbagai perasaan', 'Many feelings', '各种感受', 'பல உணர்வுகள்'],
            ['Kita boleh rasa gembira, sedih, marah atau takut. Semua perasaan itu biasa.', 'We can feel happy, sad, angry or scared. All feelings are normal.', '我们会开心、难过、生气或害怕。这些感受都很正常。', 'மகிழ்ச்சி, கவலை, கோபம், பயம் எல்லாம் வரும். எல்லா உணர்வுகளும் இயல்பானவை.']],
          ['🫁', '1 · 2 · 3 · 4 · 5', ['Tarik nafas', 'Breathe slowly', '慢慢呼吸', 'மெதுவாக மூச்சு விடு'],
            ['Bila marah, tarik nafas dalam-dalam dan kira hingga lima. Kemudian beritahu orang dewasa.', 'When you are angry, take a deep breath and count to five. Then tell a grown-up.', '生气时，深呼吸，数到五，然后告诉大人。', 'கோபம் வந்தால் ஆழ்ந்து மூச்சிழுத்து ஐந்து வரை எண்ணு. பிறகு பெரியவரிடம் சொல்.']]
        ],
        q: ['😠', ['Apa kita buat bila marah?', 'What do we do when angry?', '生气时应该怎么做？', 'கோபம் வந்தால் என்ன செய்வோம்?'], [['tarik nafas dan bercerita', 'breathe and talk about it', '深呼吸再说出来', 'மூச்சிழுத்துப் பேசுவோம்'], ['pukul kawan', 'hit a friend', '打朋友', 'நண்பனை அடிப்போம்'], ['baling barang', 'throw things', '乱丢东西', 'பொருளை எறிவோம்']]] },
      { y: 'P', b: ['Keselamatan', 'Safety', '安全', 'பாதுகாப்பு'],
        t: ['Selamat di mana-mana', 'Safe everywhere', '处处要安全', 'எங்கும் பாதுகாப்பு'],
        p: [
          ['🚸', '👉 👈 👉', ['Melintas jalan', 'Crossing the road', '过马路', 'சாலையைக் கடத்தல்'],
            ['Berhenti, lihat kanan, lihat kiri, lihat kanan semula. Lintas di lintasan belang bersama orang dewasa.', 'Stop, look right, look left, then right again. Cross at a zebra crossing with a grown-up.', '停下，先看右边，再看左边，再看一次右边。和大人一起走斑马线。', 'நில், வலது பார், இடது பார், மீண்டும் வலது பார். பெரியவருடன் வரிக்குதிரைக் கோட்டில் கட.']],
          ['🙅', '🛑', ['Sentuhan selamat', 'Safe touch', '安全的接触', 'பாதுகாப்பான தொடுதல்'],
            ['Badan kita milik kita. Jika ada sentuhan yang tidak selesa, katakan "Tidak!" dan beritahu ibu bapa atau guru.', 'Your body belongs to you. If a touch feels wrong, say "No!" and tell your parents or teacher.', '身体是我们自己的。如果有让你不舒服的接触，要说“不！”，并告诉父母或老师。', 'உன் உடல் உனக்குச் சொந்தம். தொடுதல் சரியில்லை எனத் தோன்றினால் "வேண்டாம்!" என்று சொல்லி பெற்றோரிடம் அல்லது ஆசிரியரிடம் சொல்.']]
        ],
        q: ['🚸', ['Di mana kita melintas jalan?', 'Where do we cross the road?', '我们在哪里过马路？', 'சாலையை எங்கே கடப்போம்?'], [['lintasan belang', 'zebra crossing', '斑马线', 'வரிக்குதிரைக் கோடு'], ['di selekoh', 'at a corner bend', '转弯处', 'வளைவில்'], ['di tengah jalan', 'in the middle of the road', '马路中间', 'சாலையின் நடுவில்']]] }
    ] });

  /* ================= BAHASA ================= */
  sub({ id: 'bm', age: [4, 12], c: ['#ffd24d', '#e9a400'], e: '📗',
    n: ['Bahasa Melayu', 'Malay Language', '马来文', 'மலாய் மொழி'],
    dskp: 'DSKP KSPK (Tunjang Komunikasi) dan DSKP KSSR (Semakan 2017) Bahasa Melayu Tahun 1–6',
    ch: [
      { y: '1', b: ['Membaca', 'Reading', '阅读', 'வாசிப்பு'],
        t: ['Suku kata', 'Syllables', '音节', 'அசைகள்'],
        p: [
          ['👕', 'ba + ju = baju', ['Gabung suku kata', 'Join the syllables', '拼合音节', 'அசைகளை இணை'],
            ['Perkataan dibina daripada suku kata. "Ba" dan "ju" menjadi "baju".', 'Words are built from syllables. "Ba" and "ju" make "baju" (shirt).', '单词由音节组成。“ba”和“ju”合起来就是“baju”（衣服）。', 'சொற்கள் அசைகளால் ஆனவை. "ba" + "ju" = "baju" (சட்டை).']],
          ['📚', 'bu-ku · ku-cing · ru-mah', ['Cuba baca', 'Try reading', '读一读', 'வாசித்துப் பார்'],
            ['Sebut perlahan-lahan, kemudian laju: buku, kucing, rumah.', 'Say them slowly, then quickly: buku (book), kucing (cat), rumah (house).', '先慢慢读，再快快读：buku（书）、kucing（猫）、rumah（房子）。', 'முதலில் மெதுவாக, பிறகு வேகமாகச் சொல்: buku (புத்தகம்), kucing (பூனை), rumah (வீடு).']]
        ],
        q: ['ku + da = ?', ['Perkataan apakah ini?', 'Which word is it?', '是哪个词？', 'இது எந்தச் சொல்?'], ['kuda', 'kadu', 'duka']] },
      { y: '2', b: ['Aspek Tatabahasa', 'Grammar', '语法', 'இலக்கணம்'],
        t: ['Kata nama dan kata kerja', 'Nouns and verbs', '名词和动词', 'பெயர்ச்சொல்லும் வினைச்சொல்லும்'],
        p: [
          ['🐈', 'kucing · berlari', ['Nama dan perbuatan', 'Names and actions', '名称和动作', 'பெயரும் செயலும்'],
            ['Kata nama ialah nama benda, orang atau tempat, seperti "kucing". Kata kerja ialah perbuatan, seperti "berlari".', 'A noun names a thing, person or place, like "kucing" (cat). A verb is an action, like "berlari" (run).', '名词是事物、人或地方的名称，如“kucing”（猫）。动词表示动作，如“berlari”（跑）。', 'பெயர்ச்சொல் பொருள், நபர், இடத்தின் பெயர், எ.கா. "kucing" (பூனை). வினைச்சொல் செயலைக் குறிக்கும், எ.கா. "berlari" (ஓடு).']],
          ['🏃', 'Ali | berlari.', ['Ayat mudah', 'A simple sentence', '简单句', 'எளிய வாக்கியம்'],
            ['Ayat mudah ada subjek dan predikat. "Ali" ialah subjek, "berlari" ialah predikat.', 'A simple sentence has a subject and a predicate. "Ali" is the subject, "berlari" is the predicate.', '简单句有主语和谓语。“Ali”是主语，“berlari”是谓语。', 'எளிய வாக்கியத்தில் எழுவாயும் பயனிலையும் உண்டு. "Ali" எழுவாய், "berlari" பயனிலை.']]
        ],
        q: ['', ['Yang mana kata kerja?', 'Which one is a verb?', '哪一个是动词？', 'எது வினைச்சொல்?'], ['makan', 'meja', 'merah']] },
      { y: '4', b: ['Aspek Seni Bahasa', 'Language Arts', '语言艺术', 'மொழிக் கலை'],
        t: ['Peribahasa', 'Malay proverbs', '马来谚语', 'மலாய்ப் பழமொழிகள்'],
        p: [
          ['🐸', 'Seperti katak di bawah tempurung', ['Katak di bawah tempurung', 'A frog under a coconut shell', '椰壳下的青蛙', 'சிரட்டைக்குள் தவளை'],
            ['Maksudnya: orang yang kurang pengetahuan kerana tidak meneroka dunia luar.', 'Meaning: someone with little knowledge because they never explore the world.', '意思：见识少，因为从不去外面看看世界（像井底之蛙）。', 'பொருள்: வெளியுலகை அறியாததால் அறிவு குறைந்தவர் (கிணற்றுத் தவளை போல).']],
          ['🤝', 'Bulat air kerana pembetung, bulat manusia kerana muafakat', ['Muafakat', 'Working together', '同心协力', 'ஒற்றுமை'],
            ['Maksudnya: perpaduan tercapai apabila kita berbincang dan bersepakat.', 'Meaning: unity comes when we discuss and agree together.', '意思：大家商量、达成共识，就能团结一致。', 'பொருள்: கலந்து பேசி ஒத்துப் போனால் ஒற்றுமை கிடைக்கும்.']]
        ],
        q: ['🐸', ['"Katak di bawah tempurung" bermaksud…', '"A frog under a coconut shell" means…', '“椰壳下的青蛙”的意思是…', '"சிரட்டைக்குள் தவளை" என்பதன் பொருள்…'], [['kurang pengetahuan', 'knowing little', '见识少', 'அறிவு குறைவு'], ['sangat rajin', 'very hardworking', '非常勤劳', 'மிகவும் உழைப்பாளி'], ['suka melompat', 'likes jumping', '喜欢跳', 'குதிக்கப் பிடிக்கும்']]] }
    ] });

  sub({ id: 'bi', age: [4, 12], c: ['#ff9db0', '#e8577a'], e: '📕',
    n: ['Bahasa Inggeris', 'English', '英文', 'ஆங்கிலம்'],
    dskp: 'DSKP KSPK (Tunjang Komunikasi) dan DSKP KSSR (Semakan 2017) Bahasa Inggeris Tahun 1–6, selaras CEFR',
    ch: [
      { y: '1', b: ['Listening and Speaking', 'Listening and Speaking', '听与说', 'கேட்டலும் பேசுதலும்'],
        t: ['Sounds and greetings', 'Sounds and greetings', '发音与问候', 'ஒலிகளும் வாழ்த்துகளும்'],
        p: [
          ['🐱', 'c · a · t → cat', ['Blend the sounds', 'Blend the sounds', '拼读', 'ஒலிகளை இணை'],
            ['Gabungkan bunyi /k/ /æ/ /t/ untuk menyebut "cat" (kucing).', 'Blend the sounds /k/ /æ/ /t/ to say "cat".', '把 /k/ /æ/ /t/ 三个音连起来，就是“cat”（猫）。', '/k/ /æ/ /t/ ஒலிகளை இணைத்தால் "cat" (பூனை).']],
          ['☀️', 'Good morning!', ['Greetings', 'Greetings', '问候语', 'வாழ்த்துகள்'],
            ['Sebut "Good morning" sebelum tengah hari, "Good afternoon" selepas tengah hari dan "Good night" sebelum tidur.', 'Say "Good morning" before noon, "Good afternoon" after noon and "Good night" before bed.', '中午前说“Good morning”，中午后说“Good afternoon”，睡前说“Good night”。', 'நண்பகலுக்கு முன் "Good morning", பின் "Good afternoon", தூங்கும் முன் "Good night" சொல்.']]
        ],
        q: ['🐶', ['Which word is it?', 'Which word is it?', '是哪个词？', 'இது எந்தச் சொல்?'], ['dog', 'dig', 'log']] },
      { y: '2', b: ['Speaking', 'Speaking', '说', 'பேசுதல்'],
        t: ['All about me', 'All about me', '关于我', 'என்னைப் பற்றி'],
        p: [
          ['🙋', 'My name is Aina. I am seven.', ['Introduce yourself', 'Introduce yourself', '自我介绍', 'உன்னை அறிமுகம் செய்'],
            ['Perkenalkan diri dengan nama dan umur kamu dalam bahasa Inggeris.', 'Tell people your name and your age.', '用英文说出你的名字和年龄。', 'உன் பெயரையும் வயதையும் ஆங்கிலத்தில் சொல்.']],
          ['🎨', 'red · blue · yellow · green', ['Colours', 'Colours', '颜色', 'வண்ணங்கள்'],
            ['The sky is blue: langit biru. A banana is yellow: pisang kuning. Leaves are green: daun hijau.', 'The sky is blue. A banana is yellow. Leaves are green.', 'The sky is blue（天空是蓝色的）。A banana is yellow（香蕉是黄色的）。Leaves are green（叶子是绿色的）。', 'The sky is blue (வானம் நீலம்). A banana is yellow (வாழைப்பழம் மஞ்சள்). Leaves are green (இலைகள் பச்சை).']]
        ],
        q: ['🍌', ['What colour is it?', 'What colour is it?', '这是什么颜色？', 'இது என்ன வண்ணம்?'], ['yellow', 'red', 'blue']] },
      { y: '3', b: ['Writing', 'Writing', '写作', 'எழுதுதல்'],
        t: ['Writing sentences', 'Writing sentences', '写句子', 'வாக்கியம் எழுதுதல்'],
        p: [
          ['✏️', 'I like rice.', ['A sentence', 'A sentence', '句子', 'வாக்கியம்'],
            ['Ayat bermula dengan huruf besar dan berakhir dengan noktah.', 'A sentence starts with a capital letter and ends with a full stop.', '英文句子以大写字母开头，以句号结尾。', 'ஆங்கில வாக்கியம் பெரிய எழுத்தில் தொடங்கி முற்றுப்புள்ளியில் முடியும்.']],
          ['📅', 'Monday · Tuesday · Wednesday', ['Days of the week', 'Days of the week', '星期', 'வார நாட்கள்'],
            ['Seminggu ada 7 hari. Nama hari dalam bahasa Inggeris sentiasa bermula dengan huruf besar.', 'There are 7 days in a week. Days of the week always start with a capital letter.', '一个星期有7天。英文的星期名称都以大写字母开头。', 'ஒரு வாரத்தில் 7 நாட்கள். ஆங்கிலத்தில் நாட்களின் பெயர் எப்போதும் பெரிய எழுத்தில் தொடங்கும்.']]
        ],
        q: ['', ['Which sentence is correct?', 'Which sentence is correct?', '哪个句子是正确的？', 'எந்த வாக்கியம் சரி?'], ['I like cats.', 'i like cats', 'I like cats']] }
    ] });

  sub({ id: 'bc', age: [4, 12], c: ['#ff7a59', '#d9432a'], e: '🏮',
    n: ['Bahasa Cina', 'Chinese Language', '华文', 'சீன மொழி'],
    dskp: 'DSKP KSPK (Tunjang Komunikasi) dan DSKP KSSR (Semakan 2017) Bahasa Cina SJK Tahun 1–6',
    ch: [
      { y: '1', b: ['Mendengar dan bertutur', 'Listening and speaking', '聆听与说话', 'கேட்டலும் பேசுதலும்'],
        t: ['Salam dan terima kasih', 'Hello and thank you', '你好和谢谢', 'வணக்கமும் நன்றியும்'],
        p: [
          ['👋', '你好 nǐ hǎo', ['Hai!', 'Hello!', '你好！', 'வணக்கம்!'],
            ['"你好" bermaksud hai atau apa khabar. "nǐ hǎo" ialah sebutannya dalam pinyin.', '"你好" means hello. "nǐ hǎo" is how you say it in pinyin.', '“你好”是见面打招呼的话，nǐ hǎo 是它的拼音。', '"你好" என்றால் வணக்கம். "nǐ hǎo" என்பது அதன் பின்யின் உச்சரிப்பு.']],
          ['🙏', '谢谢 xièxie · 对不起 duìbuqǐ', ['Terima kasih dan maaf', 'Thank you and sorry', '谢谢和对不起', 'நன்றியும் மன்னிப்பும்'],
            ['Sebut "谢谢" untuk berterima kasih dan "对不起" untuk meminta maaf.', 'Say "谢谢" to thank someone and "对不起" to say sorry.', '感谢别人时说“谢谢”，做错事时说“对不起”。', 'நன்றி சொல்ல "谢谢", மன்னிப்புக் கேட்க "对不起".']]
        ],
        q: ['谢谢', ['Apakah maksudnya?', 'What does it mean?', '这是什么意思？', 'இதன் பொருள் என்ன?'], [['terima kasih', 'thank you', '感谢别人', 'நன்றி'], ['selamat pagi', 'good morning', '早上好', 'காலை வணக்கம்'], ['selamat tinggal', 'goodbye', '再见', 'போய் வருகிறேன்']]] },
      { y: '1', b: ['Asas bahasa', 'Language basics', '语文基础', 'மொழி அடிப்படை'],
        t: ['Nombor 1 hingga 10', 'Numbers 1 to 10', '数字一到十', 'எண்கள் 1 முதல் 10'],
        p: [
          ['🔢', '一 二 三 四 五', ['1 hingga 5', '1 to 5', '一到五', '1 முதல் 5'],
            ['yī, èr, sān, sì, wǔ ialah nombor 1 hingga 5.', 'yī, èr, sān, sì, wǔ are the numbers 1 to 5.', '一（yī）、二（èr）、三（sān）、四（sì）、五（wǔ）。', 'yī, èr, sān, sì, wǔ என்பவை 1 முதல் 5.']],
          ['✋', '六 七 八 九 十', ['6 hingga 10', '6 to 10', '六到十', '6 முதல் 10'],
            ['liù, qī, bā, jiǔ, shí ialah nombor 6 hingga 10.', 'liù, qī, bā, jiǔ, shí are the numbers 6 to 10.', '六（liù）、七（qī）、八（bā）、九（jiǔ）、十（shí）。', 'liù, qī, bā, jiǔ, shí என்பவை 6 முதல் 10.']]
        ],
        q: ['三', ['Berapakah ini?', 'Which number is this?', '这是几？', 'இது எந்த எண்?'], ['3', '2', '5']] },
      { y: '2', b: ['Menulis', 'Writing', '书写', 'எழுதுதல்'],
        t: ['Huruf bergambar', 'Picture characters', '象形字', 'படவெழுத்துகள்'],
        p: [
          ['⛰️', '山 shān', ['Gunung', 'Mountain', '山', 'மலை'],
            ['"山" bermaksud gunung. Bentuknya seperti tiga puncak gunung.', '"山" means mountain. It looks like three mountain peaks.', '“山”的样子像三座山峰。', '"山" என்றால் மலை. மூன்று மலை உச்சிகள் போலத் தோன்றும்.']],
          ['🌳', '木 mù · 林 lín · 森 sēn', ['Pokok menjadi hutan', 'Trees become a forest', '木、林、森', 'மரம் காடாகிறது'],
            ['"木" ialah pokok. Dua pokok "林" ialah hutan kecil. Tiga pokok "森" ialah hutan tebal.', '"木" is a tree. Two trees "林" make a wood. Three trees "森" make a thick forest.', '一个“木”是树，两个“木”成“林”，三个“木”成“森”。', '"木" மரம். இரண்டு மரம் "林" சிறு காடு. மூன்று மரம் "森" அடர்ந்த காடு.']]
        ],
        q: ['山', ['Apakah maksudnya?', 'What does it mean?', '这是什么意思？', 'இதன் பொருள் என்ன?'], [['gunung', 'mountain', '高山', 'மலை'], ['air', 'water', '水', 'நீர்'], ['matahari', 'sun', '太阳', 'சூரியன்']]] }
    ] });

  sub({ id: 'bt', age: [4, 12], c: ['#ffa94d', '#e0700f'], e: '🪔',
    n: ['Bahasa Tamil', 'Tamil Language', '淡米尔文', 'தமிழ் மொழி'],
    dskp: 'DSKP KSPK (Tunjang Komunikasi) dan DSKP KSSR (Semakan 2017) Bahasa Tamil SJK Tahun 1–6',
    ch: [
      { y: '1', b: ['Membaca', 'Reading', '阅读', 'வாசிப்பு'],
        t: ['Huruf vokal Tamil', 'Tamil vowels', '淡米尔文元音', 'உயிர் எழுத்துகள்'],
        p: [
          ['🪔', 'அ ஆ இ ஈ உ ஊ', ['Huruf vokal', 'Vowels', '元音', 'உயிர் எழுத்து'],
            ['Bahasa Tamil ada 12 huruf vokal (உயிர் எழுத்து). Ini enam yang pertama.', 'Tamil has 12 vowels (உயிர் எழுத்து). These are the first six.', '淡米尔文有12个元音，这是前六个。', 'தமிழில் 12 உயிர் எழுத்துகள் உள்ளன. இவை முதல் ஆறு.']],
          ['🙏', 'வணக்கம் vaṇakkam', ['Salam', 'Greeting', '问候', 'வணக்கம்'],
            ['"வணக்கம்" ialah ucapan salam sambil merapatkan kedua-dua tapak tangan.', '"வணக்கம்" is a greeting said with both palms pressed together.', '“வணக்கம்”是双手合十时说的问候语。', 'இரு கைகளையும் கூப்பி "வணக்கம்" சொல்லி வாழ்த்துவோம்.']]
        ],
        q: ['வணக்கம்', ['Bila kita sebut perkataan ini?', 'When do we say this?', '什么时候说这句话？', 'இதை எப்போது சொல்வோம்?'], [['semasa bertemu', 'when we meet someone', '见面时', 'ஒருவரைச் சந்திக்கும்போது'], ['semasa tidur', 'while sleeping', '睡觉时', 'தூங்கும்போது'], ['semasa makan', 'while eating', '吃饭时', 'சாப்பிடும்போது']]] },
      { y: '1', b: ['Mendengar dan bertutur', 'Listening and speaking', '聆听与说话', 'கேட்டலும் பேசுதலும்'],
        t: ['Nombor dan keluarga', 'Numbers and family', '数字和家人', 'எண்களும் குடும்பமும்'],
        p: [
          ['🍎', 'ஒன்று · இரண்டு · மூன்று', ['1, 2, 3', '1, 2, 3', '一、二、三', 'ஒன்று, இரண்டு, மூன்று'],
            ['onṟu (1), iraṇṭu (2), mūṉṟu (3).', 'onṟu (1), iraṇṭu (2), mūṉṟu (3).', 'onṟu（1）、iraṇṭu（2）、mūṉṟu（3）。', 'ஒன்று (1), இரண்டு (2), மூன்று (3).']],
          ['👪', 'அம்மா · அப்பா', ['Ibu dan ayah', 'Mother and father', '妈妈和爸爸', 'அம்மாவும் அப்பாவும்'],
            ['"அம்மா" (ammā) ialah ibu. "அப்பா" (appā) ialah ayah.', '"அம்மா" (ammā) is mother. "அப்பா" (appā) is father.', '“அம்மா”（ammā）是妈妈，“அப்பா”（appā）是爸爸。', '"அம்மா" தாய், "அப்பா" தந்தை.']]
        ],
        q: ['அம்மா', ['Apakah maksudnya?', 'What does it mean?', '这是什么意思？', 'இதன் பொருள் என்ன?'], [['ibu', 'mother', '妈妈', 'தாய்'], ['ayah', 'father', '爸爸', 'தந்தை'], ['adik', 'younger sibling', '弟弟妹妹', 'தம்பி']]] },
      { y: '4', b: ['Seni bahasa (செய்யுள்)', 'Poetry (செய்யுள்)', '诗歌（செய்யுள்）', 'செய்யுளும் மொழியணியும்'],
        t: ['Thirukkural', 'Thirukkural', '《古拉尔》', 'திருக்குறள்'],
        p: [
          ['📜', 'அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு', ['Kural pertama', 'The first kural', '第一首古拉尔', 'முதல் குறள்'],
            ['Karya Thiruvalluvar: seperti huruf "அ" memulakan semua huruf, Tuhan ialah permulaan dunia.', 'By Thiruvalluvar: as the letter "அ" begins all letters, God is the beginning of the world.', '蒂鲁瓦鲁瓦的作品：正如“அ”是所有字母的开始，神是世界的开始。', 'திருவள்ளுவர்: எழுத்துகள் எல்லாம் "அ" என்பதில் தொடங்குவது போல், உலகம் இறைவனில் தொடங்குகிறது.']],
          ['🧡', 'நன்றி naṉṟi', ['Terima kasih', 'Thank you', '谢谢', 'நன்றி'],
            ['"நன்றி" bermaksud terima kasih. Ucapkan selepas menerima bantuan.', '"நன்றி" means thank you. Say it after someone helps you.', '“நன்றி”的意思是谢谢。别人帮助你之后要说。', 'யாராவது உதவி செய்தால் "நன்றி" சொல்.']]
        ],
        q: ['நன்றி', ['Apakah maksudnya?', 'What does it mean?', '这是什么意思？', 'இதன் பொருள் என்ன?'], [['terima kasih', 'thank you', '谢谢', 'நன்றி கூறுதல்'], ['maaf', 'sorry', '对不起', 'மன்னிப்பு'], ['selamat tinggal', 'goodbye', '再见', 'விடைபெறுதல்']]] }
    ] });

  /* ================= TERAS SEKOLAH RENDAH ================= */
  sub({ id: 'mt', age: [7, 12], c: ['#8e8bff', '#5b54e8'], e: '➗',
    n: ['Matematik', 'Mathematics', '数学', 'கணிதம்'],
    dskp: 'DSKP KSSR (Semakan 2017) Matematik Tahun 1–6',
    ch: [
      { y: '1', b: ['Nombor Bulat dan Operasi', 'Whole Numbers and Operations', '整数与运算', 'முழு எண்களும் செயல்களும்'],
        t: ['Nilai tempat dan tambah', 'Place value and adding', '位值与加法', 'இடமதிப்பும் கூட்டலும்'],
        p: [
          ['🧮', '47 = 40 + 7', ['Nilai tempat', 'Place value', '位值', 'இடமதிப்பு'],
            ['Dalam 47, digit 4 bernilai 40 (puluh) dan digit 7 bernilai 7 (sa).', 'In 47, the digit 4 is worth 40 (tens) and the digit 7 is worth 7 (ones).', '在47里，4代表40（十位），7代表7（个位）。', '47-இல் 4 என்பது 40 (பத்துகள்), 7 என்பது 7 (ஒன்றுகள்).']],
          ['➕', '8 + 2 + 3 = 13', ['Buat 10 dahulu', 'Make 10 first', '先凑十', 'முதலில் 10 ஆக்கு'],
            ['8 + 5? Ambil 2 daripada 5 supaya 8 menjadi 10, kemudian tambah baki 3. Jadi 8 + 5 = 13.', '8 + 5? Take 2 from the 5 to make 10, then add the 3 left. So 8 + 5 = 13.', '8 + 5？从5里拿2凑成10，再加剩下的3，所以 8 + 5 = 13。', '8 + 5? 5-இலிருந்து 2 எடுத்து 10 ஆக்கு, மீதி 3 கூட்டு. எனவே 8 + 5 = 13.']]
        ],
        q: ['6 + 7 = ?', ['Berapakah jawapannya?', 'What is the answer?', '答案是多少？', 'விடை என்ன?'], ['13', '12', '14']] },
      { y: '3', b: ['Pecahan', 'Fractions', '分数', 'பின்னங்கள்'],
        t: ['Separuh dan suku', 'Halves and quarters', '二分之一和四分之一', 'அரையும் காலும்'],
        p: [
          ['🍕', '½  ·  ¼', ['Bahagian yang sama', 'Equal parts', '平均分', 'சம பாகங்கள்'],
            ['Potong piza kepada 2 bahagian sama: setiap satu ialah satu perdua (½). 4 bahagian sama: satu perempat (¼).', 'Cut a pizza into 2 equal parts: each is one half (½). Into 4 equal parts: each is one quarter (¼).', '把披萨平均切成2份，每份是二分之一（½）；切成4份，每份是四分之一（¼）。', 'பீட்சாவை 2 சம பாகமாக்கினால் ஒவ்வொன்றும் அரை (½). 4 சம பாகமாக்கினால் கால் (¼).']],
          ['🍫', '2/4 = 1/2', ['Pecahan setara', 'Equivalent fractions', '等值分数', 'சமமான பின்னங்கள்'],
            ['Dua daripada empat bahagian sama banyak dengan satu daripada dua bahagian.', 'Two out of four parts is the same amount as one out of two parts.', '四份里的两份，和两份里的一份一样多。', 'நான்கில் இரண்டு பாகம், இரண்டில் ஒரு பாகத்திற்குச் சமம்.']]
        ],
        q: ['¼ + ¼ = ?', ['Berapakah jawapannya?', 'What is the answer?', '答案是多少？', 'விடை என்ன?'], ['½', '⅛', '1']] },
      { y: '2', b: ['Wang', 'Money', '钱币', 'பணம்'],
        t: ['Ringgit dan sen', 'Ringgit and sen', '令吉和仙', 'ரிங்கிட்டும் சென்னும்'],
        p: [
          ['💵', 'RM1 = 100 sen', ['Wang Malaysia', 'Malaysian money', '马来西亚的钱', 'மலேசியப் பணம்'],
            ['RM1 sama dengan 100 sen. Syiling kita ialah 5 sen, 10 sen, 20 sen dan 50 sen.', 'RM1 equals 100 sen. Our coins are 5 sen, 10 sen, 20 sen and 50 sen.', 'RM1等于100仙。我们的硬币有5仙、10仙、20仙和50仙。', 'RM1 = 100 சென். நம் நாணயங்கள் 5, 10, 20, 50 சென்.']],
          ['🛒', 'RM5.00 − RM3.50 = RM1.50', ['Baki wang', 'Change', '找钱', 'மீதிப் பணம்'],
            ['Beli buku RM3.50 dengan wang RM5. Baki ialah RM1.50.', 'Buy a RM3.50 book with RM5. Your change is RM1.50.', '用RM5买一本RM3.50的书，找回RM1.50。', 'RM5 கொடுத்து RM3.50 புத்தகம் வாங்கினால் மீதி RM1.50.']]
        ],
        q: ['RM10 − RM4.50 = ?', ['Berapakah bakinya?', 'How much change?', '找回多少钱？', 'மீதி எவ்வளவு?'], ['RM5.50', 'RM6.50', 'RM5.00']] }
    ] });

  sub({ id: 'sn', age: [7, 12], c: ['#4fd1a5', '#14a37a'], e: '🔬',
    n: ['Sains', 'Science', '科学', 'அறிவியல்'],
    dskp: 'DSKP KSSR (Semakan 2017) Sains Tahun 1–6',
    ch: [
      { y: '1', b: ['Sains Hayat', 'Life Science', '生命科学', 'உயிர் அறிவியல்'],
        t: ['Tumbuhan dan haiwan', 'Plants and animals', '植物与动物', 'தாவரங்களும் விலங்குகளும்'],
        p: [
          ['🌻', '💧 + ☀️ + 💨', ['Keperluan tumbuhan', 'What plants need', '植物需要什么', 'தாவரத் தேவைகள்'],
            ['Tumbuhan perlukan air, udara dan cahaya matahari untuk hidup dan membesar.', 'Plants need water, air and sunlight to live and grow.', '植物需要水、空气和阳光才能生长。', 'தாவரங்கள் வாழவும் வளரவும் நீர், காற்று, சூரிய ஒளி தேவை.']],
          ['🐛', '🥚 → 🐛 → 🦋', ['Kitar hidup rama-rama', 'Butterfly life cycle', '蝴蝶的生命周期', 'பட்டாம்பூச்சியின் வாழ்க்கைச் சுழற்சி'],
            ['Rama-rama bermula sebagai telur, kemudian menjadi larva (ulat), pupa dan akhirnya rama-rama dewasa.', 'A butterfly starts as an egg, then becomes a larva (caterpillar), a pupa and finally an adult butterfly.', '蝴蝶先是卵，然后变成幼虫（毛毛虫）、蛹，最后变成蝴蝶。', 'முட்டை, புழு, கூட்டுப்புழு, பிறகு முழுப் பட்டாம்பூச்சி.']]
        ],
        q: ['🌱', ['Apakah keperluan tumbuhan?', 'What do plants need?', '植物需要什么？', 'தாவரங்களுக்கு என்ன தேவை?'], [['air dan cahaya matahari', 'water and sunlight', '水和阳光', 'நீரும் சூரிய ஒளியும்'], ['gula-gula', 'sweets', '糖果', 'மிட்டாய்'], ['tempat gelap sahaja', 'only darkness', '只要黑暗', 'இருள் மட்டும்']]] },
      { y: '2', b: ['Sains Fizikal', 'Physical Science', '物理科学', 'இயற்பியல் அறிவியல்'],
        t: ['Magnet dan elektrik', 'Magnets and electricity', '磁铁与电', 'காந்தமும் மின்சாரமும்'],
        p: [
          ['🧲', 'N S · S N', ['Magnet', 'Magnets', '磁铁', 'காந்தம்'],
            ['Magnet menarik benda daripada besi seperti paku dan klip kertas. Kutub sama menolak, kutub berlainan menarik.', 'Magnets attract iron things like nails and paper clips. Like poles push apart, unlike poles pull together.', '磁铁能吸住铁钉、回形针等铁制品。同极相斥，异极相吸。', 'காந்தம் இரும்பு ஆணி, காகிதக் கிளிப்பை ஈர்க்கும். ஒத்த துருவங்கள் விலக்கும், எதிர் துருவங்கள் ஈர்க்கும்.']],
          ['💡', '🔋 → 🔌 → 💡', ['Litar lengkap', 'A complete circuit', '完整电路', 'முழுமையான மின்சுற்று'],
            ['Mentol menyala apabila bateri, wayar dan mentol disambung menjadi litar lengkap.', 'A bulb lights up when a battery, wires and the bulb are joined in a complete circuit.', '电池、电线和灯泡连成完整电路，灯泡就会亮。', 'மின்கலம், கம்பி, விளக்கு இணைந்து முழுச் சுற்றானால் விளக்கு எரியும்.']]
        ],
        q: ['🧲', ['Magnet menarik…', 'A magnet attracts…', '磁铁能吸住…', 'காந்தம் எதை ஈர்க்கும்?'], [['paku besi', 'iron nails', '铁钉', 'இரும்பு ஆணி'], ['kertas', 'paper', '纸', 'காகிதம்'], ['kayu', 'wood', '木头', 'மரக்கட்டை']]] },
      { y: '4', b: ['Bumi dan Sains Angkasa', 'Earth and Space Science', '地球与太空科学', 'பூமியும் விண்வெளி அறிவியலும்'],
        t: ['Sistem Suria', 'The Solar System', '太阳系', 'சூரியக் குடும்பம்'],
        p: [
          ['🪐', '☀️ ← 🌍 ← 🌙', ['Beredar', 'Orbits', '公转', 'சுற்றுப்பாதை'],
            ['Bumi beredar mengelilingi Matahari. Bulan beredar mengelilingi Bumi.', 'The Earth orbits the Sun. The Moon orbits the Earth.', '地球绕着太阳转，月亮绕着地球转。', 'பூமி சூரியனைச் சுற்றுகிறது. நிலவு பூமியைச் சுற்றுகிறது.']],
          ['🌗', '☀️ 🌍 🌑', ['Siang dan malam', 'Day and night', '白天和黑夜', 'பகலும் இரவும்'],
            ['Bumi berputar pada paksinya. Bahagian yang menghadap Matahari mengalami siang, bahagian lain mengalami malam.', 'The Earth spins on its axis. The side facing the Sun has day, the other side has night.', '地球绕着地轴自转。面向太阳的一面是白天，另一面是黑夜。', 'பூமி தன் அச்சில் சுழல்கிறது. சூரியனை நோக்கும் பக்கம் பகல், மறுபக்கம் இரவு.']]
        ],
        q: ['🌍', ['Apa yang beredar mengelilingi Bumi?', 'What orbits the Earth?', '什么绕着地球转？', 'பூமியைச் சுற்றுவது எது?'], [['Bulan', 'the Moon', '月亮', 'நிலவு'], ['Matahari', 'the Sun', '太阳', 'சூரியன்'], ['Marikh', 'Mars', '火星', 'செவ்வாய்']]] }
    ] });

  sub({ id: 'pi', age: [4, 12], c: ['#3fbf7f', '#16884f'], e: '🕌',
    n: ['Pendidikan Islam', 'Islamic Education', '伊斯兰教育', 'இஸ்லாமியக் கல்வி'],
    dskp: 'DSKP KSPK (Tunjang Kerohanian, Sikap dan Nilai) dan DSKP KSSR (Semakan 2017) Pendidikan Islam Tahun 1–6',
    ch: [
      { y: '1', b: ['Akidah', 'Faith (Akidah)', '信仰', 'நம்பிக்கை'],
        t: ['Rukun Iman', 'Pillars of Faith', '六大信仰', 'ஈமானின் தூண்கள்'],
        p: [
          ['🕌', '6', ['Enam Rukun Iman', 'Six pillars of faith', '六大信仰', 'ஆறு தூண்கள்'],
            ['Beriman kepada Allah, malaikat, kitab, rasul, hari akhirat serta qada\' dan qadar.', 'Believing in Allah, the angels, the holy books, the messengers, the Last Day, and qada\' and qadar (divine decree).', '信安拉、天使、经典、使者、末日和前定。', 'அல்லாஹ், வானவர்கள், வேதங்கள், தூதர்கள், இறுதி நாள், விதி ஆகியவற்றின் மீது நம்பிக்கை.']],
          ['☝️', 'لَا إِلٰهَ إِلَّا اللّٰهُ', ['Allah Maha Esa', 'Allah is One', '安拉独一', 'அல்லாஹ் ஒருவனே'],
            ['Kita percaya Allah itu satu. Kalimah ini bermaksud "Tiada Tuhan melainkan Allah".', 'We believe Allah is One. These words mean "There is no god but Allah".', '我们相信安拉是独一的。这句话的意思是“除安拉外，别无神灵”。', 'அல்லாஹ் ஒருவனே என நம்புகிறோம். "அல்லாஹ்வைத் தவிர இறைவன் இல்லை" என்பது இதன் பொருள்.']]
        ],
        q: ['🕌', ['Berapakah Rukun Iman?', 'How many pillars of faith?', '信仰有几大支柱？', 'ஈமானின் தூண்கள் எத்தனை?'], ['6', '5', '4']] },
      { y: '1', b: ['Ibadah', 'Worship (Ibadah)', '功修', 'வழிபாடு'],
        t: ['Rukun Islam dan wuduk', 'Pillars of Islam and wudu', '五功与小净', 'இஸ்லாத்தின் தூண்களும் உளூவும்'],
        p: [
          ['🤲', '5', ['Lima Rukun Islam', 'Five pillars of Islam', '伊斯兰五功', 'இஸ்லாத்தின் ஐந்து தூண்கள்'],
            ['Mengucap dua kalimah syahadah, solat, puasa Ramadan, zakat dan haji bagi yang mampu.', 'The declaration of faith, prayer, fasting in Ramadan, zakat, and Hajj for those who are able.', '念清真言、礼拜、斋戒、天课，以及有能力者朝觐。', 'கலிமா, தொழுகை, ரமலான் நோன்பு, ஸகாத், இயன்றவர்களுக்கு ஹஜ்.']],
          ['💧', '6', ['Rukun wuduk', 'The six parts of wudu', '小净的六项要素', 'உளூவின் ஆறு கடமைகள்'],
            ['Niat, basuh muka, basuh tangan hingga siku, sapu sebahagian kepala, basuh kaki hingga buku lali dan tertib.', 'Intention, wash the face, wash arms to the elbows, wipe part of the head, wash feet to the ankles, in the right order.', '举意、洗脸、洗手至肘、抹部分头、洗脚至踝，并按顺序进行。', 'நிய்யத், முகம் கழுவுதல், முழங்கை வரை கை கழுவுதல், தலையின் ஒரு பகுதியைத் தடவுதல், கணுக்கால் வரை கால் கழுவுதல், வரிசை முறை.']]
        ],
        q: ['🕋', ['Solat fardu sehari semalam ada berapa waktu?', 'How many daily obligatory prayers?', '每天有几次主命拜？', 'தினசரி கடமையான தொழுகைகள் எத்தனை?'], ['5', '3', '7']] },
      { y: '2', b: ['Adab dan Sirah', 'Manners and Sirah', '礼仪与先知传记', 'ஒழுக்கமும் வரலாறும்'],
        t: ['Adab dan Nabi Muhammad SAW', 'Manners and Prophet Muhammad', '礼仪与穆罕默德先知', 'ஒழுக்கமும் நபி முஹம்மதும்'],
        p: [
          ['🍽️', 'بِسْمِ اللّٰهِ', ['Adab makan', 'Table manners', '用餐礼仪', 'உணவு ஒழுக்கம்'],
            ['Baca Bismillah, makan dengan tangan kanan dan duduk dengan sopan.', 'Say Bismillah, eat with your right hand and sit politely.', '念“奉安拉之名”，用右手吃饭，坐姿端正。', 'பிஸ்மில்லாஹ் சொல், வலக்கையால் சாப்பிடு, ஒழுங்காக அமர்.']],
          ['🌙', 'al-Amin', ['Al-Amin', 'Al-Amin', '可信赖的人', 'அல்-அமீன்'],
            ['Nabi Muhammad SAW lahir di Makkah pada Tahun Gajah. Baginda digelar al-Amin, iaitu orang yang dipercayai.', 'Prophet Muhammad (peace be upon him) was born in Makkah in the Year of the Elephant. He was called al-Amin, the trustworthy one.', '穆罕默德先知在象年生于麦加，被称为“艾敏”，意思是可信赖的人。', 'நபி முஹம்மது (ஸல்) யானை ஆண்டில் மக்காவில் பிறந்தார். அவர் "அல்-அமீன்" (நம்பிக்கைக்குரியவர்) என அழைக்கப்பட்டார்.']]
        ],
        q: ['🌙', ['Gelaran al-Amin bermaksud…', 'The title al-Amin means…', '“艾敏”的意思是…', '"அல்-அமீன்" என்பதன் பொருள்…'], [['yang dipercayai', 'the trustworthy one', '可信赖的人', 'நம்பிக்கைக்குரியவர்'], ['yang paling kuat', 'the strongest', '最强壮的人', 'மிக வலிமையானவர்'], ['yang paling kaya', 'the richest', '最富有的人', 'மிகப் பணக்காரர்']]] }
    ] });

  sub({ id: 'jw', age: [7, 12], c: ['#c9a14a', '#9a7426'], e: '✍️',
    n: ['Jawi', 'Jawi Script', '爪夷文', 'ஜாவி எழுத்து'],
    dskp: 'DSKP KSSR (Semakan 2017) Pendidikan Islam Tahun 1–6, bidang Jawi',
    ch: [
      { y: '1', b: ['Mengenal huruf', 'Letters', '认识字母', 'எழுத்துகள்'],
        t: ['Huruf Jawi', 'Jawi letters', '爪夷字母', 'ஜாவி எழுத்துகள்'],
        p: [
          ['✍️', 'چ ڠ ڤ ݢ ۏ ڽ', ['Enam huruf tambahan', 'Six extra letters', '六个附加字母', 'ஆறு கூடுதல் எழுத்துகள்'],
            ['Jawi ialah tulisan Arab untuk Bahasa Melayu. Ada huruf tambahan: ca, nga, pa, ga, va dan nya.', 'Jawi is Arabic script for the Malay language, with extra letters: ca, nga, pa, ga, va and nya.', '爪夷文是用阿拉伯字母书写马来文，另加 ca、nga、pa、ga、va、nya 六个字母。', 'ஜாவி என்பது மலாய் மொழிக்கான அரபு எழுத்து. கூடுதல் எழுத்துகள்: ca, nga, pa, ga, va, nya.']],
          ['📖', 'بوکو = buku', ['Membaca dari kanan', 'Reading from the right', '从右往左读', 'வலமிருந்து வாசி'],
            ['Tulisan Jawi dibaca dari kanan ke kiri. بوکو dibaca "buku".', 'Jawi is read from right to left. بوکو reads "buku" (book).', '爪夷文从右往左读。بوکو 读作“buku”（书）。', 'ஜாவி வலமிருந்து இடமாக வாசிக்கப்படும். بوکو என்பது "buku" (புத்தகம்).']]
        ],
        q: ['ڤ', ['Huruf ini berbunyi…', 'This letter sounds like…', '这个字母读作…', 'இந்த எழுத்தின் ஒலி…'], ['pa', 'ca', 'nga']] },
      { y: '2', b: ['Membaca perkataan', 'Reading words', '读单词', 'சொற்களை வாசித்தல்'],
        t: ['Perkataan mudah', 'Simple words', '简单的词', 'எளிய சொற்கள்'],
        p: [
          ['🏠', 'رومه = rumah', ['Rumah', 'House', '房子', 'வீடு'],
            ['رومه dibaca "rumah". Huruf ه di hujung memberi bunyi "ah".', 'رومه reads "rumah" (house). The letter ه at the end gives the "ah" sound.', 'رومه 读作“rumah”（房子），词尾的 ه 发“ah”音。', 'رومه என்பது "rumah" (வீடு). இறுதியில் உள்ள ه "ah" ஒலி தரும்.']],
          ['🐱', 'کوچيڠ = kucing', ['Kucing', 'Cat', '猫', 'பூனை'],
            ['Huruf چ (ca) dan ڠ (nga) terdapat dalam perkataan کوچيڠ.', 'The letters چ (ca) and ڠ (nga) are in the word کوچيڠ (kucing, cat).', 'کوچيڠ（kucing，猫）里有 چ（ca）和 ڠ（nga）。', 'کوچيڠ (kucing, பூனை) சொல்லில் چ (ca), ڠ (nga) உள்ளன.']]
        ],
        q: ['رومه', ['Bagaimana dibaca?', 'How is it read?', '怎么读？', 'எப்படி வாசிப்பது?'], ['rumah', 'ramah', 'meja']] },
      { y: '3', b: ['Membaca ayat', 'Reading sentences', '读句子', 'வாக்கியம் வாசித்தல்'],
        t: ['Ayat Jawi', 'Jawi sentences', '爪夷句子', 'ஜாவி வாக்கியங்கள்'],
        p: [
          ['🌸', 'ساي سوک ممباچ', ['Saya suka membaca', 'I like reading', '我喜欢阅读', 'எனக்கு வாசிக்கப் பிடிக்கும்'],
            ['Bacalah dari kanan: "Saya suka membaca."', 'Read from the right: "Saya suka membaca" (I like reading).', '从右往左读：“Saya suka membaca”（我喜欢阅读）。', 'வலமிருந்து வாசி: "Saya suka membaca" (எனக்கு வாசிக்கப் பிடிக்கும்).']],
          ['🕌', 'مسجد = masjid', ['Perkataan pinjaman', 'Borrowed words', '借词', 'கடன் சொற்கள்'],
            ['Perkataan pinjaman Arab dieja seperti asalnya, contohnya مسجد (masjid).', 'Words borrowed from Arabic keep their original spelling, like مسجد (masjid).', '从阿拉伯语借来的词保留原来的拼写，例如 مسجد（masjid，清真寺）。', 'அரபியிலிருந்து வந்த சொற்கள் மூல எழுத்துக்கூட்டலுடன் இருக்கும், எ.கா. مسجد (மஸ்ஜித்).']]
        ],
        q: ['ساي', ['Bagaimana dibaca?', 'How is it read?', '怎么读？', 'எப்படி வாசிப்பது?'], ['saya', 'sayur', 'sapu']] }
    ] });

  sub({ id: 'pm', age: [4, 12], c: ['#ff9ad5', '#d9539f'], e: '💗',
    n: ['Pendidikan Moral', 'Moral Education', '道德教育', 'நன்னெறிக் கல்வி'],
    dskp: 'DSKP KSPK (Tunjang Kerohanian, Sikap dan Nilai) dan DSKP KSSR (Semakan 2017) Pendidikan Moral Tahun 1–6',
    ch: [
      { y: '1', b: ['Nilai: Baik hati', 'Value: Kindness', '价值：仁慈', 'விழுமியம்: இரக்கம்'],
        t: ['Baik hati', 'Being kind', '友善待人', 'அன்பாக இரு'],
        p: [
          ['🤗', '🤝', ['Tolong kawan', 'Help a friend', '帮助朋友', 'நண்பனுக்கு உதவு'],
            ['Tolong kawan yang terjatuh dan kongsi pensel dengan kawan yang terlupa.', 'Help a friend who falls and share your pencil with a friend who forgot theirs.', '帮助跌倒的朋友，把铅笔借给忘记带的同学。', 'விழுந்த நண்பனுக்கு உதவு. பென்சில் மறந்த நண்பனுடன் பகிர்ந்து கொள்.']],
          ['🐶', '🐶 🥣 💧', ['Sayangi haiwan', 'Care for animals', '爱护动物', 'விலங்குகளை நேசி'],
            ['Beri makan dan minum kepada haiwan peliharaan. Jangan sakiti haiwan.', 'Give pets food and water. Never hurt animals.', '给宠物喂食喂水，不伤害动物。', 'செல்லப்பிராணிக்கு உணவும் நீரும் கொடு. விலங்குகளைத் துன்புறுத்தாதே.']]
        ],
        q: ['🤕', ['Kawan terjatuh. Apa kamu buat?', 'A friend falls. What do you do?', '朋友跌倒了，你会怎么做？', 'நண்பன் விழுந்தால் என்ன செய்வாய்?'], [['bantu dia bangun', 'help them up', '扶他起来', 'எழ உதவுவேன்'], ['ketawakan dia', 'laugh at them', '取笑他', 'சிரிப்பேன்'], ['tinggalkan dia', 'walk away', '走开', 'விட்டுப் போவேன்']]] },
      { y: '2', b: ['Nilai: Hormat', 'Value: Respect', '价值：尊重', 'விழுமியம்: மரியாதை'],
        t: ['Hormat-menghormati', 'Respecting others', '互相尊重', 'ஒருவரை ஒருவர் மதித்தல்'],
        p: [
          ['🙇', '🙏', ['Hormat orang tua', 'Respect elders', '尊敬长辈', 'பெரியோரை மதி'],
            ['Bersalam dengan ibu bapa, bercakap dengan sopan dan dengar nasihat mereka.', 'Greet your parents, speak politely and listen to their advice.', '向父母问好，说话有礼貌，听从他们的劝告。', 'பெற்றோரை வணங்கு, பணிவாகப் பேசு, அவர்கள் அறிவுரையைக் கேள்.']],
          ['🤝', '🕌 ⛪ 🛕 🏮', ['Hormat semua kaum', 'Respect everyone', '尊重各族', 'அனைவரையும் மதி'],
            ['Malaysia ada pelbagai kaum dan agama. Kita hormati perayaan dan kepercayaan kawan-kawan.', 'Malaysia has many races and religions. We respect our friends\' festivals and beliefs.', '马来西亚有多元种族和宗教，我们尊重朋友的节日和信仰。', 'மலேசியாவில் பல இனங்களும் மதங்களும் உள்ளன. நண்பர்களின் பண்டிகைகளையும் நம்பிக்கைகளையும் மதிப்போம்.']]
        ],
        q: ['👩‍🏫', ['Bagaimana bercakap dengan guru?', 'How do we speak to teachers?', '怎样和老师说话？', 'ஆசிரியரிடம் எப்படிப் பேசுவோம்?'], [['dengan sopan', 'politely', '有礼貌地', 'பணிவாக'], ['dengan menjerit', 'by shouting', '大声喊叫', 'கத்திக்கொண்டு'], ['tidak menjawab', 'by ignoring them', '不理睬', 'பதில் சொல்லாமல்']]] },
      { y: '3', b: ['Nilai: Bertanggungjawab', 'Value: Responsibility', '价值：负责任', 'விழுமியம்: பொறுப்பு'],
        t: ['Bertanggungjawab', 'Being responsible', '做个负责任的人', 'பொறுப்புடன் இரு'],
        p: [
          ['🧹', '🧸 → 📦', ['Kemas sendiri', 'Tidy up', '自己收拾', 'நீயே ஒழுங்குபடுத்து'],
            ['Kemas mainan selepas bermain dan siapkan kerja rumah tepat pada masanya.', 'Put toys away after playing and finish your homework on time.', '玩完后把玩具收好，按时完成功课。', 'விளையாடிய பின் பொம்மைகளை அடுக்கு. வீட்டுப்பாடத்தை நேரத்தில் முடி.']],
          ['♻️', '📄 🥤 🥫', ['Jaga alam sekitar', 'Care for the environment', '爱护环境', 'சுற்றுச்சூழலைக் காப்போம்'],
            ['Buang sampah ke dalam tong dan asingkan kertas, plastik dan tin untuk dikitar semula.', 'Put rubbish in the bin and separate paper, plastic and cans for recycling.', '把垃圾丢进垃圾桶，并把纸、塑料和铁罐分开回收。', 'குப்பையைத் தொட்டியில் போடு. காகிதம், பிளாஸ்டிக், தகரத்தை மறுசுழற்சிக்குப் பிரி.']]
        ],
        q: ['🧸', ['Selepas bermain, kita…', 'After playing, we…', '玩完以后，我们…', 'விளையாடிய பின் நாம்…'], [['kemas mainan', 'tidy the toys', '收拾玩具', 'பொம்மைகளை அடுக்குவோம்'], ['biarkan bersepah', 'leave a mess', '随便乱放', 'சிதறவிடுவோம்'], ['sorok mainan', 'hide the toys', '把玩具藏起来', 'ஒளித்து வைப்போம்']]] }
    ] });

  sub({ id: 'sj', age: [10, 12], c: ['#d4a373', '#a86f3c'], e: '🏛️',
    n: ['Sejarah', 'History', '历史', 'வரலாறு'],
    dskp: 'DSKP KSSR (Semakan 2017) Sejarah Tahun 4–6',
    ch: [
      { y: '4', b: ['Kesultanan Melayu Melaka', 'The Melaka Sultanate', '马六甲王朝', 'மலாக்கா சுல்தானகம்'],
        t: ['Pembukaan Melaka', 'The founding of Melaka', '马六甲的建立', 'மலாக்கா உருவானது'],
        p: [
          ['⛵', '± 1400', ['Pelabuhan terkenal', 'A famous port', '著名港口', 'புகழ்பெற்ற துறைமுகம்'],
            ['Parameswara membuka Melaka sekitar tahun 1400. Melaka menjadi pelabuhan perdagangan yang terkenal.', 'Parameswara founded Melaka around the year 1400. It became a famous trading port.', '拜里米苏拉在1400年左右建立马六甲，马六甲后来成为著名的贸易港口。', 'பரமேஸ்வரா சுமார் 1400-இல் மலாக்காவைத் தோற்றுவித்தார். அது புகழ்பெற்ற வணிகத் துறைமுகமானது.']],
          ['🌳', '🌳 🦌 🐕', ['Asal nama Melaka', 'How Melaka got its name', '马六甲名字的由来', 'மலாக்கா பெயர் வந்த கதை'],
            ['Menurut Sejarah Melayu, nama Melaka diambil daripada pokok Melaka tempat Parameswara berteduh.', 'According to the Malay Annals, Melaka was named after the Melaka tree where Parameswara rested.', '根据《马来纪年》，马六甲的名字来自拜里米苏拉休息时所靠的马六甲树。', 'மலாய் வரலாற்றுக் குறிப்புகளின்படி, பரமேஸ்வரா ஓய்வெடுத்த மலாக்கா மரத்தின் பெயரே நகரின் பெயரானது.']]
        ],
        q: ['⛵', ['Siapa membuka Melaka?', 'Who founded Melaka?', '谁建立了马六甲？', 'மலாக்காவைத் தோற்றுவித்தவர் யார்?'], ['Parameswara', 'Hang Tuah', 'Tun Perak']] },
      { y: '5', b: ['Lambang negara', 'National symbols', '国家象征', 'தேசியச் சின்னங்கள்'],
        t: ['Jalur Gemilang dan Rukun Negara', 'The flag and Rukun Negara', '国旗与国家原则', 'கொடியும் ருக்குன் நெகாராவும்'],
        p: [
          ['🇲🇾', '14 ★ ☾', ['Jalur Gemilang', 'Jalur Gemilang', '辉煌条纹', 'ஜாலுர் கெமிலாங்'],
            ['Jalur Gemilang ada 14 jalur merah dan putih, bulan sabit dan bintang berbucu 14.', 'The Jalur Gemilang has 14 red and white stripes, a crescent and a 14-pointed star.', '国旗有14条红白相间的条纹、一弯新月和一颗十四角星。', 'ஜாலுர் கெமிலாங்கில் 14 சிவப்பு வெள்ளைக் கோடுகள், பிறைச் சந்திரன், 14 முனை நட்சத்திரம் உள்ளன.']],
          ['📜', '31.8.1970', ['Rukun Negara', 'Rukun Negara', '国家原则', 'ருக்குன் நெகாரா'],
            ['Rukun Negara diisytiharkan pada 31 Ogos 1970 dan ada lima prinsip. Prinsip pertama: Kepercayaan kepada Tuhan.', 'The Rukun Negara was proclaimed on 31 August 1970 and has five principles. The first: Belief in God.', '国家原则于1970年8月31日颁布，共有五条。第一条：信奉上苍。', 'ருக்குன் நெகாரா 1970 ஆகஸ்ட் 31 அன்று அறிவிக்கப்பட்டது. ஐந்து கோட்பாடுகள் உள்ளன. முதலாவது: இறைவன் மீது நம்பிக்கை.']]
        ],
        q: ['🇲🇾', ['Berapa jalur pada Jalur Gemilang?', 'How many stripes on the flag?', '国旗上有几条条纹？', 'கொடியில் எத்தனை கோடுகள்?'], ['14', '13', '15']] },
      { y: '6', b: ['Kemerdekaan', 'Independence', '独立', 'சுதந்திரம்'],
        t: ['Merdeka dan Malaysia', 'Merdeka and Malaysia', '独立与马来西亚', 'சுதந்திரமும் மலேசியாவும்'],
        p: [
          ['✊', '31.8.1957', ['Merdeka!', 'Merdeka!', '默迪卡！', 'மெர்டேக்கா!'],
            ['Tunku Abdul Rahman mengisytiharkan kemerdekaan Persekutuan Tanah Melayu di Stadium Merdeka pada 31 Ogos 1957.', 'Tunku Abdul Rahman proclaimed the independence of the Federation of Malaya at Stadium Merdeka on 31 August 1957.', '1957年8月31日，东姑阿都拉曼在独立体育场宣布马来亚联合邦独立。', '1957 ஆகஸ்ட் 31 அன்று துங்கு அப்துல் ரஹ்மான் மெர்டேக்கா அரங்கில் மலாயா கூட்டமைப்பின் சுதந்திரத்தை அறிவித்தார்.']],
          ['🤝', '16.9.1963', ['Pembentukan Malaysia', 'Malaysia is formed', '马来西亚成立', 'மலேசியா உருவானது'],
            ['Malaysia dibentuk pada 16 September 1963 oleh Persekutuan Tanah Melayu, Sabah, Sarawak dan Singapura.', 'Malaysia was formed on 16 September 1963 by Malaya, Sabah, Sarawak and Singapore.', '1963年9月16日，马来亚、沙巴、砂拉越和新加坡组成马来西亚。', '1963 செப்டம்பர் 16 அன்று மலாயா, சபா, சரவாக், சிங்கப்பூர் இணைந்து மலேசியா உருவானது.']]
        ],
        q: ['✊', ['Siapakah Bapa Kemerdekaan?', 'Who is the Father of Independence?', '谁是独立之父？', 'சுதந்திரத்தின் தந்தை யார்?'], ['Tunku Abdul Rahman', 'Tun Abdul Razak', 'Tun Hussein Onn']] }
    ] });

  sub({ id: 'rbt', age: [10, 12], c: ['#7a8cff', '#4253d6'], e: '🛠️',
    n: ['Reka Bentuk dan Teknologi', 'Design and Technology', '设计与工艺', 'வடிவமைப்பும் தொழில்நுட்பமும்'],
    dskp: 'DSKP KSSR (Semakan 2017) Reka Bentuk dan Teknologi Tahun 4–6',
    ch: [
      { y: '4', b: ['Reka bentuk', 'Design', '设计', 'வடிவமைப்பு'],
        t: ['Proses reka bentuk', 'The design process', '设计过程', 'வடிவமைப்புச் செயல்முறை'],
        p: [
          ['💡', '🔍 → ✏️ → 🔨 → ✅', ['Empat langkah', 'Four steps', '四个步骤', 'நான்கு படிகள்'],
            ['Kenal pasti masalah, lakar idea, bina model dan uji hasilnya.', 'Find the problem, sketch ideas, build a model and test it.', '找出问题、画出构想、制作模型、测试效果。', 'சிக்கலைக் கண்டறி, யோசனையை வரை, மாதிரியைச் செய், சோதித்துப் பார்.']],
          ['📐', '✏️ 📏', ['Lakaran', 'Sketching', '草图', 'வரைவு'],
            ['Lakar idea dahulu sebelum membina. Labelkan ukuran dan bahan.', 'Sketch your idea before building. Label the sizes and materials.', '动手前先画草图，标明尺寸和材料。', 'செய்வதற்கு முன் வரைந்து பார். அளவுகளையும் பொருட்களையும் குறி.']]
        ],
        q: ['💡', ['Langkah pertama reka bentuk?', 'The first design step?', '设计的第一步是？', 'வடிவமைப்பின் முதல் படி?'], [['kenal pasti masalah', 'find the problem', '找出问题', 'சிக்கலைக் கண்டறிதல்'], ['uji model', 'test the model', '测试模型', 'மாதிரியைச் சோதித்தல்'], ['cat model', 'paint the model', '给模型上色', 'வண்ணம் பூசுதல்']]] },
      { y: '5', b: ['Pemikiran komputasional', 'Computational thinking', '计算思维', 'கணினிச் சிந்தனை'],
        t: ['Algoritma', 'Algorithms', '算法', 'படிமுறைகள்'],
        p: [
          ['🤖', '1 → 2 → 3', ['Langkah tersusun', 'Ordered steps', '有序的步骤', 'வரிசைப் படிகள்'],
            ['Algoritma ialah langkah tersusun untuk menyelesaikan masalah, seperti resipi roti bakar.', 'An algorithm is a set of ordered steps to solve a problem, like a recipe for toast.', '算法是解决问题的有序步骤，就像做烤面包的食谱。', 'படிமுறை என்பது சிக்கலைத் தீர்க்கும் வரிசைப் படிகள், டோஸ்ட் செய்முறை போல.']],
          ['🔁', '↑ ↻ ↑ ↻ ↑ ↻ ↑ ↻', ['Ulangan', 'Loops', '循环', 'மீள்செயல்'],
            ['Untuk melukis segi empat sama, ulang 4 kali: bergerak ke depan, kemudian pusing 90 darjah.', 'To draw a square, repeat 4 times: move forward, then turn 90 degrees.', '要画正方形，重复4次：向前走，再转90度。', 'சதுரம் வரைய 4 முறை செய்: முன்னே நகர், பிறகு 90 பாகை திரும்பு.']]
        ],
        q: ['🤖', ['Algoritma ialah…', 'An algorithm is…', '算法是…', 'படிமுறை என்பது…'], [['langkah tersusun', 'ordered steps', '有序的步骤', 'வரிசைப் படிகள்'], ['sejenis robot', 'a kind of robot', '一种机器人', 'ஒரு ரோபோ'], ['nama komputer', 'a computer brand', '电脑的名字', 'கணினியின் பெயர்']]] },
      { y: '6', b: ['Amalan selamat', 'Safe practice', '安全守则', 'பாதுகாப்பு நடைமுறை'],
        t: ['Selamat di bengkel', 'Safe in the workshop', '工作坊安全', 'பணிமனைப் பாதுகாப்பு'],
        p: [
          ['🦺', '🥽 🧤', ['Peraturan bengkel', 'Workshop rules', '工作坊规则', 'பணிமனை விதிகள்'],
            ['Pakai apron, gunakan alat dengan betul dan simpan alat tajam selepas digunakan.', 'Wear an apron, use tools correctly and put sharp tools away after use.', '穿上围裙，正确使用工具，用完后收好利器。', 'மேலங்கி அணி, கருவிகளைச் சரியாகப் பயன்படுத்து, கூர்மையானவற்றைப் பயன்படுத்திய பின் வை.']],
          ['🌱', '🌱 💧 ☀️', ['Menanam sayur', 'Growing vegetables', '种菜', 'காய்கறி வளர்த்தல்'],
            ['Sediakan tanah, semai benih, siram setiap hari dan beri baja.', 'Prepare the soil, sow the seeds, water every day and add fertiliser.', '准备泥土、播种、每天浇水并施肥。', 'மண்ணைத் தயார் செய், விதை விதை, தினமும் நீர் ஊற்று, உரம் இடு.']]
        ],
        q: ['✂️', ['Selepas guna gunting, kita…', 'After using scissors, we…', '用完剪刀后，我们…', 'கத்தரிக்கோல் பயன்படுத்திய பின்…'], [['simpan semula', 'put them away', '收好', 'எடுத்து வைப்போம்'], ['tinggal di lantai', 'leave them on the floor', '丢在地上', 'தரையில் விடுவோம்'], ['baling kepada kawan', 'throw them to a friend', '扔给朋友', 'நண்பனிடம் எறிவோம்']]] }
    ] });

  sub({ id: 'pj', age: [7, 12], c: ['#ffb36b', '#ef7d22'], e: '⚽',
    n: ['Pendidikan Jasmani', 'Physical Education', '体育', 'உடற்கல்வி'],
    dskp: 'DSKP KSSR (Semakan 2017) Pendidikan Jasmani Tahun 1–6',
    ch: [
      { y: '1', b: ['Kecergasan', 'Fitness', '体能', 'உடல் தகுதி'],
        t: ['Memanaskan badan', 'Warming up', '热身', 'உடலைச் சூடாக்குதல்'],
        p: [
          ['🤸', '5 min', ['Sebelum bersukan', 'Before sports', '运动前', 'விளையாட்டுக்கு முன்'],
            ['Lakukan regangan dan berlari anak selama 5 minit supaya otot tidak cedera.', 'Stretch and jog for 5 minutes so your muscles do not get hurt.', '先拉伸、慢跑5分钟，避免肌肉受伤。', 'தசைகள் காயமடையாமல் இருக்க 5 நிமிடம் நீட்டிப் பயிற்சி செய்து மெல்ல ஓடு.']],
          ['💧', '💧 → 🏃 → 💧', ['Minum air', 'Drink water', '喝水', 'நீர் அருந்து'],
            ['Minum air sebelum, semasa dan selepas bersukan.', 'Drink water before, during and after sports.', '运动前、运动中和运动后都要喝水。', 'விளையாட்டுக்கு முன்னும், இடையிலும், பின்னும் நீர் அருந்து.']]
        ],
        q: ['🤸', ['Bila kita memanaskan badan?', 'When do we warm up?', '什么时候热身？', 'எப்போது உடலைச் சூடாக்குவோம்?'], [['sebelum bersukan', 'before sports', '运动前', 'விளையாட்டுக்கு முன்'], ['selepas tidur', 'after sleeping', '睡醒后', 'தூங்கிய பின்'], ['semasa makan', 'while eating', '吃饭时', 'சாப்பிடும்போது']]] },
      { y: '2', b: ['Kemahiran', 'Skills', '技能', 'திறன்கள்'],
        t: ['Bola sepak dan bola keranjang', 'Football and basketball', '足球和篮球', 'கால்பந்தும் கூடைப்பந்தும்'],
        p: [
          ['⚽', '🦶 ⚽', ['Menendang', 'Kicking', '踢球', 'உதைத்தல்'],
            ['Letak kaki sokongan di sebelah bola, mata pada bola dan tendang dengan bahagian dalam kaki.', 'Put your standing foot beside the ball, keep your eyes on it and kick with the inside of your foot.', '支撑脚放在球旁边，眼睛看着球，用脚内侧踢。', 'தாங்கும் காலைப் பந்தின் அருகில் வை, பந்தைப் பார், காலின் உட்பக்கத்தால் உதை.']],
          ['🏀', '🖐️ 🏀', ['Melantun bola', 'Dribbling', '运球', 'பந்தைத் தட்டுதல்'],
            ['Lantun bola dengan hujung jari, bukan tapak tangan. Mata pandang ke depan.', 'Bounce the ball with your fingertips, not your palm. Look ahead.', '用指尖拍球，不要用手掌，眼睛看前方。', 'உள்ளங்கையால் அல்ல, விரல் நுனியால் பந்தைத் தட்டு. முன்னே பார்.']]
        ],
        q: ['🏀', ['Melantun bola menggunakan…', 'We dribble with our…', '运球时用…', 'பந்தைத் தட்டுவது…'], [['hujung jari', 'fingertips', '指尖', 'விரல் நுனி'], ['siku', 'elbow', '手肘', 'முழங்கை'], ['kepala', 'head', '头', 'தலை']]] },
      { y: '3', b: ['Gaya hidup aktif', 'Active lifestyle', '积极的生活', 'சுறுசுறுப்பான வாழ்க்கை'],
        t: ['Aktif setiap hari', 'Active every day', '每天都活动', 'தினமும் சுறுசுறுப்பு'],
        p: [
          ['🏃', '60 min', ['60 minit sehari', '60 minutes a day', '每天60分钟', 'தினமும் 60 நிமிடம்'],
            ['Kanak-kanak perlu aktif sekurang-kurangnya 60 minit setiap hari: berlari, berbasikal atau bermain.', 'Children need at least 60 minutes of activity every day: running, cycling or playing.', '儿童每天至少要活动60分钟：跑步、骑自行车或玩耍。', 'குழந்தைகள் தினமும் குறைந்தது 60 நிமிடம் ஓட, மிதிவண்டி ஓட்ட, விளையாட வேண்டும்.']],
          ['❤️', '💓💓💓', ['Rasa nadi', 'Feel your pulse', '感受脉搏', 'நாடித்துடிப்பை உணர்'],
            ['Selepas berlari, jantung berdegup lebih laju. Rasakan nadi di pergelangan tangan.', 'After running, your heart beats faster. Feel your pulse on your wrist.', '跑步后心跳会变快，在手腕上感受一下脉搏。', 'ஓடிய பின் இதயம் வேகமாகத் துடிக்கும். மணிக்கட்டில் நாடியை உணர்.']]
        ],
        q: ['🏃', ['Berapa minit aktif sehari?', 'How many active minutes a day?', '每天要活动几分钟？', 'தினமும் எத்தனை நிமிடம் சுறுசுறுப்பாக?'], ['60', '5', '10']] }
    ] });

  sub({ id: 'pk', age: [7, 12], c: ['#6fdcff', '#1aa6d6'], e: '🍎',
    n: ['Pendidikan Kesihatan', 'Health Education', '健康教育', 'சுகாதாரக் கல்வி'],
    dskp: 'DSKP KSSR (Semakan 2017) Pendidikan Kesihatan Tahun 1–6',
    ch: [
      { y: '1', b: ['Pemakanan', 'Nutrition', '营养', 'ஊட்டச்சத்து'],
        t: ['Pinggan sihat', 'The healthy plate', '健康餐盘', 'ஆரோக்கியத் தட்டு'],
        p: [
          ['🥗', '½ 🥦🍎 · ¼ 🍚 · ¼ 🐟', ['Suku Suku Separuh', 'Quarter, quarter, half', '四分之一、四分之一、一半', 'கால், கால், அரை'],
            ['Separuh pinggan sayur dan buah, suku nasi dan suku ikan, ayam atau kekacang.', 'Half the plate vegetables and fruit, a quarter rice and a quarter fish, chicken or beans.', '半盘蔬菜水果，四分之一米饭，四分之一鱼、鸡肉或豆类。', 'தட்டில் பாதி காய்கறி பழம், கால் சோறு, கால் மீன், கோழி அல்லது பருப்பு.']],
          ['🥤', '💧 ✓', ['Kurangkan gula', 'Less sugar', '少吃糖', 'சர்க்கரையைக் குறை'],
            ['Pilih air kosong. Minuman manis boleh merosakkan gigi.', 'Choose plain water. Sweet drinks can damage your teeth.', '多喝白开水，甜饮料会伤害牙齿。', 'வெறும் நீரைத் தேர்ந்தெடு. இனிப்புப் பானங்கள் பற்களைக் கெடுக்கும்.']]
        ],
        q: ['🍽️', ['Separuh pinggan sihat ialah…', 'Half a healthy plate is…', '健康餐盘的一半是…', 'ஆரோக்கியத் தட்டில் பாதி…'], [['sayur dan buah', 'vegetables and fruit', '蔬菜和水果', 'காய்கறியும் பழமும்'], ['nasi', 'rice', '米饭', 'சோறு'], ['kek', 'cake', '蛋糕', 'கேக்']]] },
      { y: '2', b: ['Kesihatan diri', 'Personal health', '个人健康', 'தனிநபர் சுகாதாரம்'],
        t: ['Tidur dan bersin', 'Sleep and sneezing', '睡眠与打喷嚏', 'தூக்கமும் தும்மலும்'],
        p: [
          ['😴', '9–12 h', ['Tidur cukup', 'Enough sleep', '睡眠充足', 'போதுமான தூக்கம்'],
            ['Kanak-kanak 6 hingga 12 tahun perlu tidur 9 hingga 12 jam setiap malam.', 'Children aged 6 to 12 need 9 to 12 hours of sleep every night.', '6到12岁的儿童每晚需要睡9到12小时。', '6 முதல் 12 வயதுக் குழந்தைகளுக்கு இரவில் 9 முதல் 12 மணி நேரத் தூக்கம் தேவை.']],
          ['🤧', '💪 🤧', ['Tutup mulut', 'Cover your mouth', '捂住嘴巴', 'வாயை மூடு'],
            ['Bila bersin atau batuk, tutup mulut dengan siku atau tisu.', 'When you sneeze or cough, cover your mouth with your elbow or a tissue.', '打喷嚏或咳嗽时，用手肘或纸巾捂住嘴巴。', 'தும்மும்போது அல்லது இருமும்போது முழங்கையால் அல்லது திசுவால் வாயை மூடு.']]
        ],
        q: ['🤧', ['Bila bersin, tutup mulut dengan…', 'When sneezing, cover with…', '打喷嚏时用什么捂嘴？', 'தும்மும்போது எதனால் மூடுவோம்?'], [['siku atau tisu', 'elbow or tissue', '手肘或纸巾', 'முழங்கை அல்லது திசு'], ['tiada apa-apa', 'nothing', '什么都不用', 'எதுவும் இல்லை'], ['buku kawan', "a friend's book", '朋友的书', 'நண்பனின் புத்தகம்']]] },
      { y: '3', b: ['Keselamatan diri', 'Personal safety', '人身安全', 'சுய பாதுகாப்பு'],
        t: ['Badan saya, hak saya', 'My body, my rights', '我的身体我做主', 'என் உடல், என் உரிமை'],
        p: [
          ['🛡️', '🙅', ['Bahagian peribadi', 'Private parts', '隐私部位', 'அந்தரங்க உறுப்புகள்'],
            ['Bahagian yang ditutup oleh pakaian dalam ialah bahagian peribadi. Tiada siapa boleh menyentuhnya.', 'The parts covered by underwear are private. Nobody is allowed to touch them.', '内衣遮住的部位是隐私部位，任何人都不可以碰。', 'உள்ளாடையால் மூடப்படும் பகுதிகள் அந்தரங்கமானவை. யாரும் அவற்றைத் தொடக்கூடாது.']],
          ['🗣️', '15999', ['Beritahu orang dipercayai', 'Tell someone you trust', '告诉信任的人', 'நம்பிக்கையானவரிடம் சொல்'],
            ['Jika berasa tidak selamat, beritahu ibu bapa atau guru, atau hubungi Talian Kasih 15999.', 'If you feel unsafe, tell your parents or teacher, or call Talian Kasih 15999.', '如果感到不安全，告诉父母或老师，或拨打关爱热线 Talian Kasih 15999。', 'பாதுகாப்பில்லை எனத் தோன்றினால் பெற்றோரிடம், ஆசிரியரிடம் சொல் அல்லது Talian Kasih 15999 அழை.']]
        ],
        q: ['☎️', ['Nombor Talian Kasih?', 'Talian Kasih number?', '关爱热线号码是？', 'Talian Kasih எண்?'], ['15999', '999', '100']] }
    ] });

  sub({ id: 'psv', age: [7, 12], c: ['#c58cff', '#8f4fe0'], e: '🎨',
    n: ['Pendidikan Seni Visual', 'Visual Arts Education', '视觉艺术', 'காட்சிக் கலைக் கல்வி'],
    dskp: 'DSKP KSSR (Semakan 2017) Pendidikan Seni Visual Tahun 1–6',
    ch: [
      { y: '1', b: ['Menggambar', 'Drawing', '绘画', 'வரைதல்'],
        t: ['Campur warna', 'Mixing colours', '调色', 'வண்ணக் கலவை'],
        p: [
          ['🎨', '🔴 + 🟡 = 🟠', ['Warna primer', 'Primary colours', '三原色', 'முதன்மை வண்ணங்கள்'],
            ['Merah, kuning dan biru ialah warna primer. Campurkan merah dan kuning untuk mendapat oren.', 'Red, yellow and blue are primary colours. Mix red and yellow to get orange.', '红、黄、蓝是三原色。红色加黄色变成橙色。', 'சிவப்பு, மஞ்சள், நீலம் முதன்மை வண்ணங்கள். சிவப்பும் மஞ்சளும் கலந்தால் ஆரஞ்சு.']],
          ['🟢', '🟡 + 🔵 = 🟢', ['Warna sekunder', 'Secondary colours', '间色', 'இரண்டாம் நிலை வண்ணங்கள்'],
            ['Kuning campur biru menjadi hijau. Merah campur biru menjadi ungu.', 'Yellow and blue make green. Red and blue make purple.', '黄色加蓝色变成绿色，红色加蓝色变成紫色。', 'மஞ்சளும் நீலமும் பச்சை. சிவப்பும் நீலமும் ஊதா.']]
        ],
        q: ['🔴 + 🔵 = ?', ['Warna apakah terhasil?', 'Which colour do we get?', '会变成什么颜色？', 'என்ன வண்ணம் வரும்?'], ['🟣', '🟢', '🟠']] },
      { y: '2', b: ['Membuat corak dan rekaan', 'Patterns and design', '图案与设计', 'அமைப்பும் வடிவமைப்பும்'],
        t: ['Corak berulang', 'Repeating patterns', '重复图案', 'திரும்ப வரும் அமைப்புகள்'],
        p: [
          ['🔷', '🔷🌸🔷🌸🔷🌸', ['Motif', 'Motifs', '图案单位', 'உருவக் கூறு'],
            ['Corak dibuat dengan mengulang motif, seperti bunga atau bentuk geometri.', 'A pattern is made by repeating a motif, like a flower or a shape.', '把花朵或几何形状不断重复，就成了图案。', 'பூ அல்லது வடிவம் போன்ற கூறைத் திரும்பத் திரும்ப இட்டால் அமைப்பு உருவாகும்.']],
          ['🖐️', '🍃 → 📄', ['Teknik cetakan', 'Printing', '拓印', 'அச்சிடுதல்'],
            ['Celup jari atau daun dalam cat, kemudian tekap pada kertas untuk membuat corak.', 'Dip a finger or a leaf in paint, then press it on paper to make a pattern.', '把手指或树叶沾上颜料，再按在纸上，就能做出图案。', 'விரலையோ இலையையோ வண்ணத்தில் தோய்த்து காகிதத்தில் அழுத்தி அமைப்பை உருவாக்கு.']]
        ],
        q: ['🔷🌸🔷🌸', ['Corak dibuat dengan…', 'A pattern is made by…', '图案是怎样做成的？', 'அமைப்பு எப்படி உருவாகிறது?'], [['mengulang motif', 'repeating a motif', '重复图案单位', 'கூறைத் திரும்ப இடுதல்'], ['memadam lukisan', 'erasing a drawing', '擦掉画', 'படத்தை அழித்தல்'], ['mengoyak kertas', 'tearing paper', '撕纸', 'காகிதத்தைக் கிழித்தல்']]] },
      { y: '4', b: ['Mengenal kraf tradisional', 'Traditional crafts', '传统工艺', 'பாரம்பரியக் கைவினை'],
        t: ['Wau dan batik', 'Wau and batik', '风筝与蜡染', 'வாவும் பாத்திக்கும்'],
        p: [
          ['🪁', 'Wau Bulan', ['Wau Bulan', 'Wau Bulan', '月亮风筝', 'வாவ் புலான்'],
            ['Wau Bulan dari Kelantan ialah layang-layang tradisional yang bahagian bawahnya berbentuk bulan sabit.', 'The Wau Bulan from Kelantan is a traditional kite whose lower part is shaped like a crescent moon.', '吉兰丹的月亮风筝是传统风筝，下半部像一弯新月。', 'கிளந்தானின் வாவ் புலான் ஒரு பாரம்பரியப் பட்டம். அதன் கீழ்ப்பகுதி பிறைச் சந்திரன் வடிவம்.']],
          ['🖌️', 'canting', ['Batik', 'Batik', '蜡染', 'பாத்திக்'],
            ['Batik dibuat dengan melakar lilin pada kain menggunakan canting, kemudian kain diwarnakan.', 'Batik is made by drawing wax on cloth with a canting tool, then colouring the cloth.', '蜡染是用蜡笔工具“canting”在布上画蜡，再给布上色。', 'கேன்டிங் கருவியால் துணியில் மெழுகு வரைந்து, பிறகு வண்ணம் தீட்டி பாத்திக் செய்யப்படுகிறது.']]
        ],
        q: ['🖌️', ['Alat untuk melakar lilin batik?', 'Which tool draws batik wax?', '画蜡染的工具是？', 'பாத்திக் மெழுகு வரையும் கருவி?'], ['canting', 'pemadam', 'pembaris']] }
    ] });

  sub({ id: 'pmz', age: [7, 12], c: ['#ff8fb1', '#e2457a'], e: '🎵',
    n: ['Pendidikan Muzik', 'Music Education', '音乐', 'இசைக் கல்வி'],
    dskp: 'DSKP KSSR (Semakan 2017) Pendidikan Muzik Tahun 1–6',
    ch: [
      { y: '1', b: ['Elemen muzik', 'Music elements', '音乐元素', 'இசைக் கூறுகள்'],
        t: ['Rentak dan dinamik', 'Rhythm and dynamics', '节奏与力度', 'தாளமும் ஒலியளவும்'],
        p: [
          ['🥁', 'ta · ta · ti-ti · ta', ['Tepuk ikut rentak', 'Clap the rhythm', '跟着节奏拍手', 'தாளத்துக்குக் கைதட்டு'],
            ['"ta" ialah satu tepukan. "ti-ti" ialah dua tepukan laju dalam masa yang sama.', '"ta" is one clap. "ti-ti" is two quick claps in the same time.', '“ta”拍一下，“ti-ti”在同样的时间里快拍两下。', '"ta" ஒரு கைதட்டு. "ti-ti" அதே நேரத்தில் இரண்டு வேகக் கைதட்டுகள்.']],
          ['🔊', 'f  ·  p', ['Kuat dan perlahan', 'Loud and soft', '强和弱', 'உரக்கவும் மெதுவாகவும்'],
            ['Muzik boleh dimainkan kuat (forte, f) atau perlahan (piano, p).', 'Music can be played loudly (forte, f) or softly (piano, p).', '音乐可以弹得强（forte，f）或弱（piano，p）。', 'இசையை உரக்க (forte, f) அல்லது மெதுவாக (piano, p) இசைக்கலாம்.']]
        ],
        q: ['p', ['"Piano" dalam muzik bermaksud…', 'In music, "piano" means…', '音乐里“piano”的意思是…', 'இசையில் "piano" என்றால்…'], [['perlahan', 'soft', '弱', 'மெதுவாக'], ['kuat', 'loud', '强', 'உரக்க'], ['laju', 'fast', '快', 'வேகமாக']]] },
      { y: '2', b: ['Membaca not', 'Reading notes', '识谱', 'இசைக்குறி வாசிப்பு'],
        t: ['Solfa dan nilai not', 'Solfa and note values', '唱名与音符时值', 'சொல்ஃபாவும் குறி மதிப்பும்'],
        p: [
          ['🎵', 'do re mi fa so la ti do', ['Tangga solfa', 'The solfa scale', '唱名音阶', 'சொல்ஃபா அளவுகோல்'],
            ['Nyanyikan dari bawah ke atas: do, re, mi, fa, so, la, ti, do.', 'Sing from low to high: do, re, mi, fa, so, la, ti, do.', '从低唱到高：do、re、mi、fa、so、la、ti、do。', 'கீழிருந்து மேலாகப் பாடு: do, re, mi, fa, so, la, ti, do.']],
          ['🎼', '♩ = 1 · ♪ = ½', ['Nilai not', 'Note values', '音符时值', 'குறி மதிப்பு'],
            ['Not krocet (♩) bernilai satu ketukan. Not kuaver (♪) bernilai separuh ketukan.', 'A crotchet (♩) lasts one beat. A quaver (♪) lasts half a beat.', '四分音符（♩）是一拍，八分音符（♪）是半拍。', 'குரோச்செட் (♩) ஒரு துடிப்பு. குவேவர் (♪) அரைத் துடிப்பு.']]
        ],
        q: ['♩', ['Berapa ketukan not ini?', 'How many beats is this note?', '这个音符是几拍？', 'இந்தக் குறிக்கு எத்தனை துடிப்பு?'], ['1', '2', '½']] },
      { y: '3', b: ['Apresiasi muzik', 'Music appreciation', '音乐欣赏', 'இசை ரசனை'],
        t: ['Muzik Malaysia', 'Music of Malaysia', '马来西亚音乐', 'மலேசிய இசை'],
        p: [
          ['🇲🇾', 'Negaraku', ['Lagu kebangsaan', 'National anthem', '国歌', 'தேசிய கீதம்'],
            ['Berdiri tegak dan diam apabila lagu Negaraku dimainkan.', 'Stand straight and stay quiet when Negaraku is played.', '奏国歌《我的国家》时要立正，保持安静。', 'நெகாராகு இசைக்கப்படும்போது நேராக நின்று அமைதியாக இரு.']],
          ['🪘', 'kompang · gamelan · sape', ['Alat muzik tradisional', 'Traditional instruments', '传统乐器', 'பாரம்பரிய இசைக்கருவிகள்'],
            ['Kompang dimainkan dalam majlis perkahwinan. Gamelan dan sape dari Sarawak juga alat muzik Malaysia.', 'The kompang is played at weddings. The gamelan and the sape from Sarawak are Malaysian instruments too.', '婚礼上会打手鼓（kompang）。甘美兰和砂拉越的沙贝琴也是马来西亚乐器。', 'திருமணங்களில் கொம்பாங் இசைக்கப்படும். கமெலானும் சரவாக்கின் சாபேயும் மலேசிய இசைக்கருவிகள்.']]
        ],
        q: ['🎶', ['Apakah lagu kebangsaan Malaysia?', "What is Malaysia's national anthem?", '马来西亚的国歌是？', 'மலேசியாவின் தேசிய கீதம்?'], ['Negaraku', 'Jalur Gemilang', 'Tanggal 31']] }
    ] });

  return { subjects: S };
})();
