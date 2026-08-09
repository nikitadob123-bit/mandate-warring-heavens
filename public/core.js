(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MandateCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SAVE_VERSION = 2;

  const STAT_LABELS = {
    attack: "Атака",
    defense: "Защита",
    maxHp: "Здоровье",
    precision: "Точность",
    initiative: "Инициатива",
    tactics: "Тактика",
    charisma: "Харизма",
    scout: "Разведка",
    duelGuard: "Стойка",
    morale: "Боевой дух"
  };

  const RARITIES = {
    common: { name: "Обычный", order: 1 },
    uncommon: { name: "Необычный", order: 2 },
    rare: { name: "Редкий", order: 3 },
    epic: { name: "Эпический", order: 4 },
    legendary: { name: "Легендарный", order: 5 },
    heavenly: { name: "Небесный", order: 6 }
  };

  const KINGDOMS = [
    { id: "jin", name: "Цзинь", region: "Запад", army: "Железные копья", color: "#9e3430", desc: "Строгое царство реформаторов и тяжёлой пехоты." },
    { id: "liang", name: "Лян", region: "Центр", army: "Золотая стража", color: "#b79248", desc: "Богатые равнины, торговые города и сильная бюрократия." },
    { id: "yanluo", name: "Яньло", region: "Север", army: "Северные всадники", color: "#557486", desc: "Степи, крепкие кони и генералы пограничной войны." },
    { id: "chuan", name: "Чуань", region: "Юг", army: "Багровые легионы", color: "#7d2430", desc: "Самое населённое царство, способное выставлять огромные армии." },
    { id: "hai", name: "Хай", region: "Восток", army: "Морские арбалеты", color: "#356f78", desc: "Порты, флот и богатство восточных морей." },
    { id: "weishan", name: "Вэйшань", region: "Горы", army: "Каменные щиты", color: "#6d6558", desc: "Горные перевалы, крепости и непревзойдённые инженеры." },
    { id: "yue", name: "Юэ", region: "Юго-восток", army: "Тени Юэ", color: "#526b45", desc: "Купеческие дома, разведчики, наёмники и тайные союзы." }
  ];

  const ORIGINS = [
    { id: "peasant", name: "Крестьянский сын", desc: "Стойкость рода, привыкшего выживать", bonuses: { "Стойкость": 2 }, perk: "Уважение простых солдат" },
    { id: "noble", name: "Обедневший дворянин", desc: "Манеры двора и старое имя", bonuses: { "Харизма": 2 }, influence: 10, perk: "Влияние при дворе" },
    { id: "mercenary", name: "Наёмник", desc: "Оружие раньше присяги", bonuses: { "Сила": 2 }, gold: 80, perk: "Боевой опыт" },
    { id: "orphan", name: "Сирота войны", desc: "Читает опасность раньше других", bonuses: { "Разведка": 2, "Стойкость": 1 }, perk: "Чутьё на засады" },
    { id: "strategist", name: "Ученик стратега", desc: "Побеждает до первого удара", bonuses: { "Тактика": 3 }, perk: "Ускоренное обучение" }
  ];

  const RANKS = [
    { name: "Рекрут", chapter: 1, command: 100, perk: "Основы строя" },
    { name: "Солдат", chapter: 2, command: 150, perk: "Закалка" },
    { name: "Десятник", chapter: 4, command: 250, perk: "Малый отряд" },
    { name: "Сотник", chapter: 7, command: 500, perk: "Боевой приказ" },
    { name: "Пятисотник", chapter: 10, command: 900, perk: "Резерв" },
    { name: "Тысячник", chapter: 12, command: 1600, perk: "Полковой строй" },
    { name: "Командир 3000", chapter: 17, command: 3500, perk: "Двойной фланг" },
    { name: "Командир 5000", chapter: 22, command: 6000, perk: "Военный совет" },
    { name: "Генерал", chapter: 27, command: 12000, perk: "Генеральская аура" },
    { name: "Старший генерал", chapter: 32, command: 22000, perk: "Стратегический резерв" },
    { name: "Великий генерал", chapter: 37, command: 45000, perk: "Знамя Поднебесной" },
    { name: "Верховный главнокомандующий", chapter: 42, command: 100000, perk: "Мандат Неба" }
  ];

  const CHAPTER_NAMES = [
    "Пепел старой империи", "Сто имён на бамбуке", "Кровь на границе", "Знамя Го Чжэня", "Первый приказ", "Волчий перевал",
    "Город без ворот", "Клятва сотни", "Три дороги", "Полководец из тумана", "Падение Шуйчэна", "Тысячник",
    "Пир перед бурей", "Семь послов", "Алый союз", "Шесть армий идут на запад", "Багровая Лисица", "Ночь горящих складов",
    "Стена из десяти тысяч щитов", "Цена победы", "Чёрный снег Яньло", "Кавалерия севера", "Дуэль на реке Цан", "Коронованный ребёнок",
    "Змеи императорского двора", "Указ о железе", "Восстание Чёрного Знамени", "Предатель в штабе", "Осада Небесных ворот", "Падение первого царства",
    "Сломанная корона", "Две столицы", "Война наследников", "Пять великих армий", "Река мёртвых знамён", "Последний союз",
    "Семь корон", "Мандат без императора", "Великая кампания", "Последняя война Поднебесной", "Врата Тянь", "Мандат Неба"
  ];

  const CHAPTER_SUMMARIES = [
    "Пограничная война втягивает героя в конфликт, который намного больше его первого отряда.",
    "Военный приказ сталкивается с ценой, которую за него заплатят обычные солдаты.",
    "Разведка раскрывает слабое место противника, но оставляет мало времени на решение.",
    "Большая битва проверяет снабжение, строй и способность удержать людей под знаменем.",
    "Двор требует удобной победы, пока фронт требует невозможного.",
    "Семь царств двигают армии, и даже союзники готовят нож за спиной."
  ];

  const CHAPTERS = CHAPTER_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    summary: CHAPTER_SUMMARIES[index % CHAPTER_SUMMARIES.length],
    recommended: 1 + index * 2,
    reward: 120 + index * 28,
    terrain: ["Равнина", "Лес", "Холмы", "Река", "Крепость"][index % 5],
    enemy: KINGDOMS[(index + 2) % KINGDOMS.length].name
  }));

  const OP_TYPES = ["Разведка", "Ночной рейд", "Сопровождение", "Охота на офицера", "Защита обоза", "Диверсия", "Полевое сражение", "Переговоры", "Спасение", "Осада"];
  const OP_CODENAMES = ["Тихая цапля", "Сломанное копьё", "Красный дождь", "Пепельный мост", "Нефритовый волк", "Десять факелов", "Мёртвый колокол", "Белая река", "Тёмный бамбук", "Грозовой барабан"];
  const OPERATIONS = Array.from({ length: 420 }, (_, index) => ({
    id: index + 1,
    chapter: Math.floor(index / 10) + 1,
    type: OP_TYPES[index % OP_TYPES.length],
    name: `${OP_TYPES[index % 10]}: «${OP_CODENAMES[index % 10]}»`,
    power: 12 + Math.floor(index / 7),
    energy: 6 + (index % 8),
    gold: 20 + (index % 17) * 4,
    xp: 8 + (index % 9) * 2,
    tacticalBattle: ["Полевое сражение", "Осада", "Защита обоза"].includes(OP_TYPES[index % OP_TYPES.length])
  }));

  const EDICTS = Array.from({ length: 60 }, (_, index) => ({
    id: index + 1,
    name: ["Указ о зерне", "Военная перепись", "Кузницы короны", "Дорожная повинность", "Охрана караванов", "Набор инженеров"][index % 6] + " " + (Math.floor(index / 6) + 1),
    desc: ["Снабжение армии", "Резерв рекрутов", "Качество оружия", "Скорость передвижения", "Доход торговли", "Осадная эффективность"][index % 6],
    bonus: ["supply", "recruits", "attack", "speed", "income", "siege"][index % 6],
    cost: 80 + index * 12
  }));

  const ITEMS = {
    old_jian: { name: "Старый цзянь", rarity: "common", slot: "weapon", price: 30, level: 1, desc: "Потёртый клинок, переживший не одну пограничную стычку.", stats: { attack: 3, precision: 1 } },
    leather_vest: { name: "Кожаный нагрудник", rarity: "common", slot: "armor", price: 45, level: 1, desc: "Лёгкая защита рекрута.", stats: { defense: 3, maxHp: 8 } },
    ration: { name: "Походный паёк", rarity: "common", slot: "consumable", price: 14, level: 1, stackable: true, desc: "Восстанавливает 18 энергии.", effect: { energy: 18 } },
    medicine: { name: "Полевое лекарство", rarity: "uncommon", slot: "consumable", price: 38, level: 2, stackable: true, desc: "Восстанавливает 35 здоровья.", effect: { hp: 35 } },
    provisions: { name: "Армейские припасы", rarity: "uncommon", slot: "consumable", price: 55, level: 2, stackable: true, desc: "Даёт 45 единиц снабжения.", effect: { supply: 45 } },
    tempered_jian: { name: "Закалённый цзянь", rarity: "rare", slot: "weapon", price: 180, level: 4, desc: "Уравновешенный офицерский клинок.", stats: { attack: 8, precision: 4, duelGuard: 2 } },
    repeating_crossbow: { name: "Многозарядный арбалет", rarity: "epic", slot: "weapon", price: 470, level: 12, desc: "Редкий механизм мастеров Вэйшаня.", stats: { attack: 11, precision: 7, initiative: 3 } },
    polar_spear: { name: "Копьё Полярной звезды", rarity: "legendary", slot: "weapon", price: 860, level: 22, desc: "Древко Великого генерала не дрожит даже перед конницей.", stats: { attack: 17, precision: 8, duelGuard: 5 } },
    lamellar_armor: { name: "Ламеллярный доспех", rarity: "rare", slot: "armor", price: 240, level: 5, desc: "Пластины распределяют силу удара.", stats: { defense: 9, maxHp: 22, duelGuard: 4 } },
    red_scale_armor: { name: "Доспех Багровой чешуи", rarity: "epic", slot: "armor", price: 620, level: 17, desc: "Полководческий доспех южных легионов.", stats: { defense: 14, maxHp: 35, morale: 6 } },
    dragon_armor: { name: "Доспех Небесного дракона", rarity: "heavenly", slot: "armor", price: 2450, level: 35, desc: "Реликвия, которую признают семь царств.", stats: { defense: 23, maxHp: 60, duelGuard: 12, morale: 10 } },
    warhorse: { name: "Боевой конь", rarity: "epic", slot: "mount", price: 320, level: 8, desc: "Даёт скорость на поле боя и преимущество первого удара.", stats: { initiative: 8, attack: 4, morale: 3 } },
    shadow_horse: { name: "Вороной конь Яньло", rarity: "legendary", slot: "mount", price: 980, level: 24, desc: "Северный конь, способный пройти марш без отдыха.", stats: { initiative: 14, attack: 7, defense: 3 } },
    secret_map: { name: "Карта тайных троп", rarity: "rare", slot: "talisman", price: 90, level: 3, desc: "Открывает пути для засад и обходных манёвров.", stats: { scout: 5, tactics: 3 } },
    strategist_fan: { name: "Веер Чёрного стратега", rarity: "epic", slot: "talisman", price: 720, level: 19, desc: "Знак власти военного советника.", stats: { tactics: 10, initiative: 4, charisma: 3 } },
    white_tiger: { name: "Талисман Белого Тигра", rarity: "legendary", slot: "talisman", price: 540, level: 15, desc: "Пробуждает ярость воина и стойкость строя.", stats: { attack: 7, morale: 8, duelGuard: 6 } },
    imperial_seal: { name: "Императорская печать Тянь", rarity: "heavenly", slot: "talisman", price: 2200, level: 32, desc: "Утраченный символ права повелевать Поднебесной.", stats: { charisma: 12, tactics: 8, morale: 12 } },
    silk_gift: { name: "Южный шёлк", rarity: "uncommon", slot: "gift", price: 65, level: 1, stackable: true, desc: "Уместный подарок союзнику.", relation: { affection: 6, trust: 2 } },
    war_scroll: { name: "Редкий военный трактат", rarity: "rare", slot: "gift", price: 145, level: 6, stackable: true, desc: "Подарок для того, кто ценит умную победу.", relation: { affection: 8, trust: 6 } },
    jade_hairpin: { name: "Шпилька из чёрного нефрита", rarity: "epic", slot: "gift", price: 360, level: 12, stackable: true, desc: "Личный подарок, который невозможно принять равнодушно.", relation: { affection: 14, trust: 5 } }
  };

  const LEGACY_ITEM_MAP = Object.fromEntries(Object.entries(ITEMS).map(([id, def]) => [def.name.toLowerCase(), id]));

  const UNITS = {
    spearmen: { name: "Копейщики", glyph: "槍", role: "Удержание линии", cost: 120, attack: 16, defense: 24, range: 1, speed: 3, morale: 64, discipline: 62, counters: "Конница", ability: "Стена копий", tiers: ["Ополчение с копьями", "Копейщики", "Железная фаланга", "Стража дракона", "Небесные копья"] },
    archers: { name: "Лучники", glyph: "弓", role: "Дальний огонь", cost: 145, attack: 20, defense: 10, range: 3, speed: 3, morale: 58, discipline: 57, counters: "Медленная пехота", ability: "Залп", tiers: ["Охотники", "Лучники", "Составной лук", "Багровый залп", "Тысяча стрел"] },
    cavalry: { name: "Конница", glyph: "騎", role: "Прорыв фланга", cost: 230, attack: 27, defense: 16, range: 1, speed: 7, morale: 68, discipline: 55, counters: "Лучники", ability: "Сокрушительный натиск", tiers: ["Конные разведчики", "Конница", "Тяжёлые всадники", "Северная буря", "Крылья Неба"] },
    scouts: { name: "Разведчики", glyph: "影", role: "Манёвр и ослабление", cost: 160, attack: 14, defense: 12, range: 2, speed: 8, morale: 60, discipline: 64, counters: "Осадные расчёты", ability: "Дымовая диверсия", tiers: ["Следопыты", "Разведчики", "Тени Юэ", "Ночные клинки", "Безмолвная сотня"] },
    guards: { name: "Тяжёлая стража", glyph: "盾", role: "Защита союзников", cost: 260, attack: 19, defense: 31, range: 1, speed: 2, morale: 76, discipline: 78, counters: "Лёгкая пехота", ability: "Не отступать", tiers: ["Щитоносцы", "Дворцовая стража", "Каменные щиты", "Стена Тянь", "Бессмертный строй"] },
    engineers: { name: "Инженеры", glyph: "火", role: "Осады и контроль", cost: 210, attack: 22, defense: 13, range: 2, speed: 2, morale: 55, discipline: 72, counters: "Укрепления", ability: "Огненные горшки", tiers: ["Рабочие обоза", "Военные инженеры", "Осадный расчёт", "Мастера пороха", "Разрушители врат"] }
  };

  const GENERALS = {
    gao_zhen: { name: "Го Чжэнь", title: "Железный наставник", kingdom: "Цзинь", unlock: 1, maxHp: 125, attack: 19, defense: 15, speed: 10, technique: 11, style: "Выдерживает серию ударов и наказывает спешку.", rewardGold: 120, relation: "Го Чжэнь" },
    hua_ning: { name: "Хуа Нин", title: "Клинок без тени", kingdom: "Лян", unlock: 9, maxHp: 155, attack: 24, defense: 16, speed: 16, technique: 18, style: "Ложные выпады быстро расходуют твою стойку.", rewardGold: 260, relation: "Хуа Нин" },
    lin_ruoyue: { name: "Линь Жаоюэ", title: "Багровая Лисица", kingdom: "Чуань", unlock: 17, maxHp: 205, attack: 31, defense: 23, speed: 19, technique: 27, style: "Меняет ритм дуэли и превращает слабость в приманку.", rewardGold: 520, rewardItem: "white_tiger", relation: "Линь Жаоюэ" },
    mei_sha: { name: "Мэй Ша", title: "Белая Змея Юэ", kingdom: "Юэ", unlock: 23, maxHp: 235, attack: 36, defense: 24, speed: 29, technique: 25, style: "Побеждает скоростью и ядом усталости.", rewardGold: 680, relation: "Мэй Ша" },
    sun_celin: { name: "Сунь Цэлин", title: "Золотая регентша", kingdom: "Лян", unlock: 30, maxHp: 275, attack: 41, defense: 32, speed: 23, technique: 34, style: "Читает повторяющиеся приёмы и усиливается в затяжной дуэли.", rewardGold: 920, relation: "Сунь Цэлин" },
    shen_luo: { name: "Шэнь Ло", title: "Последний тигр Тянь", kingdom: "Империя Тянь", unlock: 38, maxHp: 340, attack: 52, defense: 39, speed: 31, technique: 42, style: "Три боевые фазы требуют менять тактику до последнего удара.", rewardGold: 1500, rewardItem: "imperial_seal", relation: "Шэнь Ло" }
  };

  const RELATIONS = {
    "Го Чжэнь": { role: "Наставник · генерал Цзинь", unlock: 1, tone: "Суровый наставник, который уважает поступки, а не слова.", preference: "war_scroll" },
    "Хуа Нин": { role: "Стратег двора Лян", unlock: 6, tone: "Холодный ум и безупречная память на обещания.", preference: "war_scroll" },
    "Линь Жаоюэ": {
      role: "Великий генерал Чуань · Багровая Лисица", unlock: 17, tone: "Опасная соперница, для которой флирт и военная провокация почти одно и то же.", preference: "jade_hairpin", requiresDuel: "lin_ruoyue",
      scenes: {
        talk: [
          { min: 0, title: "Взгляд через поле боя", text: "Между горящими знамёнами Чуань она замечает именно тебя. Вместо приказа лучникам Линь Жаоюэ поднимает ладонь и с улыбкой предлагает закончить начатый манёвр в другой день." },
          { min: 35, title: "Партия на военной карте", text: "Она переставляет твой деревянный жетон прямо в окружение, а затем требует найти выход. Когда ты находишь третий путь, её насмешка впервые звучит как настоящее одобрение." },
          { min: 60, title: "Перемирие на один вечер", text: "Без свиты и доспехов Жаоюэ говорит о цене славы. Она признаётся, что ждала встречи с равным не меньше, чем новой войны, и оставляет рядом с твоей чашей свою красную ленту." },
          { min: 85, title: "Слова без отступления", text: "Багровая Лисица больше не прячет чувство за шутками. Она требует одного: никогда не превращать любовь в цепь. В ответ ты обещаешь идти рядом, даже если ваши армии снова окажутся по разные стороны." }
        ],
        date: [
          { min: 60, title: "Тайная прогулка по стене", text: "Вы уходите от охраны на старую городскую стену. Жаоюэ дразнит тебя воспоминанием о первой встрече, затем неожиданно доверяет историю своего первого поражения. Ночь заканчивается обещанием новой дуэли — уже без свидетелей." },
          { min: 85, title: "Ночь тысячи фонарей", text: "Город Чуань тонет в красном свете. Вы проходите через рынок под чужими именами, спорите о будущем семи царств и освобождаете бумажный фонарь над рекой. Жаоюэ целует тебя первой, тут же усмехается твоему удивлению и называет это единственной победой, которую не собирается делить с армией." },
          { min: 100, title: "Клятва Багровой Лисицы", text: "На рассвете вы возвращаетесь на то самое поле, где встретились. Она кладёт между вами меч и красную ленту: война остаётся войной, но после неё вы построите дом без заложников и политических браков. Клятва становится частью личной летописи героя." }
        ]
      }
    },
    "Шэнь Ло": { role: "Наследник военной школы Тянь", unlock: 28, tone: "Соперник, чьё доверие нельзя купить.", preference: "war_scroll" },
    "Мэй Ша": { role: "Глава разведки Юэ", unlock: 12, tone: "Смеётся легко, но проверяет каждую сказанную фразу.", preference: "silk_gift" },
    "Сунь Цэлин": { role: "Регентша Лян", unlock: 20, tone: "Политический союз с ней всегда имеет второе дно.", preference: "jade_hairpin" }
  };

  const RELATION_STAGES = [
    { min: 0, name: "Незнакомец" },
    { min: 1, name: "Знакомство" },
    { min: 15, name: "Интерес" },
    { min: 35, name: "Уважение" },
    { min: 60, name: "Привязанность" },
    { min: 85, name: "Любовь" },
    { min: 100, name: "Нерушимая связь" }
  ];

  const ITEM_SLOT_NAMES = { weapon: "Оружие", armor: "Доспех", mount: "Конь", talisman: "Реликвия", consumable: "Расходник", gift: "Подарок" };
  const TERRAIN = [
    { id: "plains", name: "Открытая равнина", desc: "Конница быстрее, укрытий нет." },
    { id: "forest", name: "Бамбуковый лес", desc: "Дальний огонь ослаблен, разведчики сильнее." },
    { id: "hills", name: "Каменные холмы", desc: "Высота усиливает защиту и стрельбу." },
    { id: "river", name: "Речной брод", desc: "Перемещение через центр замедлено." },
    { id: "fortress", name: "Подступы к крепости", desc: "Защитники используют укрепления." }
  ];

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function round(value) { return Math.round(value * 10) / 10; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function nowIso() { return new Date().toISOString(); }
  function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }

  function itemInstance(id, quantity = 1, extras = {}) {
    return { uid: uid("item"), id, quantity, level: 1, durability: 100, ...extras };
  }

  function unitInstance(type, count, tier = 1, extras = {}) {
    return { uid: uid("unit"), type, count, tier, xp: 0, veterancy: 0, morale: UNITS[type]?.morale || 60, formation: "Линия", ...extras };
  }

  function relationState(value = 0) {
    return { affection: clamp(Number(value) || 0, 0, 100), trust: clamp(Math.floor((Number(value) || 0) * 0.65), 0, 100), tension: 0, romance: false, lastActionDay: {}, scenes: [] };
  }

  function createNewState(input = {}) {
    const origin = ORIGINS.find(item => item.name === input.origin || item.id === input.origin) || ORIGINS[0];
    const sword = itemInstance("old_jian");
    const armor = itemInstance("leather_vest");
    const state = {
      schemaVersion: SAVE_VERSION,
      name: String(input.name || "Безымянный").trim() || "Безымянный",
      home: input.home || "Цзинь",
      origin: origin.name,
      year: 217,
      day: 1,
      chapter: 1,
      level: 1,
      xp: 0,
      rankIndex: 0,
      gold: 150 + (origin.gold || 0),
      energy: 100,
      maxEnergy: 100,
      hp: 100,
      reputation: 0,
      influence: origin.influence || 0,
      intel: 15,
      supply: 90,
      army: 90,
      armyMorale: 64,
      estate: 0,
      stats: { "Сила": 8, "Стойкость": 8, "Тактика": 7, "Харизма": 6, "Разведка": 6 },
      inventory: [sword, armor, itemInstance("ration", 3), itemInstance("medicine", 1), itemInstance("silk_gift", 1)],
      equipment: { weapon: sword.uid, armor: armor.uid, mount: null, talisman: null },
      units: [unitInstance("spearmen", 60), unitInstance("archers", 30)],
      relations: {},
      completedOps: [],
      edicts: [],
      annals: ["217 год — герой прибыл в пограничный лагерь Цзинь."],
      flags: {},
      duelResults: {},
      battleHistory: [],
      activeBattle: null,
      activeDuel: null,
      lastPage: "campaign",
      _meta: { createdAt: nowIso(), updatedAt: nowIso(), sourceVersion: SAVE_VERSION }
    };
    for (const [key, value] of Object.entries(origin.bonuses || {})) state.stats[key] = (state.stats[key] || 0) + value;
    for (const name of Object.keys(RELATIONS)) state.relations[name] = relationState(name === "Го Чжэнь" ? 8 : 0);
    return state;
  }

  function legacyItemFromString(value) {
    const source = String(value || "").trim();
    const quantityMatch = source.match(/(?:×|x)\s*(\d+)$/i);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
    const cleanName = source.replace(/\s*(?:×|x)\s*\d+$/i, "").trim();
    const id = LEGACY_ITEM_MAP[cleanName.toLowerCase()];
    return id ? itemInstance(id, quantity) : itemInstance("legacy", quantity, { legacyName: cleanName || "Старый предмет" });
  }

  function normalizeInventory(rawInventory, fallback) {
    if (!Array.isArray(rawInventory)) return clone(fallback);
    return rawInventory.map(item => {
      if (typeof item === "string") return legacyItemFromString(item);
      if (!item || typeof item !== "object") return null;
      const id = ITEMS[item.id] ? item.id : (LEGACY_ITEM_MAP[String(item.name || item.legacyName || "").toLowerCase()] || "legacy");
      return {
        uid: item.uid || uid("item"),
        id,
        quantity: Math.max(1, Number(item.quantity) || 1),
        level: Math.max(1, Number(item.level) || 1),
        durability: clamp(Number(item.durability ?? 100), 0, 100),
        ...(id === "legacy" ? { legacyName: item.legacyName || item.name || "Старый предмет" } : {})
      };
    }).filter(Boolean);
  }

  function unitTypeFromName(name) {
    const needle = String(name || "").toLowerCase();
    return Object.keys(UNITS).find(id => needle.includes(UNITS[id].name.toLowerCase().replace(/и$/, ""))) ||
      (needle.includes("коп") ? "spearmen" : needle.includes("луч") ? "archers" : needle.includes("кон") ? "cavalry" : needle.includes("развед") ? "scouts" : "spearmen");
  }

  function normalizeUnits(raw, army) {
    if (Array.isArray(raw) && raw.length) {
      return raw.map(unit => {
        if (Array.isArray(unit)) return unitInstance(unitTypeFromName(unit[0]), Math.max(0, Number(unit[1]) || 0), Math.max(1, Number(unit[2]) || 1));
        const type = UNITS[unit?.type] ? unit.type : unitTypeFromName(unit?.name);
        return unitInstance(type, Math.max(0, Number(unit?.count) || 0), clamp(Number(unit?.tier) || 1, 1, 5), {
          uid: unit?.uid || uid("unit"), xp: Math.max(0, Number(unit?.xp) || 0), veterancy: clamp(Number(unit?.veterancy) || 0, 0, 5),
          morale: clamp(Number(unit?.morale ?? UNITS[type].morale), 0, 100), formation: unit?.formation || "Линия"
        });
      }).filter(unit => unit.count > 0);
    }
    const total = Math.max(0, Number(army) || 0);
    if (!total) return [];
    return [
      unitInstance("spearmen", Math.ceil(total * 0.45)),
      unitInstance("archers", Math.ceil(total * 0.25)),
      unitInstance("cavalry", Math.ceil(total * 0.15)),
      unitInstance("scouts", Math.max(0, total - Math.ceil(total * 0.45) - Math.ceil(total * 0.25) - Math.ceil(total * 0.15)))
    ].filter(unit => unit.count > 0);
  }

  function migrateSave(raw) {
    if (!raw || typeof raw !== "object") return null;
    const base = createNewState({ name: raw.name, home: raw.home, origin: raw.origin });
    const state = { ...base, ...raw };
    state.schemaVersion = SAVE_VERSION;
    state.name = String(raw.name || base.name).slice(0, 60);
    state.chapter = clamp(Number(raw.chapter) || 1, 1, 42);
    state.level = Math.max(1, Number(raw.level) || 1);
    state.rankIndex = clamp(Number(raw.rankIndex) || 0, 0, RANKS.length - 1);
    state.maxEnergy = Math.max(100, Number(raw.maxEnergy) || 100);
    state.energy = clamp(Number(raw.energy ?? 100), 0, state.maxEnergy);
    state.gold = Math.max(0, Number(raw.gold) || 0);
    state.intel = Math.max(0, Number(raw.intel) || 0);
    state.supply = Math.max(0, Number(raw.supply ?? 80));
    state.stats = { ...base.stats, ...(raw.stats || {}) };
    state.inventory = normalizeInventory(raw.inventory, base.inventory);
    const migratedEquipment = { weapon: null, armor: null, mount: null, talisman: null, ...(raw.equipment || {}) };
    for (const slot of ["weapon", "armor", "mount", "talisman"]) {
      if (!state.inventory.some(item => item.uid === migratedEquipment[slot])) {
        const match = state.inventory.find(item => ITEMS[item.id]?.slot === slot);
        migratedEquipment[slot] = match ? match.uid : null;
      }
    }
    state.equipment = migratedEquipment;
    state.units = normalizeUnits(raw.units, raw.army);
    state.army = state.units.reduce((sum, unit) => sum + unit.count, 0);
    state.relations = {};
    for (const name of new Set([...Object.keys(RELATIONS), ...Object.keys(raw.relations || {})])) {
      const value = raw.relations?.[name];
      state.relations[name] = typeof value === "number" ? relationState(value) : { ...relationState(0), ...(value || {}), lastActionDay: { ...(value?.lastActionDay || {}) }, scenes: Array.isArray(value?.scenes) ? value.scenes : [] };
      state.relations[name].affection = clamp(Number(state.relations[name].affection) || 0, 0, 100);
      state.relations[name].trust = clamp(Number(state.relations[name].trust) || 0, 0, 100);
      state.relations[name].tension = clamp(Number(state.relations[name].tension) || 0, 0, 100);
    }
    state.completedOps = [...new Set((raw.completedOps || []).map(Number).filter(id => id >= 1 && id <= 420))];
    state.edicts = [...new Set((raw.edicts || []).map(Number).filter(id => id >= 1 && id <= 60))];
    state.annals = Array.isArray(raw.annals) ? raw.annals.slice(-600) : base.annals;
    state.flags = { ...(raw.flags || {}) };
    state.duelResults = { ...(raw.duelResults || {}) };
    state.battleHistory = Array.isArray(raw.battleHistory) ? raw.battleHistory.slice(-80) : [];
    state.activeBattle = raw.activeBattle && Array.isArray(raw.activeBattle.units) ? raw.activeBattle : null;
    state.activeDuel = raw.activeDuel && raw.activeDuel.generalId ? raw.activeDuel : null;
    state._meta = { ...base._meta, ...(raw._meta || {}), updatedAt: nowIso(), migratedFrom: Number(raw.schemaVersion) || 1, sourceVersion: SAVE_VERSION };
    return state;
  }

  function itemDef(item) {
    if (!item) return null;
    return ITEMS[item.id] || { name: item.legacyName || "Старый предмет", rarity: "common", slot: "legacy", desc: "Предмет из прежней версии сохранения.", stats: {} };
  }

  function itemBonuses(state) {
    const result = {};
    for (const uidValue of Object.values(state.equipment || {})) {
      const item = (state.inventory || []).find(entry => entry.uid === uidValue);
      const def = itemDef(item);
      if (!item || !def) continue;
      const scale = 1 + (Math.max(1, item.level || 1) - 1) * 0.08;
      for (const [key, value] of Object.entries(def.stats || {})) result[key] = round((result[key] || 0) + value * scale);
    }
    return result;
  }

  function heroStats(state) {
    const base = state.stats || {};
    const bonus = itemBonuses(state);
    const value = key => Number(bonus[key]) || 0;
    return {
      maxHp: Math.round(78 + (Number(base["Стойкость"]) || 0) * 8 + value("maxHp")),
      attack: Math.round((Number(base["Сила"]) || 0) * 2.15 + state.level * 0.8 + value("attack")),
      defense: Math.round((Number(base["Стойкость"]) || 0) * 1.75 + state.level * 0.45 + value("defense")),
      precision: Math.round(55 + (Number(base["Разведка"]) || 0) * 1.45 + value("precision")),
      initiative: Math.round((Number(base["Разведка"]) || 0) * 1.35 + (Number(base["Тактика"]) || 0) * 0.65 + value("initiative")),
      tactics: Math.round((Number(base["Тактика"]) || 0) * 2 + value("tactics")),
      charisma: Math.round((Number(base["Харизма"]) || 0) * 2 + value("charisma")),
      scout: Math.round((Number(base["Разведка"]) || 0) * 2 + value("scout")),
      duelGuard: Math.round((Number(base["Стойкость"]) || 0) * 1.2 + (Number(base["Тактика"]) || 0) * 0.5 + value("duelGuard")),
      morale: Math.round(50 + (Number(base["Харизма"]) || 0) * 1.5 + value("morale")),
      bonuses: bonus
    };
  }

  function unitStats(unit, state) {
    const def = UNITS[unit.type] || UNITS.spearmen;
    const tier = clamp(Number(unit.tier) || 1, 1, 5);
    const tierScale = 1 + (tier - 1) * 0.23;
    const veteranScale = 1 + clamp(Number(unit.veterancy) || 0, 0, 5) * 0.055 + Math.min(0.12, (Number(unit.xp) || 0) / 5000);
    const edictAttack = (state?.edicts || []).filter(id => EDICTS[id - 1]?.bonus === "attack").length * 0.02;
    const edictSpeed = (state?.edicts || []).filter(id => EDICTS[id - 1]?.bonus === "speed").length * 0.15;
    const stats = {
      attack: round(def.attack * tierScale * veteranScale * (1 + edictAttack)),
      defense: round(def.defense * tierScale * veteranScale),
      range: def.range,
      speed: round(def.speed + (tier - 1) * 0.35 + edictSpeed),
      morale: clamp(round((Number(unit.morale) || def.morale) + (tier - 1) * 3), 0, 100),
      discipline: clamp(round(def.discipline + (tier - 1) * 4 + (Number(unit.veterancy) || 0) * 3), 0, 100)
    };
    stats.power = Math.round((stats.attack * 1.25 + stats.defense + stats.range * 4 + stats.speed * 1.5 + stats.morale * 0.22 + stats.discipline * 0.25) * Math.max(1, unit.count) / 50);
    return stats;
  }

  function armyPower(state) {
    return (state.units || []).reduce((sum, unit) => sum + unitStats(unit, state).power, 0);
  }

  function relationStage(value) {
    const amount = typeof value === "object" ? Number(value.affection) || 0 : Number(value) || 0;
    return [...RELATION_STAGES].reverse().find(stage => amount >= stage.min) || RELATION_STAGES[0];
  }

  function relationScene(name, action, affection) {
    const def = RELATIONS[name] || {};
    const custom = def.scenes?.[action];
    if (custom?.length) return [...custom].reverse().find(scene => affection >= scene.min) || custom[0];
    const stage = relationStage(affection).name;
    const generic = {
      talk: { title: `Разговор: ${name}`, text: `${name} обсуждает с тобой последние приказы. Уровень отношений «${stage}» меняет тон беседы и открывает новые детали.` },
      train: { title: `Совместная тренировка`, text: `${name} проверяет твою технику и не позволяет закончить занятие лёгкой победой.` },
      mission: { title: `Совместная операция`, text: `Вы проводите рискованный манёвр без лишних свидетелей. Успех укрепляет доверие сильнее любых придворных слов.` },
      date: { title: `Личная встреча`, text: `На несколько часов война отступает. ${name} говорит о будущем, которое обычно не доверяет даже ближайшей свите.` },
      gift: { title: `Знак внимания`, text: `${name} принимает подарок и запоминает не его цену, а выбранный смысл.` }
    };
    return generic[action] || generic.talk;
  }

  function createBattle(state, options = {}) {
    const chapter = clamp(Number(options.chapter || state.chapter) || 1, 1, 42);
    const terrain = TERRAIN[(chapter - 1) % TERRAIN.length];
    let sourceUnits = (state.units || []).filter(unit => unit.count > 0).slice(0, 5);
    let temporary = false;
    if (!sourceUnits.length) {
      sourceUnits = [unitInstance("spearmen", 55), unitInstance("archers", 25)];
      temporary = true;
    }
    const playerPositions = [[0, 1], [0, 3], [1, 0], [1, 2], [1, 4]];
    const enemyPositions = [[6, 1], [6, 3], [5, 0], [5, 2], [5, 4]];
    const enemyTypes = ["spearmen", "archers", "cavalry", "guards", "scouts"];
    const enemyCountBase = Math.max(38, Math.round(sourceUnits.reduce((sum, unit) => sum + unit.count, 0) / Math.max(2, sourceUnits.length) * (0.9 + chapter * 0.018)));
    const plan = options.plan || "balanced";
    const player = sourceUnits.map((unit, index) => {
      const stats = unitStats(unit, state);
      return {
        id: uid("battle"), sourceUid: temporary ? null : unit.uid, side: "player", type: unit.type, name: UNITS[unit.type]?.name || "Отряд",
        count: unit.count, maxCount: unit.count, attack: round(stats.attack * (plan === "aggressive" ? 1.14 : 1)), defense: round(stats.defense * (plan === "aggressive" ? 0.94 : plan === "tactical" ? 1.08 : 1)),
        range: stats.range, speed: stats.speed, morale: clamp(stats.morale + (plan === "tactical" ? 5 : 0), 0, 100), maxMorale: 100,
        x: playerPositions[index][0], y: playerPositions[index][1], acted: false, defending: false, routed: false, abilityUsed: false, formation: unit.formation || "Линия"
      };
    });
    const enemySize = clamp(Math.max(2, player.length), 2, 5);
    const enemy = Array.from({ length: enemySize }, (_, index) => {
      const type = enemyTypes[(index + chapter) % enemyTypes.length];
      const tier = clamp(1 + Math.floor((chapter - 1) / 9), 1, 5);
      const base = unitStats(unitInstance(type, enemyCountBase, tier), state);
      const countScale = plan === "tactical" ? 0.88 : 1;
      return {
        id: uid("enemy"), sourceUid: null, side: "enemy", type, name: `${UNITS[type].name} ${CHAPTERS[chapter - 1].enemy}`,
        count: Math.max(12, Math.round(enemyCountBase * countScale)), maxCount: Math.max(12, Math.round(enemyCountBase * countScale)),
        attack: round(base.attack * (0.91 + chapter * 0.007)), defense: round(base.defense * (0.91 + chapter * 0.007)), range: base.range, speed: base.speed,
        morale: clamp(base.morale - (plan === "tactical" ? 9 : 0), 30, 100), maxMorale: 100,
        x: enemyPositions[index][0], y: enemyPositions[index][1], acted: false, defending: false, routed: false, abilityUsed: false, formation: "Боевой строй"
      };
    });
    return {
      id: uid("war"), chapter, kind: options.kind || "campaign", operationId: options.operationId || null, plan, terrain: terrain.id, terrainName: terrain.name,
      objective: options.objective || (options.kind === "training" ? "Учебный бой" : `Разгромить армию ${CHAPTERS[chapter - 1].enemy}`),
      round: 1, selectedUnitId: null, command: "attack", status: "active", temporaryArmy: temporary,
      units: [...player, ...enemy], log: [`Раунд 1. Поле боя: ${terrain.name}.`], rewards: { gold: 90 + chapter * 24, xp: 18 + chapter * 3, reputation: 3 + Math.floor(chapter / 4) }
    };
  }

  function battleUnitAt(battle, x, y) {
    return battle.units.find(unit => !unit.routed && unit.count > 0 && unit.x === x && unit.y === y) || null;
  }

  function battleDistance(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

  function battleStatus(battle) {
    const playerAlive = battle.units.some(unit => unit.side === "player" && unit.count > 0 && !unit.routed);
    const enemyAlive = battle.units.some(unit => unit.side === "enemy" && unit.count > 0 && !unit.routed);
    return !enemyAlive ? "victory" : !playerAlive ? "defeat" : "active";
  }

  function counterMultiplier(attacker, target) {
    if (attacker.type === "spearmen" && target.type === "cavalry") return 1.3;
    if (attacker.type === "cavalry" && target.type === "archers") return 1.28;
    if (attacker.type === "archers" && ["spearmen", "engineers"].includes(target.type)) return 1.16;
    if (attacker.type === "scouts" && target.type === "engineers") return 1.25;
    return 1;
  }

  function battleAttack(battle, attackerId, targetId, options = {}) {
    const rng = options.rng || Math.random;
    const attacker = battle.units.find(unit => unit.id === attackerId);
    const target = battle.units.find(unit => unit.id === targetId);
    if (!attacker || !target || attacker.side === target.side || attacker.routed || target.routed) return { ok: false, reason: "invalid" };
    const extraRange = options.extraRange || 0;
    if (battleDistance(attacker, target) > attacker.range + extraRange) return { ok: false, reason: "range" };
    const strength = Math.sqrt(Math.max(0.12, attacker.count / Math.max(1, attacker.maxCount)));
    const terrainDefense = battle.terrain === "fortress" && target.side === "enemy" ? 1.2 : battle.terrain === "hills" ? 1.08 : 1;
    const defendScale = target.defending ? 1.35 : 1;
    const power = attacker.attack * strength * (0.82 + rng() * 0.38) * counterMultiplier(attacker, target) * (options.damageScale || 1);
    const mitigation = target.defense * 0.43 * terrainDefense * defendScale;
    const losses = clamp(Math.round((power - mitigation * 0.42) / 2.25), 1, Math.max(1, Math.ceil(target.count * 0.38)));
    target.count = Math.max(0, target.count - losses);
    const moraleLoss = Math.round(4 + losses / Math.max(1, target.maxCount) * 48 + rng() * 5);
    target.morale = Math.max(0, target.morale - moraleLoss);
    if (target.count <= 0 || target.morale <= 0) target.routed = true;
    attacker.acted = true;
    target.defending = false;
    const routedText = target.routed ? " Отряд обращён в бегство." : "";
    battle.log.push(`${attacker.name} наносят удар: ${target.name} теряют ${losses} бойцов и ${moraleLoss} духа.${routedText}`);
    battle.status = battleStatus(battle);
    return { ok: true, losses, moraleLoss, routed: target.routed, status: battle.status };
  }

  function battleMove(battle, unitId, x, y) {
    const unit = battle.units.find(item => item.id === unitId);
    if (!unit || unit.routed || unit.acted || battleUnitAt(battle, x, y)) return { ok: false, reason: "blocked" };
    const maxMove = unit.speed >= 7 ? 3 : unit.speed >= 4 ? 2 : 1;
    const distance = Math.abs(unit.x - x) + Math.abs(unit.y - y);
    if (distance < 1 || distance > maxMove || x < 0 || x > 6 || y < 0 || y > 4) return { ok: false, reason: "range" };
    if (battle.terrain === "river" && x === 3 && distance > 1) return { ok: false, reason: "river" };
    unit.x = x; unit.y = y; unit.acted = true; unit.defending = false;
    battle.log.push(`${unit.name} меняют позицию.`);
    return { ok: true };
  }

  function battleDefend(battle, unitId) {
    const unit = battle.units.find(item => item.id === unitId);
    if (!unit || unit.routed || unit.acted) return { ok: false };
    unit.defending = true; unit.acted = true; unit.morale = clamp(unit.morale + 6, 0, 100);
    battle.log.push(`${unit.name} укрепляют строй и готовятся принять удар.`);
    return { ok: true };
  }

  function battleAbility(battle, unitId, targetId, options = {}) {
    const unit = battle.units.find(item => item.id === unitId);
    const target = battle.units.find(item => item.id === targetId);
    if (!unit || unit.abilityUsed || unit.acted) return { ok: false, reason: "used" };
    if (unit.type === "spearmen") {
      unit.defending = true; unit.acted = true; unit.abilityUsed = true; unit.defense = round(unit.defense * 1.25); unit.morale = clamp(unit.morale + 10, 0, 100);
      battle.log.push(`${unit.name}: «Стена копий» — защита и дух усилены.`); return { ok: true };
    }
    if (unit.type === "guards") {
      battle.units.filter(item => item.side === unit.side && !item.routed).forEach(item => { item.morale = clamp(item.morale + 10, 0, 100); });
      unit.acted = true; unit.abilityUsed = true; battle.log.push(`${unit.name}: «Не отступать» — армия восстанавливает дух.`); return { ok: true };
    }
    if (unit.type === "scouts" && target && target.side !== unit.side && battleDistance(unit, target) <= unit.range + 1) {
      target.morale = Math.max(0, target.morale - 16); target.defense = round(target.defense * 0.9); if (target.morale <= 0) target.routed = true;
      unit.acted = true; unit.abilityUsed = true; battle.log.push(`${unit.name} проводят дымовую диверсию: строй ${target.name} нарушен.`); battle.status = battleStatus(battle); return { ok: true };
    }
    if (target) {
      const scale = unit.type === "cavalry" ? 1.65 : unit.type === "archers" ? 1.38 : unit.type === "engineers" ? 1.45 : 1.25;
      const extraRange = unit.type === "cavalry" ? 2 : ["archers", "scouts"].includes(unit.type) ? 1 : 0;
      const result = battleAttack(battle, unitId, targetId, { ...options, damageScale: scale, extraRange });
      if (result.ok) { unit.abilityUsed = true; battle.log.push(`${UNITS[unit.type]?.ability || "Особый приём"} решает исход обмена ударами.`); }
      return result;
    }
    return { ok: false, reason: "target" };
  }

  function runEnemyTurn(battle, rng = Math.random) {
    const enemies = battle.units.filter(unit => unit.side === "enemy" && !unit.routed && unit.count > 0);
    for (const enemy of enemies) {
      enemy.acted = false;
      const targets = battle.units.filter(unit => unit.side === "player" && !unit.routed && unit.count > 0);
      if (!targets.length) break;
      targets.sort((a, b) => battleDistance(enemy, a) - battleDistance(enemy, b));
      const target = targets[0];
      if (battleDistance(enemy, target) <= enemy.range) {
        battleAttack(battle, enemy.id, target.id, { rng });
      } else {
        const dx = Math.sign(target.x - enemy.x);
        const dy = Math.sign(target.y - enemy.y);
        const candidates = [[enemy.x + dx, enemy.y], [enemy.x, enemy.y + dy], [enemy.x, enemy.y - dy]].filter(([x, y]) => x >= 0 && x <= 6 && y >= 0 && y <= 4 && !battleUnitAt(battle, x, y));
        if (candidates.length) {
          const [x, y] = candidates[0]; enemy.x = x; enemy.y = y;
          if (battleDistance(enemy, target) <= enemy.range) battleAttack(battle, enemy.id, target.id, { rng });
          else { enemy.acted = true; battle.log.push(`Отряд «${enemy.name}» сближается с твоей линией.`); }
        } else battleDefend(battle, enemy.id);
      }
      if (battleStatus(battle) !== "active") break;
    }
    battle.status = battleStatus(battle);
    if (battle.status === "active") {
      battle.round += 1;
      battle.units.filter(unit => unit.side === "player" && !unit.routed).forEach(unit => { unit.acted = false; unit.defending = false; });
      battle.units.filter(unit => unit.side === "enemy" && !unit.routed).forEach(unit => { unit.acted = false; });
      battle.log.push(`Раунд ${battle.round}. Твой приказ.`);
    }
    return battle.status;
  }

  function createDuel(state, generalId) {
    const general = GENERALS[generalId];
    if (!general) return null;
    const hero = heroStats(state);
    return {
      id: uid("duel"), generalId, round: 1, status: "active", phase: 1,
      hero: { hp: hero.maxHp, maxHp: hero.maxHp, stamina: 100, focus: 18, attack: hero.attack, defense: hero.defense, precision: hero.precision, guard: hero.duelGuard, initiative: hero.initiative },
      enemy: { hp: general.maxHp, maxHp: general.maxHp, stamina: 100, focus: 15, attack: general.attack, defense: general.defense, precision: 58 + general.speed, guard: general.technique, initiative: general.speed },
      log: [`${general.name}, ${general.title}, выходит на поединок. Оба войска замолкают.`]
    };
  }

  function resolveDuelRound(duel, action, rng = Math.random) {
    if (!duel || duel.status !== "active") return duel;
    const h = duel.hero, e = duel.enemy;
    let guarding = false, vulnerable = false;
    const hit = (attacker, defender, scale, accuracy = 0) => {
      const chance = clamp(0.58 + (attacker.precision - defender.initiative) / 180 + accuracy, 0.3, 0.94);
      if (rng() > chance) return 0;
      return Math.max(1, Math.round((attacker.attack * scale * (0.86 + rng() * 0.28)) - defender.defense * 0.38));
    };

    if (action === "strike") {
      if (h.stamina < 14) duel.log.push("Не хватает выносливости для сильного удара.");
      else { h.stamina -= 14; const damage = hit(h, e, 1); e.hp = Math.max(0, e.hp - damage); h.focus = clamp(h.focus + (damage ? 7 : 3), 0, 100); duel.log.push(damage ? `Твой рубящий удар наносит ${damage} урона.` : "Противник уходит с линии удара."); }
    } else if (action === "feint") {
      if (h.stamina < 11) duel.log.push("Не хватает выносливости для финта.");
      else { h.stamina -= 11; const damage = hit(h, e, 0.62, 0.18); e.hp = Math.max(0, e.hp - damage); e.guard = Math.max(0, e.guard - 5); h.focus = clamp(h.focus + 15, 0, 100); duel.log.push(damage ? `Ложный выпад открывает защиту и наносит ${damage} урона.` : "Финт раскрыт, но ты сохраняешь инициативу."); }
    } else if (action === "guard") {
      guarding = true; h.stamina = clamp(h.stamina + 10, 0, 100); h.focus = clamp(h.focus + 6, 0, 100); duel.log.push("Ты принимаешь выверенную стойку и ждёшь ошибку.");
    } else if (action === "technique") {
      if (h.focus < 35 || h.stamina < 20) duel.log.push("Для боевого приёма нужно 35 концентрации и 20 выносливости.");
      else { h.focus -= 35; h.stamina -= 20; const damage = hit(h, e, 1.72, 0.12); e.hp = Math.max(0, e.hp - damage); duel.log.push(damage ? `Особый приём прорывает стойку: ${damage} урона.` : "Генерал чудом срывает траекторию особого приёма."); }
    } else if (action === "recover") {
      h.stamina = clamp(h.stamina + 28, 0, 100); h.focus = clamp(h.focus + 10, 0, 100); vulnerable = true; duel.log.push("Ты отступаешь на шаг, восстанавливая дыхание.");
    }

    if (e.hp <= 0) { duel.status = "victory"; duel.log.push("Противник опускает оружие. Дуэль выиграна."); return duel; }

    const hpRatio = e.hp / e.maxHp;
    const newPhase = hpRatio <= 0.3 ? 3 : hpRatio <= 0.62 ? 2 : 1;
    if (newPhase > duel.phase) { duel.phase = newPhase; e.attack = round(e.attack * 1.12); e.precision += 4; duel.log.push(`Генерал меняет ритм боя. Фаза ${newPhase}: давление возрастает.`); }
    let enemyAction = "strike";
    if (e.stamina < 18) enemyAction = "recover";
    else if (e.focus >= 40 && rng() > 0.5) enemyAction = "technique";
    else if (rng() > 0.72) enemyAction = "feint";
    if (enemyAction === "recover") { e.stamina = clamp(e.stamina + 25, 0, 100); e.focus = clamp(e.focus + 8, 0, 100); duel.log.push("Противник разрывает дистанцию и восстанавливает дыхание."); }
    else {
      const cost = enemyAction === "technique" ? 20 : enemyAction === "feint" ? 11 : 14;
      const scale = enemyAction === "technique" ? 1.6 : enemyAction === "feint" ? 0.7 : 1;
      const accuracy = enemyAction === "feint" ? 0.14 : enemyAction === "technique" ? 0.08 : 0;
      e.stamina = Math.max(0, e.stamina - cost); if (enemyAction === "technique") e.focus = Math.max(0, e.focus - 40); else e.focus = clamp(e.focus + 8, 0, 100);
      let damage = hit(e, h, scale, accuracy); if (guarding) damage = Math.round(damage * 0.42); if (vulnerable) damage = Math.round(damage * 1.25);
      h.hp = Math.max(0, h.hp - damage); duel.log.push(damage ? `${GENERALS[duel.generalId].name} отвечает: ${damage} урона.` : "Ты читаешь ответный удар и уходишь с линии.");
    }
    h.stamina = clamp(h.stamina + 4, 0, 100); e.stamina = clamp(e.stamina + 4, 0, 100);
    duel.round += 1;
    if (h.hp <= 0) { duel.status = "defeat"; duel.log.push("Ты падаешь на колено. На этот раз дуэль проиграна."); }
    return duel;
  }

  return {
    SAVE_VERSION, STAT_LABELS, RARITIES, KINGDOMS, ORIGINS, RANKS, CHAPTERS, OPERATIONS, EDICTS, ITEMS, ITEM_SLOT_NAMES, UNITS, GENERALS, RELATIONS, RELATION_STAGES, TERRAIN,
    clamp, clone, uid, itemInstance, unitInstance, relationState, createNewState, migrateSave, itemDef, itemBonuses, heroStats, unitStats, armyPower, relationStage, relationScene,
    createBattle, battleUnitAt, battleDistance, battleStatus, battleAttack, battleMove, battleDefend, battleAbility, runEnemyTurn,
    createDuel, resolveDuelRound
  };
});
