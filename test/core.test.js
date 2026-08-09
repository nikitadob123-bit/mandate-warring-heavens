const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../public/core.js");

test("контент сохраняет заявленный масштаб", () => {
  assert.equal(Core.CHAPTERS.length, 42);
  assert.equal(Core.OPERATIONS.length, 420);
  assert.equal(Core.EDICTS.length, 60);
  assert.equal(Core.RANKS.length, 12);
  assert.equal(Core.KINGDOMS.length, 7);
});

test("старое сохранение v1 мигрирует без потери прогресса", () => {
  const legacy = {
    name: "Арата Люцифуг",
    home: "Цзинь",
    origin: "Наёмник",
    chapter: 17,
    level: 22,
    gold: 777,
    energy: 54,
    army: 200,
    stats: { "Сила": 19, "Стойкость": 16, "Тактика": 14, "Харизма": 9, "Разведка": 12 },
    inventory: ["Старый цзянь", "Походный паёк ×3", "Талисман Белого Тигра"],
    units: [["Копейщики", 100, 2], ["Лучники", 60, 1], ["Конница", 40, 3]],
    relations: { "Го Чжэнь": 35, "Линь Жаоюэ": 60 },
    completedOps: [1, 2, 160],
    edicts: [1, 4],
    annals: ["Старая запись"],
    flags: { importantChoice: true }
  };

  const migrated = Core.migrateSave(legacy);
  assert.equal(migrated.schemaVersion, Core.SAVE_VERSION);
  assert.equal(migrated.name, legacy.name);
  assert.equal(migrated.chapter, 17);
  assert.equal(migrated.level, 22);
  assert.equal(migrated.gold, 777);
  assert.equal(migrated.army, 200);
  assert.equal(migrated.inventory.find(item => item.id === "ration").quantity, 3);
  assert.equal(migrated.units[0].type, "spearmen");
  assert.equal(migrated.units[0].tier, 2);
  assert.equal(migrated.relations["Линь Жаоюэ"].affection, 60);
  assert.equal(migrated.flags.importantChoice, true);
  assert.deepEqual(migrated.completedOps, [1, 2, 160]);
});

test("экипировка действительно меняет итоговые характеристики", () => {
  const state = Core.createNewState({ name: "Тест" });
  const before = Core.heroStats(state);
  const spear = Core.itemInstance("polar_spear");
  state.inventory.push(spear);
  state.equipment.weapon = spear.uid;
  const after = Core.heroStats(state);
  assert.ok(after.attack > before.attack + 10);
  assert.ok(after.precision > before.precision);
});

test("ступени и ветеранство повышают реальную мощь войск", () => {
  const state = Core.createNewState({ name: "Тест" });
  const recruit = Core.unitInstance("spearmen", 100, 1, { veterancy: 0 });
  const elite = Core.unitInstance("spearmen", 100, 4, { veterancy: 4 });
  assert.ok(Core.unitStats(elite, state).attack > Core.unitStats(recruit, state).attack);
  assert.ok(Core.unitStats(elite, state).defense > Core.unitStats(recruit, state).defense);
  assert.ok(Core.unitStats(elite, state).power > Core.unitStats(recruit, state).power * 1.5);
});

test("тактическая атака наносит потери и влияет на мораль", () => {
  const state = Core.createNewState({ name: "Тест" });
  const battle = Core.createBattle(state, { chapter: 1, kind: "training" });
  const attacker = battle.units.find(unit => unit.side === "player");
  const target = battle.units.find(unit => unit.side === "enemy");
  target.x = attacker.x + 1;
  target.y = attacker.y;
  const countBefore = target.count;
  const moraleBefore = target.morale;
  const result = Core.battleAttack(battle, attacker.id, target.id, { rng: () => 0.5 });
  assert.equal(result.ok, true);
  assert.ok(target.count < countBefore);
  assert.ok(target.morale < moraleBefore);
});

test("кавалерийский натиск работает на дистанции трёх клеток", () => {
  const state = Core.createNewState({ name: "Тест" });
  state.units = [Core.unitInstance("cavalry", 50)];
  const battle = Core.createBattle(state, { chapter: 1, kind: "training" });
  const attacker = battle.units.find(unit => unit.side === "player");
  const target = battle.units.find(unit => unit.side === "enemy");
  attacker.x = 1; attacker.y = 2; target.x = 4; target.y = 2;
  const result = Core.battleAbility(battle, attacker.id, target.id, { rng: () => 0.5 });
  assert.equal(result.ok, true);
  assert.equal(attacker.abilityUsed, true);
  assert.ok(target.count < target.maxCount);
});

test("стена копий усиливает отряд без выбора вражеской цели", () => {
  const state = Core.createNewState({ name: "Тест" });
  const battle = Core.createBattle(state, { chapter: 1, kind: "training" });
  const spearmen = battle.units.find(unit => unit.side === "player" && unit.type === "spearmen");
  const defenseBefore = spearmen.defense;
  const result = Core.battleAbility(battle, spearmen.id, null);
  assert.equal(result.ok, true);
  assert.ok(spearmen.defense > defenseBefore);
  assert.equal(spearmen.defending, true);
});

test("дуэль завершается победой при смертельном особом приёме", () => {
  const state = Core.createNewState({ name: "Тест" });
  const duel = Core.createDuel(state, "gao_zhen");
  duel.hero.attack = 500;
  duel.hero.focus = 100;
  Core.resolveDuelRound(duel, "technique", () => 0);
  assert.equal(duel.status, "victory");
  assert.equal(duel.enemy.hp, 0);
});
